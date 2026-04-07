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

// TelegramBot is a Telegram bot client
type TelegramBot struct {
	token   string
	chatID  string
	baseURL string
}

// TelegramMessage represents a Telegram message
type TelegramMessage struct {
	ChatID    string `json:"chat_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode,omitempty"`
}

// NewTelegramBot creates a new Telegram bot
func NewTelegramBot(token, chatID string) *TelegramBot {
	return &TelegramBot{
		token:   token,
		chatID:  chatID,
		baseURL: "https://api.telegram.org/bot" + token,
	}
}

// SendMessage sends a message
func (tb *TelegramBot) SendMessage(text string) error {
	if tb.chatID == "" {
		logger.Printf("[Telegram] ⚠️ CHAT_ID not configured, skipping notification")
		return nil
	}

	msg := TelegramMessage{
		ChatID:    tb.chatID,
		Text:      text,
		ParseMode: "HTML",
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to serialize message: %v", err)
	}

	resp, err := http.Post(tb.baseURL+"/sendMessage", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var result struct {
			OK          bool   `json:"ok"`
			Description string `json:"description"`
		}
		json.NewDecoder(resp.Body).Decode(&result)
		return fmt.Errorf("Telegram API error: %s", result.Description)
	}

	logger.Printf("[Telegram] ✅ Message sent")
	return nil
}

// SendPMAnalysis sends PM Agent analysis notification
func (tb *TelegramBot) SendPMAnalysis(eventID, eventType, location string, analysis *PMAnalyzeResponse) error {
	if tb.chatID == "" {
		logger.Printf("[Telegram] ⚠️ CHAT_ID not configured, skipping PM analysis notification")
		return nil
	}

	// Build notification message
	var sb strings.Builder
	sb.WriteString("📊 <b>PM Agent Economic Impact Analysis</b>\n\n")
	sb.WriteString(fmt.Sprintf("🆔 Event: <code>%s</code>\n", eventID))
	sb.WriteString(fmt.Sprintf("📍 Location: <b>%s</b>\n", location))
	sb.WriteString(fmt.Sprintf("📰 Type: <b>%s</b>\n\n", eventType))

	// Commodities
	if analysis.Oil != nil {
		icon := "📈"
		if analysis.Oil.Direction == "down" {
			icon = "📉"
		}
		sb.WriteString(fmt.Sprintf("%s <b>Crude Oil</b>: %s %.2f%%\n", icon, analysis.Oil.Direction, analysis.Oil.Value*100))
		sb.WriteString(fmt.Sprintf("   └─ %s\n", analysis.Oil.Reason))
	}

	if analysis.Gold != nil {
		icon := "📈"
		if analysis.Gold.Direction == "down" {
			icon = "📉"
		}
		sb.WriteString(fmt.Sprintf("%s <b>Gold</b>: %s %.2f%%\n", icon, analysis.Gold.Direction, analysis.Gold.Value*100))
		sb.WriteString(fmt.Sprintf("   └─ %s\n", analysis.Gold.Reason))
	}

	// Cryptocurrencies
	if analysis.BTC != nil {
		icon := "📈"
		if analysis.BTC.Direction == "down" {
			icon = "📉"
		}
		sb.WriteString(fmt.Sprintf("₿ %s <b>Bitcoin (BTC)</b>: %s %.2f%%\n", icon, analysis.BTC.Direction, analysis.BTC.Value*100))
		sb.WriteString(fmt.Sprintf("   └─ %s\n", analysis.BTC.Reason))
	}

	// Summary
	if analysis.Summary != "" {
		sb.WriteString(fmt.Sprintf("\n💡 <b>Summary</b>: %s\n", analysis.Summary))
	}

	// Timestamp
	sb.WriteString(fmt.Sprintf("\n⏰ %s", time.Now().Format("2006-01-02 15:04:05")))

	return tb.SendMessage(sb.String())
}

// SendWarNotification sends war notification
func (tb *TelegramBot) SendWarNotification(attacker, defender, reason string) error {
	if tb.chatID == "" {
		return nil
	}

	text := fmt.Sprintf(
		"⚔️ <b>War Broke Out!</b>\n\n"+
			"🔴 <b>Attacker</b>: %s\n"+
			"🔵 <b>Defender</b>: %s\n\n"+
			"📝 <b>Reason</b>: %s\n\n"+
			"⏰ %s",
		attacker, defender, reason, time.Now().Format("2006-01-02 15:04:05"),
	)

	return tb.SendMessage(text)
}

// GetBotInfo gets bot information
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
		return "", fmt.Errorf("failed to get bot information")
	}

	return fmt.Sprintf("@%s (ID: %d)", result.Result.Username, result.Result.ID), nil
}

