package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// TelegramBot Telegram 机器人客户端
type TelegramBot struct {
	token   string
	chatID  string
	baseURL string
}

// TelegramMessage Telegram 消息
type TelegramMessage struct {
	ChatID    string `json:"chat_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode,omitempty"`
}

// NewTelegramBot 创建 Telegram 机器人
func NewTelegramBot(token, chatID string) *TelegramBot {
	return &TelegramBot{
		token:   token,
		chatID:  chatID,
		baseURL: "https://api.telegram.org/bot" + token,
	}
}

// SendMessage 发送消息
func (tb *TelegramBot) SendMessage(text string) error {
	if tb.chatID == "" {
		logger.Printf("[Telegram] ⚠️ 未配置 CHAT_ID，跳过通知")
		return nil
	}

	msg := TelegramMessage{
		ChatID:    tb.chatID,
		Text:      text,
		ParseMode: "HTML",
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("序列化消息失败：%v", err)
	}

	resp, err := http.Post(tb.baseURL+"/sendMessage", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("发送请求失败：%v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var result struct {
			OK          bool   `json:"ok"`
			Description string `json:"description"`
		}
		json.NewDecoder(resp.Body).Decode(&result)
		return fmt.Errorf("Telegram API 错误：%s", result.Description)
	}

	logger.Printf("[Telegram] ✅ 消息已发送")
	return nil
}

// SendPMAnalysis 发送 PM Agent 分析通知
func (tb *TelegramBot) SendPMAnalysis(eventID, eventType, location string, analysis *PMAnalyzeResponse) error {
	if tb.chatID == "" {
		logger.Printf("[Telegram] ⚠️ 未配置 CHAT_ID，跳过 PM 分析通知")
		return nil
	}

	// 构建通知消息
	var sb strings.Builder
	sb.WriteString("📊 <b>PM Agent 经济影响分析</b>\n\n")
	sb.WriteString(fmt.Sprintf("🆔 事件：<code>%s</code>\n", eventID))
	sb.WriteString(fmt.Sprintf("📍 地点：<b>%s</b>\n", location))
	sb.WriteString(fmt.Sprintf("📰 类型：<b>%s</b>\n\n", eventType))

	// 大宗商品
	if analysis.Oil != nil {
		icon := "📈"
		if analysis.Oil.Direction == "down" {
			icon = "📉"
		}
		sb.WriteString(fmt.Sprintf("%s <b>原油 (Oil)</b>: %s %.2f%%\n", icon, analysis.Oil.Direction, analysis.Oil.Value*100))
		sb.WriteString(fmt.Sprintf("   └─ %s\n", analysis.Oil.Reason))
	}

	if analysis.Gold != nil {
		icon := "📈"
		if analysis.Gold.Direction == "down" {
			icon = "📉"
		}
		sb.WriteString(fmt.Sprintf("%s <b>黄金 (Gold)</b>: %s %.2f%%\n", icon, analysis.Gold.Direction, analysis.Gold.Value*100))
		sb.WriteString(fmt.Sprintf("   └─ %s\n", analysis.Gold.Reason))
	}

	// 加密货币
	if analysis.BTC != nil {
		icon := "📈"
		if analysis.BTC.Direction == "down" {
			icon = "📉"
		}
		sb.WriteString(fmt.Sprintf("₿ %s <b>比特币 (BTC)</b>: %s %.2f%%\n", icon, analysis.BTC.Direction, analysis.BTC.Value*100))
		sb.WriteString(fmt.Sprintf("   └─ %s\n", analysis.BTC.Reason))
	}

	// 总结
	if analysis.Summary != "" {
		sb.WriteString(fmt.Sprintf("\n💡 <b>总结</b>: %s\n", analysis.Summary))
	}

	// 时间戳
	sb.WriteString(fmt.Sprintf("\n⏰ %s", time.Now().Format("2006-01-02 15:04:05")))

	return tb.SendMessage(sb.String())
}

// SendWarNotification 发送战争通知
func (tb *TelegramBot) SendWarNotification(attacker, defender, reason string) error {
	if tb.chatID == "" {
		return nil
	}

	text := fmt.Sprintf(
		"⚔️ <b>战争爆发!</b>\n\n"+
			"🔴 <b>进攻方</b>: %s\n"+
			"🔵 <b>防守方</b>: %s\n\n"+
			"📝 <b>原因</b>: %s\n\n"+
			"⏰ %s",
		attacker, defender, reason, time.Now().Format("2006-01-02 15:04:05"),
	)

	return tb.SendMessage(text)
}

