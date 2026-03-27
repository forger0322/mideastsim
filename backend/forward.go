package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
)

// recentResponses 记录最近的响应，防止循环和重复
// key: "from:type:target", value: timestamp
var recentResponses = make(map[string]int64)
var recentResponsesMutex sync.RWMutex

// ResponseRecord 响应记录
type ResponseRecord struct {
	Timestamp int64 `json:"timestamp"`
	Count     int   `json:"count"`
}

// shouldForward 检查是否应该转发消息给目标 Agent
// 防止 Agent 响应自己的消息造成无限循环
func shouldForward(msgFrom, msgType, targetAgent string) bool {
	// 规则 1: 不转发 Agent 自己的消息给自己
	if msgFrom == targetAgent {
		logger.Printf("⚠️ [Forward] 跳过：消息来自 Agent 自己 (%s)", targetAgent)
		return false
	}
	
	// 规则 2: 检查响应频率（1 小时内同一事件最多转发 1 次）
	key := fmt.Sprintf("%s:%s:%s", msgFrom, msgType, targetAgent)
	now := time.Now().Unix()
	
	recentResponsesMutex.RLock()
	lastForward, exists := recentResponses[key]
	recentResponsesMutex.RUnlock()
	
	if exists && (now-lastForward) < 3600 {
		logger.Printf("⚠️ [Forward] 跳过：冷却期内 (%ds < 1h)", now-lastForward)
		return false
	}
	
	// 记录转发
	recentResponsesMutex.Lock()
	recentResponses[key] = now
	// 清理超过 24 小时的记录
	for k, ts := range recentResponses {
		if now-ts > 86400 {
			delete(recentResponses, k)
		}
	}
	recentResponsesMutex.Unlock()
	
	return true
}

// OpenClawAPIConfig holds the configuration for OpenClaw API
type OpenClawAPIConfig struct {
	GatewayURL string
	AuthToken  string
}

// OpenClawRequest represents the request body for OpenClaw API
type OpenClawRequest struct {
	Model string `json:"model"`
	Input string `json:"input"`
}

// OpenClawResponse represents the response from OpenClaw API
type OpenClawResponse struct {
	Output []struct {
		Type    string      `json:"type"`
		Role    string      `json:"role"`
		Content interface{} `json:"content"`
	} `json:"output"`
}

// extractAssistantContent extracts the text content from assistant message
func extractAssistantContent(content interface{}) string {
	if contentSlice, ok := content.([]interface{}); ok {
		for _, item := range contentSlice {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if itemMap["type"] == "output_text" {
					if text, ok := itemMap["text"].(string); ok {
						return text
					}
				}
			}
		}
	}
	// Fallback: try to convert to string
	if str, ok := content.(string); ok {
		return str
	}
	return fmt.Sprintf("%v", content)
}

// AgentSessionConfig Agent 会话配置
type AgentSessionConfig struct {
	SessionKey string `json:"sessionKey"`
	Label      string `json:"label"`
	Status     string `json:"status"`
}

// AgentSessions 所有 Agent 会话配置
type AgentSessions struct {
	PM              AgentSessionConfig `json:"pm"`
	Trump           AgentSessionConfig `json:"trump"`
	Mujtaba         AgentSessionConfig `json:"mujtaba"`
	Netanyahu       AgentSessionConfig `json:"netanyahu"`
	Syria           AgentSessionConfig `json:"syria"`
	SaudiArabia     AgentSessionConfig `json:"saudi_arabia"`
	Russia          AgentSessionConfig `json:"russia"`
	Iraq            AgentSessionConfig `json:"iraq"`
	Turkey          AgentSessionConfig `json:"turkey"`
	Egypt           AgentSessionConfig `json:"egypt"`
	Uae             AgentSessionConfig `json:"uae"`
	Qatar           AgentSessionConfig `json:"qatar"`
	Lebanon         AgentSessionConfig `json:"lebanon"`
	Kuwait          AgentSessionConfig `json:"kuwait"`
	Bahrain         AgentSessionConfig `json:"bahrain"`
}

// agentSessions 全局会话配置 (启动时加载)
var agentSessions *AgentSessions

// loadAgentSessions 加载 Agent 会话配置
func loadAgentSessions() error {
	configPath := "./agent_sessions.json"
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		logger.Printf("⚠️ [Agent] 会话配置文件不存在：%s，使用默认格式", configPath)
		return nil
	}
	
	data, err := os.ReadFile(configPath)
	if err != nil {
		logger.Printf("⚠️ [Agent] 读取会话配置失败：%v", err)
		return err
	}
	
	var sessions AgentSessions
	if err := json.Unmarshal(data, &sessions); err != nil {
		logger.Printf("⚠️ [Agent] 解析会话配置失败：%v", err)
		return err
	}
	
	agentSessions = &sessions
	logger.Printf("✅ [Agent] 会话配置加载成功")
	return nil
}