// Global Telegram Bot instance
var telegramBot *TelegramBot

// initTelegram initializes Telegram Bot
func initTelegram() {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	chatID := os.Getenv("TELEGRAM_CHAT_ID")

	if token == "" {
		logger.Printf("[Telegram] ⚠️ TELEGRAM_BOT_TOKEN not configured, notification disabled")
		return
	}

	telegramBot = NewTelegramBot(token, chatID)

	if info, err := telegramBot.GetBotInfo(); err != nil {
		logger.Printf("[Telegram] ❌ Initialization failed: %v", err)
	} else {
		logger.Printf("[Telegram] ✅ Bot initialized: %s", info)
		if chatID == "" {
			logger.Printf("[Telegram] ⚠️ TELEGRAM_CHAT_ID not configured, please chat with bot first to get Chat ID")
		} else {
			logger.Printf("[Telegram] ✅ Chat ID configured: %s", chatID)
		}
	}
}

// sendPMAnalysis sends PM analysis notification (global function)
func sendPMAnalysis(eventID, eventType, location string, analysis *PMAnalyzeResponse) {
	if telegramBot == nil {
		return
	}

	go func() {
		if err := telegramBot.SendPMAnalysis(eventID, eventType, location, analysis); err != nil {
			logger.Printf("[Telegram] ❌ Failed to send PM analysis notification: %v", err)
		}
	}()
}

// sendWarNotification sends war notification (global function)
func sendWarNotification(attacker, defender, reason string) {
	if telegramBot == nil {
		return
	}

	go func() {
		if err := telegramBot.SendWarNotification(attacker, defender, reason); err != nil {
			logger.Printf("[Telegram] ❌ Failed to send war notification: %v", err)
		}
	}()
}

// TelegramWebhookRequest represents Telegram Webhook request
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

// handleTelegramWebhook handles Telegram Webhook messages
func handleTelegramWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TelegramWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[Telegram Webhook] Parse failed: %v", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Log Chat ID
	chatID := fmt.Sprintf("%d", req.Message.Chat.ID)
	userName := req.Message.From.FirstName
	if req.Message.From.Username != "" {
		userName = "@" + req.Message.From.Username
	}

	logger.Printf("[Telegram Webhook] 📩 Received message: user=%s, ChatID=%s, content=%s", userName, chatID, req.Message.Text)

	// Auto reply Chat ID to user
	if telegramBot != nil && telegramBot.token != "" {
		replyMsg := fmt.Sprintf("✅ Your Chat ID is: <code>%s</code>\n\nPlease add this ID to your <code>TELEGRAM_CHAT_ID</code> configuration.", chatID)

		body, _ := json.Marshal(TelegramMessage{
			ChatID:    chatID,
			Text:      replyMsg,
			ParseMode: "HTML",
		})

		resp, err := http.Post(telegramBot.baseURL+"/sendMessage", "application/json", bytes.NewReader(body))
		if err != nil {
			logger.Printf("[Telegram] Reply failed: %v", err)
		} else {
			defer resp.Body.Close()
			logger.Printf("[Telegram] ✅ Replied Chat ID to user")
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// setTelegramWebhook sets Telegram Webhook
func setTelegramWebhook(webhookURL string) error {
	if telegramBot == nil || telegramBot.token == "" {
		return fmt.Errorf("Telegram Bot not initialized")
	}

	body := fmt.Sprintf(`{"url": "%s"}`, webhookURL)
	resp, err := http.Post(telegramBot.baseURL+"/setWebhook", "application/json", strings.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to set Webhook: %v", err)
	}
	defer resp.Body.Close()

	var result struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	if !result.OK {
		return fmt.Errorf("Telegram API error: %s", result.Description)
	}

	logger.Printf("[Telegram] ✅ Webhook set: %s", webhookURL)
	return nil
}

// getUpdates gets latest updates (for testing)
func getUpdates() error {
	if telegramBot == nil || telegramBot.token == "" {
		return fmt.Errorf("Telegram Bot not initialized")
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
			logger.Printf("[Telegram] 📩 Historical message: user=%s, ChatID=%s, content=%s", userName, chatID, update.Message.Text)
		}
	}

	return nil
}

// handleTelegramGetUpdates is HTTP handler - manually get updates
func handleTelegramGetUpdates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := getUpdates(); err != nil {
		logger.Printf("[Telegram] Failed to get updates: %v", err)
		http.Error(w, fmt.Sprintf("Failed to get updates: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "Check logs for Chat ID"})
}
