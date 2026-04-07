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

// recentResponses records recent responses to prevent loops and duplicates
// key: "from:type:target", value: timestamp
var recentResponses = make(map[string]int64)
var recentResponsesMutex sync.RWMutex

// ResponseRecord represents a response record
type ResponseRecord struct {
	Timestamp int64 `json:"timestamp"`
	Count     int   `json:"count"`
}

// shouldForward checks if a message should be forwarded to the target Agent
// Prevents infinite loops caused by Agents responding to their own messages
func shouldForward(msgFrom, msgType, targetAgent string) bool {
	// Rule 1: Don't forward an Agent's own message back to itself
	if msgFrom == targetAgent {
		logger.Printf("⚠️ [Forward] Skipping: message comes from the Agent itself (%s)", targetAgent)
		return false
	}

	// Rule 2: Check response frequency (max 1 forward per hour for the same event)
	key := fmt.Sprintf("%s:%s:%s", msgFrom, msgType, targetAgent)
	now := time.Now().Unix()

	recentResponsesMutex.RLock()
	lastForward, exists := recentResponses[key]
	recentResponsesMutex.RUnlock()

	if exists && (now-lastForward) < 3600 {
		logger.Printf("⚠️ [Forward] Skipping: within cooldown period (%ds < 1h)", now-lastForward)
		return false
	}

	// Record the forward
	recentResponsesMutex.Lock()
	recentResponses[key] = now
	// Clean up records older than 24 hours
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

// AgentSessionConfig represents Agent session configuration
type AgentSessionConfig struct {
	SessionKey string `json:"sessionKey"`
	Label      string `json:"label"`
	Status     string `json:"status"`
}

// AgentSessions holds all Agent session configurations
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

// agentSessions is the global session configuration (loaded on startup)
var agentSessions *AgentSessions

// loadAgentSessions loads Agent session configuration
func loadAgentSessions() error {
	configPath := "./agent_sessions.json"
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		logger.Printf("⚠️ [Agent] Session configuration file does not exist: %s, using default format", configPath)
		return nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		logger.Printf("⚠️ [Agent] Failed to read session configuration: %v", err)
		return err
	}

	var sessions AgentSessions
	if err := json.Unmarshal(data, &sessions); err != nil {
		logger.Printf("⚠️ [Agent] Failed to parse session configuration: %v", err)
		return err
	}

	agentSessions = &sessions
	logger.Printf("✅ [Agent] Session configuration loaded successfully")
	return nil
}

// getSessionKey gets the session key for an Agent
func getSessionKey(agentID string) string {
	if agentSessions == nil {
		// Fallback: use default format
		return fmt.Sprintf("agent:%s:main", agentID)
	}

	// Map to configuration based on agentID
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

	// Fallback: use default format
	return fmt.Sprintf("agent:%s:main", agentID)
}

// sendToAgentAndWait sends a message to OpenClaw Agent session and waits for reply
func sendToAgentAndWait(agentID, message string, timeout time.Duration) (string, error) {
	// Use OpenClaw Gateway HTTP API
	gatewayURL := "http://127.0.0.1:18789/v1/responses"
	authToken := "57d61723513764e2fd1cd21495de1ab8a1caf2ffb4b85150"
	sessionKey := getSessionKey(agentID)

	requestBody := map[string]interface{}{
		"model": fmt.Sprintf("openclaw:%s", agentID),
		"input": message,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		logger.Printf("❌ [OpenClaw] Serialization failed for %s: %v", agentID, err)
		return "", err
	}

	req, err := http.NewRequest("POST", gatewayURL, bytes.NewBuffer(jsonData))
	if err != nil {
		logger.Printf("❌ [OpenClaw] Failed to create request for %s: %v", agentID, err)
		return "", err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", authToken))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-openclaw-session-key", sessionKey)

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		logger.Printf("❌ [OpenClaw] Send failed for %s: %v", agentID, err)
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Printf("❌ [OpenClaw] Failed to read response: %v", err)
		return "", err
	}

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		logger.Printf("✅ [OpenClaw] Send succeeded to %s (status: %d)", agentID, resp.StatusCode)

		// Parse response, extract reply content
		var response map[string]interface{}
		if err := json.Unmarshal(body, &response); err != nil {
			logger.Printf("❌ [OpenClaw] Failed to parse response: %v", err)
			return string(body), nil
		}

		// Try to extract reply content from response
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

	logger.Printf("❌ [OpenClaw] Send failed to %s: status %d, response: %s", agentID, resp.StatusCode, string(body))
	return "", fmt.Errorf("HTTP %d", resp.StatusCode)
}