// GetBotInfo 获取机器人信息
func (tb *TelegramBot) GetBotInfo() (string, error) {
	resp, err := http.Get(tb.baseURL + "/getMe")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		OK     bool `json:"ok"`
		Result struct {
			ID        int    `json:"id"`
			IsBot     bool   `json:"is_bot"`
			FirstName string `json:"first_name"`
			Username  string `json:"username"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if !result.OK {
		return "", fmt.Errorf("获取机器人信息失败")
	}

	return fmt.Sprintf("@%s (ID: %d)", result.Result.Username, result.Result.ID), nil
}

// 全局 Telegram Bot 实例
var telegramBot *TelegramBot

// initTelegram 初始化 Telegram Bot
func initTelegram() {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	chatID := os.Getenv("TELEGRAM_CHAT_ID")

	if token == "" {
		logger.Printf("[Telegram] ⚠️ 未配置 TELEGRAM_BOT_TOKEN，通知功能禁用")
		return
	}

	telegramBot = NewTelegramBot(token, chatID)

	if info, err := telegramBot.GetBotInfo(); err != nil {
		logger.Printf("[Telegram] ❌ 初始化失败：%v", err)
	} else {
		logger.Printf("[Telegram] ✅ 机器人已初始化：%s", info)
		if chatID == "" {
			logger.Printf("[Telegram] ⚠️ 未配置 TELEGRAM_CHAT_ID，请先与机器人对话获取 Chat ID")
		} else {
			logger.Printf("[Telegram] ✅ Chat ID 已配置：%s", chatID)
		}
	}
}

// sendPMAnalysis 发送 PM 分析通知（全局函数）
func sendPMAnalysis(eventID, eventType, location string, analysis *PMAnalyzeResponse) {
	if telegramBot == nil {
		return
	}

	go func() {
		if err := telegramBot.SendPMAnalysis(eventID, eventType, location, analysis); err != nil {
			logger.Printf("[Telegram] ❌ 发送 PM 分析通知失败：%v", err)
		}
	}()
}

// sendWarNotification 发送战争通知（全局函数）
func sendWarNotification(attacker, defender, reason string) {
	if telegramBot == nil {
		return
	}

	go func() {
		if err := telegramBot.SendWarNotification(attacker, defender, reason); err != nil {
			logger.Printf("[Telegram] ❌ 发送战争通知失败：%v", err)
		}
	}()
}

// TelegramWebhookRequest Telegram Webhook 请求
type TelegramWebhookRequest struct {
	UpdateID int `json:"update_id"`
	Message  struct {
		MessageID int `json:"message_id"`
		From      struct {
			ID        int    `json:"id"`
			IsBot     bool   `json:"is_bot"`
			FirstName string `json:"first_name"`
			Username  string `json:"username"`
		} `json:"from"`
		Chat struct {
			ID   int    `json:"id"`
			Type string `json:"type"`
		} `json:"chat"`
		Text string `json:"text"`
	} `json:"message"`
}

// handleTelegramWebhook 处理 Telegram Webhook 消息
func handleTelegramWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TelegramWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[Telegram Webhook] 解析失败：%v", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 记录 Chat ID
	chatID := fmt.Sprintf("%d", req.Message.Chat.ID)
	userName := req.Message.From.FirstName
	if req.Message.From.Username != "" {
		userName = "@" + req.Message.From.Username
	}

	logger.Printf("[Telegram Webhook] 📩 收到消息：用户=%s, ChatID=%s, 内容=%s", userName, chatID, req.Message.Text)

	// 自动回复 Chat ID 给用户
	if telegramBot != nil && telegramBot.token != "" {
		replyMsg := fmt.Sprintf("✅ 你的 Chat ID 是：<code>%s</code>\n\n请将此 ID 添加到 <code>TELEGRAM_CHAT_ID</code> 配置中。", chatID)
		
		body, _ := json.Marshal(TelegramMessage{
			ChatID:    chatID,
			Text:      replyMsg,
			ParseMode: "HTML",
		})
		
		resp, err := http.Post(telegramBot.baseURL+"/sendMessage", "application/json", bytes.NewReader(body))
		if err != nil {
			logger.Printf("[Telegram] 回复失败：%v", err)
		} else {
			defer resp.Body.Close()
			logger.Printf("[Telegram] ✅ 已回复 Chat ID 给用户")
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// setTelegramWebhook 设置 Telegram Webhook
func setTelegramWebhook(webhookURL string) error {
	if telegramBot == nil || telegramBot.token == "" {
		return fmt.Errorf("Telegram Bot 未初始化")
	}

	body := fmt.Sprintf(`{"url": "%s"}`, webhookURL)
	resp, err := http.Post(telegramBot.baseURL+"/setWebhook", "application/json", strings.NewReader(body))
	if err != nil {
		return fmt.Errorf("设置 Webhook 失败：%v", err)
	}
	defer resp.Body.Close()

	var result struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	if !result.OK {
		return fmt.Errorf("Telegram API 错误：%s", result.Description)
	}

	logger.Printf("[Telegram] ✅ Webhook 已设置：%s", webhookURL)
	return nil
}

// getUpdates 获取最新更新（用于测试）
func getUpdates() error {
	if telegramBot == nil || telegramBot.token == "" {
		return fmt.Errorf("Telegram Bot 未初始化")
	}

	resp, err := http.Get(telegramBot.baseURL + "/getUpdates")
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var result struct {
		OK     bool `json:"ok"`
		Result []TelegramWebhookRequest `json:"result"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	if result.OK && len(result.Result) > 0 {
		for _, update := range result.Result {
			chatID := fmt.Sprintf("%d", update.Message.Chat.ID)
			userName := update.Message.From.FirstName
			logger.Printf("[Telegram] 📩 历史消息：用户=%s, ChatID=%s, 内容=%s", userName, chatID, update.Message.Text)
		}
	}

	return nil
}

// handleTelegramGetUpdates HTTP 处理函数 - 手动获取更新
func handleTelegramGetUpdates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := getUpdates(); err != nil {
		logger.Printf("[Telegram] 获取更新失败：%v", err)
		http.Error(w, fmt.Sprintf("Failed to get updates: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "检查日志获取 Chat ID"})
}