// getSessionKey 获取 Agent 的 session key
func getSessionKey(agentID string) string {
	if agentSessions == nil {
		// 降级：使用默认格式
		return fmt.Sprintf("agent:%s:main", agentID)
	}
	
	// 根据 agentID 映射到配置
	sessionMap := map[string]string{
		"pm":           agentSessions.PM.SessionKey,
		"trump":        agentSessions.Trump.SessionKey,
		"mujtaba":      agentSessions.Mujtaba.SessionKey,
		"netanyahu":    agentSessions.Netanyahu.SessionKey,
		"syria":        agentSessions.Syria.SessionKey,
		"saudi_arabia": agentSessions.SaudiArabia.SessionKey,
		"russia":       agentSessions.Russia.SessionKey,
		"iraq":         agentSessions.Iraq.SessionKey,
		"turkey":       agentSessions.Turkey.SessionKey,
		"egypt":        agentSessions.Egypt.SessionKey,
		"uae":          agentSessions.Uae.SessionKey,
		"qatar":        agentSessions.Qatar.SessionKey,
		"lebanon":      agentSessions.Lebanon.SessionKey,
		"kuwait":       agentSessions.Kuwait.SessionKey,
		"bahrain":      agentSessions.Bahrain.SessionKey,
	}
	
	if key, exists := sessionMap[agentID]; exists && key != "" {
		return key
	}
	
	// 降级：使用默认格式
	return fmt.Sprintf("agent:%s:main", agentID)
}

// sendToAgentAndWait 发送消息到 OpenClaw Agent 会话并等待回复
func sendToAgentAndWait(agentID, message string, timeout time.Duration) (string, error) {
	// 使用 OpenClaw Gateway HTTP API
	gatewayURL := "http://127.0.0.1:18789/v1/responses"
	authToken := "57d61723513764e2fd1cd21495de1ab8a1caf2ffb4b85150"
	sessionKey := getSessionKey(agentID)
	
	requestBody := map[string]interface{}{
		"model": fmt.Sprintf("openclaw:%s", agentID),
		"input": message,
	}
	
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		logger.Printf("❌ [OpenClaw] 序列化失败给 %s: %v", agentID, err)
		return "", err
	}
	
	req, err := http.NewRequest("POST", gatewayURL, bytes.NewBuffer(jsonData))
	if err != nil {
		logger.Printf("❌ [OpenClaw] 创建请求失败给 %s: %v", agentID, err)
		return "", err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authToken))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-openclaw-session-key", sessionKey)
	
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		logger.Printf("❌ [OpenClaw] 发送失败给 %s: %v", agentID, err)
		return "", err
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Printf("❌ [OpenClaw] 读取响应失败：%v", err)
		return "", err
	}
	
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		logger.Printf("✅ [OpenClaw] 发送成功给 %s (状态：%d)", agentID, resp.StatusCode)
		
		// 解析响应，提取回复内容
		var response map[string]interface{}
		if err := json.Unmarshal(body, &response); err != nil {
			logger.Printf("❌ [OpenClaw] 解析响应失败：%v", err)
			return string(body), nil
		}
		
		// 尝试从响应中提取回复内容
		if output, ok := response["output"].(string); ok {
			return output, nil
		}
		if content, ok := response["content"].(string); ok {
			return content, nil
		}
		if text, ok := response["text"].(string); ok {
			return text, nil
		}
		
		return string(body), nil
	}
	
	logger.Printf("❌ [OpenClaw] 发送失败给 %s: 状态 %d, 响应：%s", agentID, resp.StatusCode, string(body))
	return "", fmt.Errorf("HTTP %d", resp.StatusCode)
}

// sendToAgent 发送消息到 OpenClaw Agent 会话（不等待回复）
func sendToAgent(agentID, message string) error {
	_, err := sendToAgentAndWait(agentID, message, 30*time.Second)
	return err
}

func loadOpenClawConfig() (*OpenClawAPIConfig, error) {
	// Load .env file if it exists
	if _, err := os.Stat(".env"); err == nil {
		err = godotenv.Load()
		if err != nil {
			return nil, fmt.Errorf("error loading .env file: %v", err)
		}
	}

	config := &OpenClawAPIConfig{
		GatewayURL: os.Getenv("OPENCLAW_GATEWAY_URL"),
		AuthToken:  os.Getenv("OPENCLAW_AUTH_TOKEN"),
	}

	if config.GatewayURL == "" {
		config.GatewayURL = "http://127.0.0.1:18789/v1/responses"
	}
	if config.AuthToken == "" {
		// Try to get from default location or use a placeholder
		config.AuthToken = "57d61723513764e2fd1cd21495de1ab8a1caf2ffb4b85150"
	}

	return config, nil
}