// sendToAgent sends a message to OpenClaw Agent session (doesn't wait for reply)
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
	logger.Printf("[Forward] Message forwarding: from=%s, type=%s, content=%s", msg.From, msg.Type, msg.Content)

	// Agent list (includes PM analyst)
	// 2026-03-23: Complete 14 countries - created in 3 batches
	agentList := []string{"trump", "mujtaba", "netanyahu", "syria", "saudi_arabia", "russia", "iraq", "turkey", "egypt", "uae", "qatar", "lebanon", "kuwait", "bahrain"}

	// PM Agent special handling - needs to receive all major events for analysis
	pmAgent := "pm"

	if msg.Type == "public" || msg.Type == "world_message" || msg.Type == "public_statement" {
		// 1. First send to PM Agent for economic impact analysis (if message not from PM itself)
		if msg.From != pmAgent {
			if shouldForward(msg.From, msg.Type, pmAgent) {
				// PM needs complete event information for analysis
				pmMessage := fmt.Sprintf("【World Event - Please analyze economic impact】\nEvent type: %s\nSpeaker: %s\nContent: %s\n\nPlease analyze the impact of this event on oil price, gold, BTC, and stock markets according to the financial knowledge in KNOWLEDGE.md, output a JSON format report.", msg.Type, msg.From, msg.Content)
				logger.Printf("📤 [Forward] Sending to PM analyst: %s", pmMessage)
				if err := sendToAgent(pmAgent, pmMessage); err != nil {
					logger.Printf("⚠️ [Forward] PM analysis failed: %v", err)
				}
			}
		}

		// 2. Send to country Agents (concurrent processing + broadcast replies)
		var wg sync.WaitGroup
		for _, agent := range agentList {
			// Use shouldForward to check if forwarding is needed
			if !shouldForward(msg.From, msg.Type, agent) {
				logger.Printf("⚠️ [Forward] Skipping forwarding to %s (deduplication rule)", agent)
				continue
			}

			wg.Add(1)
			go func(agentID string) {
				defer wg.Done()

				messageText := fmt.Sprintf("【Public statement from %s】 %s", msg.From, msg.Content)
				logger.Printf("📤 [Forward] Forwarding to %s: %s", agentID, messageText)

				// Actually call OpenClaw sessions send and wait for response
				response, err := sendToAgentAndWait(agentID, messageText, 30*time.Second)
				if err != nil {
					logger.Printf("⚠️ [Forward] %s response failed: %v", agentID, err)
					return
				}

				// Broadcast Agent reply to world channel
				if response != "" {
					broadcastAgentResponse(agentID, response, msg.From)
				}
			}(agent)
		}
		wg.Wait() // Wait for all Agent responses
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
			// Use shouldForward to check if forwarding is needed
			if !shouldForward(msg.From, msg.Type, targetAgent) {
				logger.Printf("⚠️ [Forward] Skipping forwarding to %s (deduplication rule)", targetAgent)
				return
			}
			messageText := fmt.Sprintf("【Private message from %s】 %s", msg.From, msg.Content)
			logger.Printf("📤 [Forward] Forwarding private message to %s: %s", targetAgent, messageText)

			// Actually call OpenClaw sessions send
			if err := sendToAgent(targetAgent, messageText); err != nil {
				logger.Printf("⚠️ [Forward] Send failed to %s: %v", targetAgent, err)
			}
		} else {
			logger.Printf("⚠️ No valid target agent found for private message channel: %s", msg.Channel)
		}
	}
}

// broadcastAgentResponse broadcasts an Agent reply to the world channel
func broadcastAgentResponse(agentID, content, originalFrom string) {
	wsMsg := WebSocketMessage{
		Type:      "agent_response",
		From:      agentID,
		Channel:   "world",
		Content:   content,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data: map[string]interface{}{
			"original_from": originalFrom,
			"response_type": "agent_reply",
		},
	}

	if msgBytes, err := json.Marshal(wsMsg); err == nil {
		hub.broadcast <- msgBytes
		logger.Printf("📢 [Agent Reply] %s: %.50s...", agentID, content)
	}
}