// sendToOpenClaw sends a message to OpenClaw Gateway API and returns the response
func sendToOpenClaw(config *OpenClawAPIConfig, sessionKey, agentID, message string) (*OpenClawResponse, error) {
	// Create request body
	requestBody := OpenClawRequest{
		Model: fmt.Sprintf("openclaw:%s", agentID),
		Input: message,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %v", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", config.GatewayURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %v", err)
	}

	// Set headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", config.AuthToken))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-openclaw-session-key", sessionKey)

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		logger.Printf("Response body: %s", string(body))
		// Parse response
		var response OpenClawResponse
		if err := json.Unmarshal(body, &response); err != nil {
			return nil, fmt.Errorf("failed to parse response JSON: %v", err)
		}
		logger.Printf("✅ Successfully sent message to OpenClaw API for session %s", sessionKey)
		return &response, nil
	} else {
		logger.Printf("❌ OpenClaw API returned status %d: %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("OpenClaw API returned status %d", resp.StatusCode)
	}
}

// ForwardMessage forwards a message to the appropriate agents via OpenClaw API
func ForwardMessage(msg WebSocketMessage) {
	logger.Printf("[Forward] 消息转发：from=%s, type=%s, content=%s", msg.From, msg.Type, msg.Content)
	
	// Agent list (包括 PM 分析师)
	// 2026-03-23: 完整 14 国 - 分 3 批次创建完成
	agentList := []string{"trump", "mujtaba", "netanyahu", "syria", "saudi_arabia", "russia", "iraq", "turkey", "egypt", "uae", "qatar", "lebanon", "kuwait", "bahrain"}
	
	// PM Agent 特殊处理 - 需要接收所有重大事件进行分析
	pmAgent := "pm"

	if msg.Type == "public" || msg.Type == "world_message" || msg.Type == "public_statement" {
		// 1. 先发送给 PM Agent 进行经济影响分析 (如果消息不是 PM 自己发的)
		if msg.From != pmAgent {
			if shouldForward(msg.From, msg.Type, pmAgent) {
				// PM 需要完整的事件信息来进行分析
				pmMessage := fmt.Sprintf("【世界事件 - 请分析经济影响】\n事件类型：%s\n声明者：%s\n内容：%s\n\n请根据 KNOWLEDGE.md 中的金融知识，分析此事件对油价、黄金、BTC、股市的影响，输出 JSON 格式报告。", msg.Type, msg.From, msg.Content)
				logger.Printf("📤 [Forward] 发送给 PM 分析师：%s", pmMessage)
				if err := sendToAgent(pmAgent, pmMessage); err != nil {
					logger.Printf("⚠️ [Forward] PM 分析失败：%v", err)
				}
			}
		}
		
		// 2. 发送给国家 Agent (他们可能根据 PM 报告做决策)
		for _, agent := range agentList {
			// 使用 shouldForward 检查是否应该转发
			if !shouldForward(msg.From, msg.Type, agent) {
				logger.Printf("⚠️ [Forward] 跳过转发给 %s (去重规则)", agent)
				continue
			}
			messageText := fmt.Sprintf("【%s 的公开声明】 %s", msg.From, msg.Content)
			logger.Printf("📤 [Forward] 转发给 %s: %s", agent, messageText)
			
			// 实际调用 OpenClaw sessions send
			if err := sendToAgent(agent, messageText); err != nil {
				logger.Printf("⚠️ [Forward] 发送失败给 %s: %v", agent, err)
			}
		}
	} else if msg.Type == "private" {
		// Private message: determine target agent from channel
		var targetAgent string

		// Check if channel contains any known agent ID
		for _, agent := range agentList {
			if agent == msg.From {
				continue
			}
			if strings.Contains(msg.Channel, agent) {
				targetAgent = agent
				break
			}
		}

		// If no agent found in channel, try to use channel as agent ID directly
		if targetAgent == "" {
			for _, agent := range agentList {
				if agent == msg.Channel {
					targetAgent = agent
					break
				}
			}
		}

		if targetAgent != "" {
			// 使用 shouldForward 检查是否应该转发
			if !shouldForward(msg.From, msg.Type, targetAgent) {
				logger.Printf("⚠️ [Forward] 跳过转发给 %s (去重规则)", targetAgent)
				return
			}
			messageText := fmt.Sprintf("【%s 的私密消息】 %s", msg.From, msg.Content)
			logger.Printf("📤 [Forward] 转发私密消息给 %s: %s", targetAgent, messageText)
			
			// 实际调用 OpenClaw sessions send
			if err := sendToAgent(targetAgent, messageText); err != nil {
				logger.Printf("⚠️ [Forward] 发送失败给 %s: %v", targetAgent, err)
			}
		} else {
			logger.Printf("⚠️ No valid target agent found for private message channel: %s", msg.Channel)
		}
	}
}
