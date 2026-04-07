package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

// Global variables
var (
	logger     *log.Logger
	db         *Database
	hub        *WebSocketHub
	ruleEngine *RuleEngine
)

// WebSocketMessage represents a WebSocket message
type WebSocketMessage struct {
	Type      string      `json:"type"`      // "public" | "private"
	From      string      `json:"from"`      // Sender
	RoleID    string      `json:"role_id"`   // Role ID bound to sender (e.g., UAE, USA)
	Channel   string      `json:"channel"`   // Channel/target
	Content   string      `json:"content"`   // Message content
	Data      interface{} `json:"data"`      // Additional data
	Timestamp string      `json:"timestamp"` // Timestamp
}

func main() {
	// Load environment variables
	godotenv.Load()

	// Initialize logger
	logger = log.New(os.Stdout, "[MideastSim] ", log.LstdFlags|log.Lshortfile)
	logger.Println("🚀 Starting MideastSim backend...")

	// Initialize random seed
	rand.Seed(time.Now().UnixNano())

	// Initialize database
	dbPath := getEnv("DATABASE_PATH", "./mideastsim.db")
	var err error
	db, err = NewDatabase(dbPath)
	if err != nil {
		logger.Fatalf("❌ Database initialization failed: %v", err)
	}
	defer db.Close()

	// Initialize database schema
	if err := db.InitSchema(); err != nil {
		logger.Printf("⚠️ Database schema initialization warning: %v", err)
	}

	// Database migration: add Chinese fields
	if err := db.MigrateAddChineseFields(); err != nil {
		logger.Printf("⚠️ Database migration warning: %v", err)
	}

	// Initialize authentication service
	jwtSecret := []byte(getEnv("JWT_SECRET", "mideastsim-secret-key-change-in-production"))
	jwtTTL := 24 * time.Hour
	authService := NewAuthService(jwtSecret, jwtTTL)

	// Initialize session store
	sessionStore := NewSessionStore()

	// Initialize player service
	playerService := NewPlayerService(db, authService, sessionStore)

	// Initialize WebSocket Hub
	hub = NewWebSocketHub()
	go hub.run()

	// Initialize rule engine
	ruleEngine = NewRuleEngine(db)

	// Initialize Telegram Bot (for PM Agent notifications)
	initTelegram()

	// Set up Telegram Webhook (for receiving Chat ID)
	webhookURL := getEnv("TELEGRAM_WEBHOOK_URL", "")
	if webhookURL != "" && telegramBot != nil {
		if err := setTelegramWebhook(webhookURL); err != nil {
			logger.Printf("[Telegram] ⚠️ Webhook setup failed: %v", err)
			logger.Printf("[Telegram] 💡 Use /api/telegram/getUpdates to manually get Chat ID")
		}
	}

	// Initialize Agent memory system
	if err := db.CreateAgentMemoryTable(); err != nil {
		logger.Printf("⚠️ Agent memory table initialization warning: %v", err)
	}

	// Initialize offline AI manager
	offlineAI := NewOfflineAIManager(db)
	if err := offlineAI.InitializeOfflineAI(); err != nil {
		logger.Printf("⚠️ Offline AI initialization warning: %v", err)
	}

	// Load Agent session configuration
	if err := loadAgentSessions(); err != nil {
		logger.Printf("⚠️ Agent session configuration loading failed: %v", err)
		logger.Printf("⚠️ Will use default session key format: agent:{id}:main")
	}

	// Initialize leader data
	if err := db.InitDefaultLeaders(); err != nil {
		logger.Printf("⚠️ Leader data initialization warning: %v", err)
	}

	// Set up routes
	http.HandleFunc("/api/auth/register", playerService.Register)
	http.HandleFunc("/api/auth/login", playerService.Login)
	http.HandleFunc("/api/auth/me", JWTMiddleware(authService, playerService.GetPlayerInfo))

	http.HandleFunc("/api/roles/available", JWTMiddleware(authService, playerService.GetAvailableRoles))
	http.HandleFunc("/api/roles/claim", JWTMiddleware(authService, playerService.ClaimRole))
	http.HandleFunc("/api/roles/release", JWTMiddleware(authService, playerService.ReleaseRole))

	// Admin API - reset all role bindings (for development)
	http.HandleFunc("/api/admin/reset-roles", handleResetRoles)

	// Country info query
	http.HandleFunc("/api/roles/info", handleRoleInfo)
	http.HandleFunc("/api/roles", handleAllRoles)

	// Player list
	http.HandleFunc("/api/players", getPlayersHandler)

	// Leader information
	http.HandleFunc("/api/leaders", handleAllLeaders)
	http.HandleFunc("/api/leaders/info", handleLeaderInfo)

	// Action API (requires selected country)
	http.HandleFunc("/api/actions/execute", JWTMiddleware(authService, ruleEngine.HandleAction))

	// Agent command API (player sends command to Agent, Agent makes autonomous decision)
	http.HandleFunc("/api/agent/command", JWTMiddleware(authService, handleAgentCommand))

	// PM Agent economic impact analysis API
	http.HandleFunc("/api/agent/pm/analyze", JWTMiddleware(authService, handlePMAnalyze))

	// PM Agent callback API (PM Agent calls this to return results after analysis completes)
	http.HandleFunc("/api/agent/pm/callback", handlePMCallback)

	// Agent memory API
	http.HandleFunc("/api/agent/memory", JWTMiddleware(authService, handleAgentMemory))
	http.HandleFunc("/api/agent/memory/list", JWTMiddleware(authService, handleAgentMemoryList))

	// Offline AI status API
	http.HandleFunc("/api/ai/offline/status", handleAIOfflineStatus)

	// Telegram Webhook API
	http.HandleFunc("/api/telegram/webhook", handleTelegramWebhook)
	http.HandleFunc("/api/telegram/getUpdates", handleTelegramGetUpdates)

	// History playback API
	http.HandleFunc("/api/history/events", handleGetHistory)
	http.HandleFunc("/api/history/event", handleGetEventDetail)
	http.HandleFunc("/api/history/snapshot", handlePlaybackSnapshot)
	http.HandleFunc("/api/history/timeline", handleGetTimeline)

	// World channel statement API (Agent sends public statement)
	http.HandleFunc("/api/world/actions/declare", handleDeclareStatement)

	http.HandleFunc("/api/world/state", handleWorldState)
	http.HandleFunc("/api/world/events", handleEvents)
	http.HandleFunc("/api/world/relations", handleRelations)
	http.HandleFunc("/api/world/wars", handleWars)

	// Chat API
	http.HandleFunc("/api/chat/rooms", handleChatRooms)
	http.HandleFunc("/api/chat/messages", handleChatMessages)
	// Agent chat API
	http.HandleFunc("/api/chat/public", handlePublicChat)
	http.HandleFunc("/api/chat/private", handlePrivateChat)
	http.HandleFunc("/api/chat/channel", handleCreateChannel)
	http.HandleFunc("/api/chat/recent", handleRecentChats)

	// Static file serving (leader photos)
	imgPath := "/home/node/.openclaw/workspace/mideastsim/img"
	fs := http.FileServer(http.Dir(imgPath))
	http.Handle("/img/", http.StripPrefix("/img/", fs))

	http.HandleFunc("/ws", handleWebSocket)

	// Health check
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":         "ok",
			"time":           time.Now().Format(time.RFC3339),
			"online_players": sessionStore.Count(),
		})
	})

	// Add CORS middleware wrapping all routes
	corsHandler := CORSMiddleware(http.DefaultServeMux)

	// Start background tasks
	go simulationLoop(db)

	// Start offline AI scheduled task (executes AI decision every 5 minutes)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			offlineAI.ExecuteAIActions(ruleEngine)
		}
	}()

	// Start memory cleanup scheduled task (cleans expired memories hourly)
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			db.DeleteExpiredAgentMemories()
		}
	}()

	// Start server
	port := getEnv("PORT", "8080")
	host := getEnv("HOST", "0.0.0.0")
	addr := fmt.Sprintf("%s:%s", host, port)
	logger.Printf("🌐 Server listening on http://%s%s", host, addr)
	logger.Printf("📊 Online players: %d", sessionStore.Count())

	if err := http.ListenAndServe(addr, corsHandler); err != nil {
		logger.Fatalf("❌ Server startup failed: %v", err)
	}
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// simulationLoop runs the background simulation loop
func simulationLoop(db *Database) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Random event generation disabled - events are now generated by AI Agent actions
		// generateRandomEvent(db)

		// Update relations
		updateRelations(db)

		// Broadcast world state update
		broadcastWorldState()
	}
}

// generateRandomEvent generates a random event
func generateRandomEvent(db *Database) {
	// All locations (14 Middle Eastern countries/cities)
	locations := []string{
		"Tehran", "Jerusalem", "Riyadh", "Damascus", "Baghdad",
		"Abu Dhabi", "Cairo", "Ankara", "Amman", "Beirut",
		"Doha", "Kuwait City", "Muscat", "Sanaa", "Ramallah",
	}

	// Chinese/English location names
	locationNames := map[string]map[string]string{
		"Tehran":      {"zh": "德黑兰", "en": "Tehran"},
		"Jerusalem":   {"zh": "耶路撒冷", "en": "Jerusalem"},
		"Riyadh":      {"zh": "利雅得", "en": "Riyadh"},
		"Damascus":    {"zh": "大马士革", "en": "Damascus"},
		"Baghdad":     {"zh": "巴格达", "en": "Baghdad"},
		"Abu Dhabi":   {"zh": "阿布扎比", "en": "Abu Dhabi"},
		"Cairo":       {"zh": "开罗", "en": "Cairo"},
		"Ankara":      {"zh": "安卡拉", "en": "Ankara"},
		"Amman":       {"zh": "安曼", "en": "Amman"},
		"Beirut":      {"zh": "贝鲁特", "en": "Beirut"},
		"Doha":        {"zh": "多哈", "en": "Doha"},
		"Kuwait City": {"zh": "科威特城", "en": "Kuwait City"},
		"Muscat":      {"zh": "马斯喀特", "en": "Muscat"},
		"Sanaa":       {"zh": "萨那", "en": "Sanaa"},
		"Ramallah":    {"zh": "拉马拉", "en": "Ramallah"},
	}

	// Event types
	eventTypes := []string{"diplomacy", "military", "economic"}
	eventType := eventTypes[rand.Intn(len(eventTypes))]

	// Randomly select location
	location := locations[rand.Intn(len(locations))]

	// Randomly select title based on event type (multiple options per type)
	militaryTitles := []struct{ en, zh string }{
		{"Military Exercise Conducted", "举行军事演习"},
		{"Troop Movement Detected", "发现部队调动"},
		{"Border Security Enhanced", "加强边境安全"},
		{"Defense Minister Meeting", "国防部长会晤"},
		{"New Weapons System Deployed", "部署新武器系统"},
		{"Naval Patrol Increased", "增加海军巡逻"},
		{"Air Defense Drill Completed", "完成防空演习"},
	}

	diplomacyTitles := []struct{ en, zh string }{
		{"Emergency Mediation Hosted", "主持紧急斡旋"},
		{"High-Level Diplomatic Talks", "高级别外交会谈"},
		{"Peace Proposal Submitted", "提交和平方案"},
		{"Regional Summit Announced", "宣布地区峰会"},
		{"Ambassador Appointed", "任命新大使"},
		{"Trade Delegation Visit", "贸易代表团访问"},
		{"Joint Communique Issued", "发布联合公报"},
	}

	economicTitles := []struct{ en, zh string }{
		{"Economic Reform Announced", "宣布经济改革"},
		{"Oil Production Adjusted", "调整石油产量"},
		{"New Trade Agreement Signed", "签署新贸易协定"},
		{"Investment Forum Held", "举办投资论坛"},
		{"Currency Fluctuation Reported", "货币波动报告"},
		{"Infrastructure Project Launched", "启动基础设施项目"},
		{"Economic Sanctions Imposed", "实施经济制裁"},
	}

	var title, titleZh string
	switch eventType {
	case "military":
		t := militaryTitles[rand.Intn(len(militaryTitles))]
		title = t.en
		titleZh = t.zh
	case "diplomacy":
		t := diplomacyTitles[rand.Intn(len(diplomacyTitles))]
		title = t.en
		titleZh = t.zh
	case "economic":
		t := economicTitles[rand.Intn(len(economicTitles))]
		title = t.en
		titleZh = t.zh
	}

	// Chinese/English event type descriptions
	eventTypeDesc := map[string]map[string]string{
		"diplomacy": {"zh": "外交", "en": "diplomatic"},
		"military":  {"zh": "军事", "en": "military"},
		"economic":  {"zh": "经济", "en": "economic"},
	}

	// More natural event description
	description := fmt.Sprintf("A %s event has been reported in %s, reflecting ongoing regional developments.", eventTypeDesc[eventType]["en"], location)
	descriptionZh := fmt.Sprintf("%s发生%s事件，反映地区局势持续发展。", locationNames[location]["zh"], eventTypeDesc[eventType]["zh"])

	// Deduplication check: check if an event with the same title was generated in the last 5 minutes
	recentEvents, err := db.GetRecentEvents(20)
	if err == nil {
		fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
		for _, recentEvent := range recentEvents {
			if recentEvent.Timestamp.After(fiveMinutesAgo) &&
				recentEvent.Title == title {
				// Duplicate event, skip generation
				logger.Printf("⚠️ Skipping duplicate event: %s (generated %v ago)",
					title, time.Since(recentEvent.Timestamp).Round(time.Second))
				return
			}
		}
	}

	event := &Event{
		ID:            fmt.Sprintf("evt_%d", time.Now().Unix()),
		Timestamp:     time.Now(),
		Location:      location,
		LocationZh:    locationNames[location]["zh"],
		Type:          eventType,
		Title:         title,
		TitleZh:       titleZh,
		Description:   description,
		DescriptionZh: descriptionZh,
	}

	// Generate PM economic impact analysis for the event (via PM Agent)
	go func() {
		logger.Printf("🔍 [PM Agent] Starting async analysis goroutine for event %s", event.ID)
		req := PMAnalyzeRequest{
			EventID:     event.ID,
			EventType:   event.Type,
			Location:    event.Location,
			Title:       event.Title,
			Description: event.Description,
		}

		// Call PM Agent for analysis
		logger.Printf("📤 [PM Agent] Starting analyzeEventViaPMAgent for %s", event.ID)
		analysis := analyzeEventViaPMAgent(req)
		if analysis != nil {
			logger.Printf("📊 [PM Agent] Analysis complete, calculating price changes for %s", event.ID)
			calculatePriceChanges(analysis)

			// Store PM analysis in the event Data field
			eventData := make(map[string]interface{})
			eventData["pm_analysis"] = analysis
			err := db.UpdateEventData(event.ID, eventData)
			if err != nil {
				logger.Printf("❌ [PM Agent] Failed to update event data: %v", err)
			} else {
				logger.Printf("✅ [PM Agent] Event %s analysis completed and saved", event.ID)
				
				// Push event update to frontend (WebSocket)
				updatedEvent, err := db.GetEventByID(event.ID)
				if err == nil {
					eventUpdateMsg := map[string]interface{}{
						"type": "event_updated",
						"event": updatedEvent,
					}
					if msgBytes, err := json.Marshal(eventUpdateMsg); err == nil {
						hub.broadcast <- msgBytes
						logger.Printf("📡 [PM Agent] Pushed event update to frontend: %s", event.ID)
					}
				}
			}
		} else {
			logger.Printf("❌ [PM Agent] Analysis returned nil for %s", event.ID)
		}
	}()

	// Create event first (without PM analysis, updated asynchronously after analysis completes)
	db.CreateEvent(event)
}

// updateRelations updates relations
func updateRelations(db *Database) {
	// Simple relation fluctuation logic
	relations, _ := db.GetAllRelations()
	for _, rel := range relations {
		// Random fluctuation
		newValue := rel.Value + (float64(time.Now().Unix()%100)-50)/100.0
		if newValue > 100 {
			newValue = 100
		}
		if newValue < -100 {
			newValue = -100
		}

		trend := newValue - rel.Value
		db.UpdateRelation(rel.ActorID, rel.TargetID, newValue, trend)
	}
}

// broadcastWorldState broadcasts the world state
func broadcastWorldState() {
	state := getWorldState()
	data, _ := json.Marshal(state)

	hub.broadcast <- data
}

// getWorldState retrieves the world state
func getWorldState() map[string]interface{} {
	// Get latest state from database
	roles, _ := db.GetAllRoles()
	events, _ := db.GetRecentEvents(10)
	relations, _ := db.GetAllRelations()
	wars, _ := db.GetActiveWars()
	leaders, err := db.GetAllLeaders()
	if err != nil {
		log.Printf("⚠️ Failed to get leaders: %v", err)
	}

	// Build mapping from role_id to leader
	leaderMap := make(map[string]map[string]interface{})
	for _, l := range leaders {
		if l.IsAlive {
			// Use GetLeaderByRoleID to get correct role ID mapping
			leaderMap[l.RoleID] = map[string]interface{}{
				"id":         l.ID,
				"name":       l.Name,
				"name_en":    l.NameEn,
				"title":      l.Title,
				"title_en":   l.TitleEn,
				"avatar_url": l.AvatarURL,
				"color":      l.Color,
			}
		}
	}

	// Create mapping from 3-letter code to full english role_id
	roleCodeMap := map[string]string{
		"EGY": "egypt", "IRN": "iran", "ISR": "israel", "SAU": "saudi_arabia",
		"TUR": "turkey", "SYR": "syria", "IRQ": "iraq", "JOR": "jordan",
		"QAT": "qatar", "UAE": "uae", "KWT": "kuwait", "BHR": "bahrain",
		"OMN": "oman", "YEM": "yemen", "LBN": "lebanon", "PSE": "palestine",
		"USA": "usa", "RUS": "russia", "CHN": "china",
	}

	// Add leader information to each role
	for _, role := range roles {
		if roleID, ok := roleCodeMap[role.ID]; ok {
			if leader, ok := leaderMap[roleID]; ok {
				role.Leader = leader
			}
		}
	}

	// Get current economic data
	economicData := getCurrentEconomicData()

	return map[string]interface{}{
		"timestamp": time.Now().Format(time.RFC3339),
		"roles":     roles,
		"events":    events,
		"relations": relations,
		"wars":      wars,
		"economy": map[string]interface{}{
			"stocks": map[string]interface{}{
				"spx":  map[string]interface{}{"value": economicData["spx"], "change": economicChanges["spx"]},
				"hsi":  map[string]interface{}{"value": economicData["hsi"], "change": economicChanges["hsi"]},
				"ftse": map[string]interface{}{"value": economicData["ftse"], "change": economicChanges["ftse"]},
			},
			"crypto": map[string]interface{}{
				"btc": map[string]interface{}{"value": economicData["btc"], "change": economicChanges["btc"]},
				"eth": map[string]interface{}{"value": economicData["eth"], "change": economicChanges["eth"]},
			},
			"commodities": map[string]interface{}{
				"oil":    map[string]interface{}{"value": economicData["oil"], "change": economicChanges["oil"]},
				"gold":   map[string]interface{}{"value": economicData["gold"], "change": economicChanges["gold"]},
				"silver": map[string]interface{}{"value": economicData["silver"], "change": economicChanges["silver"]},
			},
		},
	}
}

// HTTP handler functions
func handleWorldState(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(getWorldState())
}

func handleEvents(w http.ResponseWriter, r *http.Request) {
	limit := 20
	events, err := db.GetRecentEvents(limit)
	if err != nil {
		http.Error(w, `{"error":"Query failed"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"events": events,
		"total":  len(events),
	})
}

func handleRelations(w http.ResponseWriter, r *http.Request) {
	relations, err := db.GetAllRelations()
	if err != nil {
		http.Error(w, `{"error":"Query failed"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"relations": relations,
		"total":     len(relations),
	})
}

func handleWars(w http.ResponseWriter, r *http.Request) {
	wars, err := db.GetActiveWars()
	if err != nil {
		http.Error(w, `{"error":"Query failed"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"wars":  wars,
		"total": len(wars),
	})
}

// DeclareStatementRequest represents a statement request
type DeclareStatementRequest struct {
	Content    string `json:"content"`
	ContentZh  string `json:"content_zh"`  // Chinese content (optional)
	Type       string `json:"type"`        // diplomacy, military, economic
	Location   string `json:"location"`    // optional, auto-detected by default
	LocationZh string `json:"location_zh"` // Chinese location (optional)
	AgentID    string `json:"agent_id"`    // Agent identifier
	RoleID     string `json:"role_id"`     // Country/role ID (e.g., USA, IRN)
}

// Chinese/English location mapping
var locationNames = map[string]map[string]string{
	"Washington": {"zh": "华盛顿", "en": "Washington"},
	"Tehran":     {"zh": "德黑兰", "en": "Tehran"},
	"Jerusalem":  {"zh": "耶路撒冷", "en": "Jerusalem"},
	"Riyadh":     {"zh": "利雅得", "en": "Riyadh"},
	"Damascus":   {"zh": "大马士革", "en": "Damascus"},
	"Baghdad":    {"zh": "巴格达", "en": "Baghdad"},
	"Beijing":    {"zh": "北京", "en": "Beijing"},
	"Moscow":     {"zh": "莫斯科", "en": "Moscow"},
}

// handleDeclareStatement handles public statement requests
func handleDeclareStatement(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req DeclareStatementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Content == "" {
		http.Error(w, `{"error":"Content is required"}`, http.StatusBadRequest)
		return
	}

	// Default type
	if req.Type == "" {
		req.Type = "diplomacy"
	}

	// Default location
	if req.Location == "" {
		locations := []string{"Washington", "Tehran", "Jerusalem", "Riyadh", "Damascus"}
		req.Location = locations[time.Now().Unix()%int64(len(locations))]
	}

	// Chinese location
	locationZh := req.LocationZh
	if locationZh == "" {
		if names, ok := locationNames[req.Location]; ok {
			locationZh = names["zh"]
		} else {
			locationZh = req.Location
		}
	}

	// Chinese content (use English content if not provided)
	contentZh := req.ContentZh
	if contentZh == "" {
		contentZh = req.Content
	}

	// Create event
	event := &Event{
		ID:            fmt.Sprintf("evt_%d", time.Now().UnixNano()),
		Timestamp:     time.Now(),
		Location:      req.Location,
		LocationZh:    locationZh,
		Type:          req.Type,
		Title:         fmt.Sprintf("%s Statement", req.Location),
		TitleZh:       fmt.Sprintf("%s声明", locationZh),
		Description:   req.Content,
		DescriptionZh: contentZh,
	}

	if err := db.CreateEvent(event); err != nil {
		logger.Printf("❌ Failed to create event: %v", err)
		http.Error(w, `{"error":"Failed to create event"}`, http.StatusInternalServerError)
		return
	}

	// Build WebSocket message
	wsMsg := WebSocketMessage{
		Type:      "public_statement",
		From:      req.AgentID,
		RoleID:    req.RoleID,
		Channel:   "world",
		Content:   req.Content,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data: map[string]interface{}{
			"event_id": event.ID,
			"type":     req.Type,
			"location": req.Location,
		},
	}

	// Broadcast message
	if msgBytes, err := json.Marshal(wsMsg); err == nil {
		hub.broadcast <- msgBytes
		logger.Printf("📢 [Statement] %s (%s): %s", req.AgentID, req.RoleID, req.Content)

		// Forward to Agent (deduplication check is in ForwardMessage)
		go ForwardMessage(wsMsg)
	}

	logger.Printf("✅ [Statement] Event created: %s", event.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"message":   "Statement sent",
		"event_id":  event.ID,
		"timestamp": event.Timestamp.Format(time.RFC3339),
	})
}

// handleAllRoles handles the country list request (leaderboard)
func handleAllRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := db.GetAllRoles()
	if err != nil {
		http.Error(w, `{"error":"Failed to get country list"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"roles": roles,
	})
}

// getPlayersHandler handles player list request
func getPlayersHandler(w http.ResponseWriter, r *http.Request) {
	// TODO: Query player list from database
	// Currently returns empty list
	players := []map[string]interface{}{}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"players": players,
		"count":   len(players),
	})
}

// handleRoleInfo handles country info query
func handleRoleInfo(w http.ResponseWriter, r *http.Request) {
	roleID := r.URL.Query().Get("id")
	if roleID == "" {
		http.Error(w, `{"error":"Country ID is required"}`, http.StatusBadRequest)
		return
	}

	role, err := db.GetRoleByID(roleID)
	if err != nil {
		http.Error(w, `{"error":"Country does not exist"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"role": role,
	})
}

// handleAllLeaders handles the all leaders list request
func handleAllLeaders(w http.ResponseWriter, r *http.Request) {
	leaders, err := db.GetAllLeaders()
	if err != nil {
		http.Error(w, `{"error":"Failed to get leaders list"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"leaders": leaders,
		"total":   len(leaders),
	})
}

// handleLeaderInfo handles leader info query
func handleLeaderInfo(w http.ResponseWriter, r *http.Request) {
	leaderID := r.URL.Query().Get("id")
	roleID := r.URL.Query().Get("role_id")

	var leader *Leader
	var err error

	if leaderID != "" {
		// Query by leader ID (needs additional implementation)
		http.Error(w, `{"error":"Query by ID not supported yet"}`, http.StatusNotImplemented)
		return
	} else if roleID != "" {
		leader, err = db.GetLeaderByRoleID(roleID)
		if err != nil {
			http.Error(w, `{"error":"Query failed"}`, http.StatusInternalServerError)
			return
		}
		if leader == nil {
			http.Error(w, `{"error":"No leader information for this country"}`, http.StatusNotFound)
			return
		}
	} else {
		http.Error(w, `{"error":"Leader ID or Country ID is required"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"leader": leader,
	})
}

// WebSocket handling
const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins (should be restricted in production)
	},
}

type WebSocketClient struct {
	hub     *WebSocketHub
	conn    *websocket.Conn
	send    chan []byte
	agentID string
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Println("WebSocket upgrade failed:", err)
		return
	}

	// Get agentID (from URL parameter or header)
	agentID := r.URL.Query().Get("agentId")
	if agentID == "" {
		agentID = r.Header.Get("X-Agent-ID")
	}

	logger.Printf("🔌 [WebSocket] New connection: %s", agentID)

	client := &WebSocketClient{
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, 256),
		agentID: agentID,
	}

	client.hub.register <- client

	// Start writer goroutines
	go client.writePump()
	go client.readPump()
}

func (c *WebSocketClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Send channel closed, close connection immediately
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			if _, err := w.Write(message); err != nil {
				return
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *WebSocketClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Printf("⚠️ [WebSocket] Read error (unexpected close): %v", err)
			} else {
				logger.Printf("⚠️ [WebSocket] Read error: %v", err)
			}
			break
		}

		logger.Printf("📨 [WebSocket] Message received (TEST BUILD v2): %s", string(message))

		// Parse message and broadcast
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			logger.Printf("❌ [WebSocket] Parse failed: %v", err)
			continue
		}

		logger.Printf("✅ [WebSocket] Message type: %s, Content: %s", msg.Type, msg.Content)

		// Add sender information
		msg.From = c.agentID
		if msg.From == "" {
			msg.From = "anonymous"
		}

		// === DEBUG: Role lookup ===
		logger.Printf("🔍 [DEBUG] Starting role lookup, msg.From=%s", msg.From)
		roleID, err := db.GetPlayerRole(msg.From)
		logger.Printf("🔍 [DEBUG] GetPlayerRole returned: roleID=%s, err=%v", roleID, err)
		if err == nil && roleID != "" {
			msg.RoleID = roleID
			logger.Printf("🎭 [WebSocket] Player %s bound to role: %s", msg.From, roleID)
		} else {
			logger.Printf("⚠️ [WebSocket] Player %s has no bound role (err=%v, roleID='%s')", msg.From, err, roleID)
		}
		logger.Printf("🔍 [DEBUG] Before broadcast msg.RoleID=%s", msg.RoleID)
		// === END DEBUG ===

		msg.Timestamp = time.Now().UTC().Format(time.RFC3339)

		// Save message to database
		var roomID string
		if msg.Channel != "" {
			roomID = msg.Channel
		}
		msgType := "text"
		if msg.Type == "public_statement" || msg.Type == "diplomatic_statement" {
			msgType = "statement"
		}
		if err := db.SaveChatMessage(roomID, msg.From, msg.RoleID, msg.Content, msgType); err != nil {
			logger.Printf("⚠️ [WebSocket] Failed to save message: %v", err)
		}

		// Broadcast message
		if msgBytes, err := json.Marshal(msg); err == nil {
			c.hub.broadcast <- msgBytes
			logger.Printf("📢 [WebSocket] Broadcast message: %s (%s): %s", msg.From, msg.RoleID, msg.Content)
			logger.Printf("🔍 [DEBUG] Raw broadcast JSON: %s", string(msgBytes))
		} else {
			logger.Printf("❌ [WebSocket] Serialization failed: %v", err)
		}
	}
}

// WebSocketHub maintains the set of active clients and broadcasts messages to the clients
type WebSocketHub struct {
	clients    map[*WebSocketClient]bool
	broadcast  chan []byte
	register   chan *WebSocketClient
	unregister chan *WebSocketClient
	mutex      sync.RWMutex
}

// NewWebSocketHub creates a new WebSocket Hub
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients:    make(map[*WebSocketClient]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *WebSocketClient),
		unregister: make(chan *WebSocketClient),
	}
}

func (h *WebSocketHub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mutex.Unlock()
		case message := <-h.broadcast:
			if message == nil {
				continue
			}
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// handleResetRoles resets all role bindings (for development)
func handleResetRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	result, err := db.db.Exec("UPDATE roles SET player_id = NULL")
	if err != nil {
		log.Printf("❌ Failed to reset roles: %v", err)
		http.Error(w, fmt.Sprintf("Reset failed: %v", err), http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	log.Printf("✅ Reset %d role bindings", rows)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Reset %d roles", rows),
	})
}

// AgentCommandRequest represents an Agent command request
type AgentCommandRequest struct {
	Action  string            `json:"action"`
	Target  string            `json:"target"`
	Params  map[string]string `json:"params,omitempty"`
	Content string            `json:"content,omitempty"`
}

// AgentDecision represents an Agent decision result
type AgentDecision struct {
	Execute    bool   `json:"execute"`
	Reason     string `json:"reason"`
	Analysis   string `json:"analysis"`
	Conditions string `json:"conditions,omitempty"`
	Confidence string `json:"confidence"`
}

// handleAgentCommand handles Agent commands (player sends command to Agent, Agent makes autonomous decision)
func handleAgentCommand(w http.ResponseWriter, r *http.Request) {
	logger.Printf("[DEBUG] handleAgentCommand received request: method=%s", r.Method)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AgentCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[ERROR] Request parsing failed: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[DEBUG] Agent command: action=%s, target=%s", req.Action, req.Target)

	// Get player ID from JWT context
	playerIDVal := r.Context().Value("player_id")
	if playerIDVal == nil {
		logger.Printf("[ERROR] Missing player ID")
		http.Error(w, "Player ID required", http.StatusUnauthorized)
		return
	}
	playerID, ok := playerIDVal.(string)
	if !ok {
		logger.Printf("[ERROR] Invalid player ID format")
		http.Error(w, "Invalid player ID", http.StatusUnauthorized)
		return
	}

	logger.Printf("[DEBUG] Player ID: %s", playerID)

	// Get role controlled by player
	role, err := db.GetRoleByPlayerID(playerID)
	if err != nil {
		logger.Printf("[ERROR] Failed to get player role: %v", err)
		http.Error(w, fmt.Sprintf("Failed to get player role: %v", err), http.StatusInternalServerError)
		return
	}

	if role == nil {
		logger.Printf("[ERROR] Player has no active role")
		http.Error(w, "Player has no active role", http.StatusBadRequest)
		return
	}

	logger.Printf("[DEBUG] Player role: %s (ID=%s)", role.Name, role.ID)

	// Get required data for decision making
	myData, err := db.GetRoleByID(role.ID)
	if err != nil {
		logger.Printf("[ERROR] Failed to get my data: %v", err)
		http.Error(w, fmt.Sprintf("Failed to get my data: %v", err), http.StatusInternalServerError)
		return
	}

	targetData, err := db.GetRoleByID(req.Target)
	if err != nil {
		logger.Printf("[ERROR] Failed to get target data: %v", err)
		http.Error(w, fmt.Sprintf("Failed to get target data: %v", err), http.StatusNotFound)
		return
	}

	// Agent decision logic
	decision := makeDecision(role.ID, req.Action, req.Target, myData, targetData)

	logger.Printf("🤖 [Agent Decision] %s → %s (%s): %v", role.ID, req.Action, req.Target, decision.Execute)

	// If decision is to execute, call rule engine directly to execute action
	if decision.Execute {
		var result *ActionResult
		var err error

		// Call rule engine method based on action type
		switch req.Action {
		case "declare_war":
			result, err = ruleEngine.DeclareWar(role.ID, req.Target)
		case "sanction":
			result, err = ruleEngine.Sanction(role.ID, req.Target)
		case "coup":
			result, err = ruleEngine.Coup(role.ID, req.Target)
		case "form_alliance":
			result, err = ruleEngine.FormAlliance(role.ID, req.Target)
		case "diplomatic_statement":
			statementType := req.Params["statement_type"]
			if statementType == "" {
				statementType = "neutral"
			}
			result, err = ruleEngine.DiplomaticStatement(role.ID, req.Target, statementType, req.Content)
		default:
			logger.Printf("[ERROR] Unknown action type: %s", req.Action)
			http.Error(w, fmt.Sprintf("Unknown action type: %s", req.Action), http.StatusBadRequest)
			return
		}

		if err != nil {
			logger.Printf("[ERROR] Action execution failed: %v", err)
			http.Error(w, fmt.Sprintf("Action execution failed: %v", err), http.StatusInternalServerError)
			return
		}

		// Apply attribute changes
		if len(result.Changes) > 0 {
			for _, change := range result.Changes {
				if err := db.UpdateRoleAttribute(change.TargetID, change.Attribute, change.NewValue); err != nil {
					logger.Printf("[ERROR] Failed to update attribute: %v", err)
				}
			}
		}

		// Store event
		if result.NewEvent != nil {
			if err := db.InsertEvent(*result.NewEvent); err != nil {
				logger.Printf("[ERROR] Failed to store event: %v", err)
			}
		}

		// Return decision + execution result (directly return decision field to match frontend expectations)
		response := map[string]interface{}{
			"execute":       decision.Execute,
			"reason":        decision.Reason,
			"analysis":      decision.Analysis,
			"conditions":    decision.Conditions,
			"confidence":    decision.Confidence,
			"action_result": result,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Decision not to execute, return decision result
	logger.Printf("🤖 [Agent Decision Result] execute=%v, reason=%q, confidence=%s, analysis length=%d",
		decision.Execute, decision.Reason, decision.Confidence, len(decision.Analysis))
	response := map[string]interface{}{
		"execute":    decision.Execute,
		"reason":     decision.Reason,
		"analysis":   decision.Analysis,
		"conditions": decision.Conditions,
		"confidence": decision.Confidence,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// PMAnalyzeRequest represents a PM Agent analysis request
type PMAnalyzeRequest struct {
	EventID     string `json:"event_id"`
	EventType   string `json:"event_type"`
	Location    string `json:"location"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// PMAnalyzeResponse represents a PM Agent analysis response
type PMAnalyzeResponse struct {
	// Commodities
	Oil    *ImpactAnalysis `json:"oil,omitempty"`
	Gold   *ImpactAnalysis `json:"gold,omitempty"`
	Silver *ImpactAnalysis `json:"silver,omitempty"`
	// Cryptocurrencies
	BTC *ImpactAnalysis `json:"btc,omitempty"`
	ETH *ImpactAnalysis `json:"eth,omitempty"`
	// Stock markets
	SPX  *ImpactAnalysis `json:"spx,omitempty"`  // S&P 500
	HSI  *ImpactAnalysis `json:"hsi,omitempty"`  // Hang Seng
	FTSE *ImpactAnalysis `json:"ftse,omitempty"` // FTSE 100
	// Summary
	Summary string `json:"summary"`
	// Concrete price changes based on current baseline
	OilPriceChange    *PriceChange `json:"oil_price_change,omitempty"`
	GoldPriceChange   *PriceChange `json:"gold_price_change,omitempty"`
	SilverPriceChange *PriceChange `json:"silver_price_change,omitempty"`
	BTCPriceChange    *PriceChange `json:"btc_price_change,omitempty"`
	ETHPriceChange    *PriceChange `json:"eth_price_change,omitempty"`
	SPXPriceChange    *PriceChange `json:"spx_price_change,omitempty"`
	HSIPriceChange    *PriceChange `json:"hsi_price_change,omitempty"`
	FTSEPriceChange   *PriceChange `json:"ftse_price_change,omitempty"`
}

// PriceChange represents concrete price change
type PriceChange struct {
	Baseline      float64 `json:"baseline"`
	PercentChange float64 `json:"percent_change"` // Percentage impact analyzed by PM Agent
	MinChange     float64 `json:"min_change"`     // Minimum change value
	MaxChange     float64 `json:"max_change"`     // Maximum change value
	NewPrice      float64 `json:"new_price"`      // New price
	Currency      string  `json:"currency"`
}

// ImpactAnalysis represents impact analysis
type ImpactAnalysis struct {
	Direction string  `json:"direction"` // "up" or "down"
	Min       float64 `json:"min_change"`
	Max       float64 `json:"max_change"`
	Value     float64 `json:"value"` // Percentage impact analyzed by PM Agent (midpoint value)
	Reason    string  `json:"reason"`
}

// handlePMAnalyze handles PM Agent economic impact analysis
// PMCallbackRequest represents PM Agent callback request
type PMCallbackRequest struct {
	EventID   string             `json:"event_id"`
	EventType string             `json:"event_type"`
	Analysis  *PMAnalyzeResponse `json:"analysis"`
}

// handlePMCallback is the callback API after PM Agent completes analysis
func handlePMCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PMCallbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[PM Callback] Request parsing failed: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[PM Callback] Received analysis result for event %s", req.EventID)

	// Calculate concrete price changes
	calculatePriceChanges(req.Analysis)

	// Update economic data
	updateEconomicData(req.Analysis)

	// Update event data
	if req.EventID != "" && req.Analysis != nil {
		// Store analysis result directly as JSON object (not string)
		eventData := make(map[string]interface{})
		eventData["pm_analysis"] = req.Analysis
		err := db.UpdateEventData(req.EventID, eventData)
		if err != nil {
			logger.Printf("[PM Callback] Failed to update event data: %v", err)
			http.Error(w, fmt.Sprintf("Update failed: %v", err), http.StatusInternalServerError)
			return
		}
		logger.Printf("[PM Callback] ✅ Event %s data updated", req.EventID)

		// Send Telegram notification
		sendPMAnalysis(req.EventID, req.EventType, "", req.Analysis)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func handlePMAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PMAnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[ERROR] PM analysis request parsing failed: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[PM Agent] Analyzing event: %s (%s) - %s", req.EventID, req.EventType, req.Location)

	// PM Agent analysis logic
	analysis := analyzeEventImpact(req)

	// Calculate concrete price changes
	calculatePriceChanges(analysis)

	// Update economic data (if impacted)
	updateEconomicData(analysis)

	// Return analysis result
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analysis)
}

// Current economic baseline data (March 2026) - dynamically updatable
var economicBaseline = map[string]float64{
	// Stock markets
	"spx":  6672.62,  // S&P 500
	"hsi":  25716.76, // Hang Seng Index
	"ftse": 8342.15,  // FTSE 100
	// Cryptocurrencies
	"btc": 70523, // Bitcoin
	"eth": 2064,  // Ethereum
	// Commodities
	"oil":    96.35,  // WTI Crude $/barrel
	"gold":   5153.0, // Gold $/ounce
	"silver": 86.84,  // Silver $/ounce
}

// Economic data percentage changes
var economicChanges = map[string]float64{
	"spx":    0,
	"hsi":    0,
	"ftse":   0,
	"btc":    0,
	"eth":    0,
	"oil":    0,
	"gold":   0,
	"silver": 0,
}

// Economic data mutex (for concurrent safety)
var economicMutex sync.RWMutex

// updateEconomicData updates economic data using concrete values from PM Agent analysis
func updateEconomicData(analysis *PMAnalyzeResponse) {
	economicMutex.Lock()
	defer economicMutex.Unlock()

	// Use concrete price changes directly from PM Agent analysis
	if analysis.OilPriceChange != nil {
		oldPrice := economicBaseline["oil"]
		economicBaseline["oil"] = analysis.OilPriceChange.NewPrice
		economicChanges["oil"] = analysis.OilPriceChange.PercentChange
		log.Printf("[Economy] Oil price updated: $%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["oil"], analysis.OilPriceChange.PercentChange)
	}

	if analysis.GoldPriceChange != nil {
		oldPrice := economicBaseline["gold"]
		economicBaseline["gold"] = analysis.GoldPriceChange.NewPrice
		economicChanges["gold"] = analysis.GoldPriceChange.PercentChange
		log.Printf("[Economy] Gold price updated: $%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["gold"], analysis.GoldPriceChange.PercentChange)
	}

	if analysis.SilverPriceChange != nil {
		oldPrice := economicBaseline["silver"]
		economicBaseline["silver"] = analysis.SilverPriceChange.NewPrice
		economicChanges["silver"] = analysis.SilverPriceChange.PercentChange
		log.Printf("[Economy] Silver price updated: $%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["silver"], analysis.SilverPriceChange.PercentChange)
	}

	if analysis.BTCPriceChange != nil {
		oldPrice := economicBaseline["btc"]
		economicBaseline["btc"] = analysis.BTCPriceChange.NewPrice
		economicChanges["btc"] = analysis.BTCPriceChange.PercentChange
		log.Printf("[Economy] BTC price updated: $%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["btc"], analysis.BTCPriceChange.PercentChange)
	}

	if analysis.ETHPriceChange != nil {
		oldPrice := economicBaseline["eth"]
		economicBaseline["eth"] = analysis.ETHPriceChange.NewPrice
		economicChanges["eth"] = analysis.ETHPriceChange.PercentChange
		log.Printf("[Economy] ETH price updated: $%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["eth"], analysis.ETHPriceChange.PercentChange)
	}

	if analysis.SPXPriceChange != nil {
		oldValue := economicBaseline["spx"]
		economicBaseline["spx"] = analysis.SPXPriceChange.NewPrice
		economicChanges["spx"] = analysis.SPXPriceChange.PercentChange
		log.Printf("[Economy] S&P 500 updated: %.2f → %.2f (%.2f%%)",
			oldValue, economicBaseline["spx"], analysis.SPXPriceChange.PercentChange)
	}

	if analysis.HSIPriceChange != nil {
		oldValue := economicBaseline["hsi"]
		economicBaseline["hsi"] = analysis.HSIPriceChange.NewPrice
		economicChanges["hsi"] = analysis.HSIPriceChange.PercentChange
		log.Printf("[Economy] Hang Seng updated: %.2f → %.2f (%.2f%%)",
			oldValue, economicBaseline["hsi"], analysis.HSIPriceChange.PercentChange)
	}

	if analysis.FTSEPriceChange != nil {
		oldValue := economicBaseline["ftse"]
		economicBaseline["ftse"] = analysis.FTSEPriceChange.NewPrice
		log.Printf("[Economy] FTSE 100 updated: %.2f → %.2f (%.2f%%)",
			oldValue, economicBaseline["ftse"], analysis.FTSEPriceChange.PercentChange)
	}
}

// randomInRange returns a random value within range
func randomInRange(min, max float64) float64 {
	if min == max {
		return min
	}
	// Use math.Round to keep 2 decimal places
	value := min + rand.Float64()*(max-min)
	return math.Round(value*100) / 100
}

// getCurrentEconomicData returns current economic data
func getCurrentEconomicData() map[string]float64 {
	economicMutex.RLock()
	defer economicMutex.RUnlock()

	// Return copy
	data := make(map[string]float64)
	for k, v := range economicBaseline {
		data[k] = v
	}
	return data
}

// analyzeEventImpact analyzes event impact on economy
// analyzeEventViaPMAgent calls PM Agent via OpenClaw Gateway to analyze event
func analyzeEventViaPMAgent(req PMAnalyzeRequest) *PMAnalyzeResponse {
	logger.Printf("[PM Agent] Sending analysis request: %s (%s)", req.EventID, req.EventType)

	// Build message to send to PM Agent
	message := fmt.Sprintf(`📊 Event Analysis Request

**Event ID**: %s
**Type**: %s
**Location**: %s
**Title**: %s
**Description**: %s

---

Please analyze the impact of this event on the global economy.

## Analysis Requirements

1. Use the quantitative formulas in KNOWLEDGE.md to calculate
2. Cover the following indicators:
   - Crude oil (WTI) price change
   - Gold price change
   - BTC, ETH cryptocurrency changes
   - S&P 500, Hang Seng, FTSE 100 stock market changes

3. **Return analysis result directly in JSON format in your reply** (do not call API):

JSON format:
{
  "oil": {"direction": "up", "min_change": 8, "max_change": 15, "value": 11.5, "reason": "Strait of Hormuz tension"},
  "gold": {"direction": "up", "min_change": 3, "max_change": 5, "value": 4, "reason": "Safe haven sentiment"},
  "btc": {"direction": "down", "min_change": 2, "max_change": 5, "value": -3.5, "reason": "Risk asset sell-off"},
  "eth": {"direction": "down", "min_change": 2, "max_change": 5, "value": -3, "reason": "Follows BTC"},
  "spx": {"direction": "down", "min_change": 1, "max_change": 3, "value": -2, "reason": "Geopolitical risk"},
  "hsi": {"direction": "down", "min_change": 2, "max_change": 4, "value": -3, "reason": "Asian market panic"},
  "ftse": {"direction": "down", "min_change": 1, "max_change": 3, "value": -2, "reason": "Oil price increase drag"},
  "summary": "🚨 Middle East situation pushes up oil and safe haven assets"
}

**Please start analysis now, return the result directly in JSON format.**`,
		req.EventID, req.EventType, req.Location, req.Title, req.Description)

	// Send message to PM Agent and wait for reply (5 second timeout, fall back to local analysis on timeout)
	reply, err := sendToAgentAndWait("pm", message, 5*time.Second)
	if err != nil {
		logger.Printf("⚠️ [PM Agent] Send/receive failed (timeout or error): %v, using local analysis", err)
		// Fall back to local analysis
		return analyzeEventImpact(req)
	}

	logger.Printf("[PM Agent] ✅ Reply received, length: %d characters", len(reply))

	// Parse PM Agent reply, extract JSON analysis result
	analysis := parsePMAnalysisReply(reply)
	if analysis == nil {
		logger.Printf("⚠️ [PM Agent] Failed to parse reply, using local analysis")
		return analyzeEventImpact(req)
	}

	logger.Printf("[PM Agent] ✅ Parse succeeded: %s", analysis.Summary)
	return analysis
}

// parsePMAnalysisReply parses PM Agent reply to extract JSON analysis result
func parsePMAnalysisReply(reply string) *PMAnalyzeResponse {
	// Try to extract JSON code block from reply
	jsonStart := strings.Index(reply, "```json")
	jsonEnd := strings.Index(reply, "```")

	var jsonStr string
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr = reply[jsonStart+7 : jsonEnd] // Skip ```json
	} else {
		// Try to parse entire reply directly
		jsonStr = reply
	}

	// Clean up JSON string
	jsonStr = strings.TrimSpace(jsonStr)

	// Define temporary struct for parsing
	type TempAnalysis struct {
		Oil     *ImpactAnalysis `json:"oil,omitempty"`
		Gold    *ImpactAnalysis `json:"gold,omitempty"`
		Silver  *ImpactAnalysis `json:"silver,omitempty"`
		BTC     *ImpactAnalysis `json:"btc,omitempty"`
		ETH     *ImpactAnalysis `json:"eth,omitempty"`
		SPX     *ImpactAnalysis `json:"spx,omitempty"`
		HSI     *ImpactAnalysis `json:"hsi,omitempty"`
		FTSE    *ImpactAnalysis `json:"ftse,omitempty"`
		Summary string          `json:"summary,omitempty"`
	}

	var tempAnalysis TempAnalysis
	if err := json.Unmarshal([]byte(jsonStr), &tempAnalysis); err != nil {
		logger.Printf("❌ [PM Agent] Failed to parse JSON: %v", err)
		logger.Printf("JSON string: %s", jsonStr[:min(200, len(jsonStr))])
		return nil
	}

	// Convert to PMAnalyzeResponse
	response := &PMAnalyzeResponse{
		Summary: tempAnalysis.Summary,
	}

	if tempAnalysis.Oil != nil {
		response.Oil = tempAnalysis.Oil
	}
	if tempAnalysis.Gold != nil {
		response.Gold = tempAnalysis.Gold
	}
	if tempAnalysis.Silver != nil {
		response.Silver = tempAnalysis.Silver
	}
	if tempAnalysis.BTC != nil {
		response.BTC = tempAnalysis.BTC
	}
	if tempAnalysis.ETH != nil {
		response.ETH = tempAnalysis.ETH
	}
	if tempAnalysis.SPX != nil {
		response.SPX = tempAnalysis.SPX
	}
	if tempAnalysis.HSI != nil {
		response.HSI = tempAnalysis.HSI
	}
	if tempAnalysis.FTSE != nil {
		response.FTSE = tempAnalysis.FTSE
	}

	return response
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func analyzeEventImpact(req PMAnalyzeRequest) *PMAnalyzeResponse {
	response := &PMAnalyzeResponse{}

	// Middle East conflict event analysis
	if req.EventType == "military" || req.EventType == "war_declaration" {
		// Conflict in core Middle East region (Strait of Hormuz, nuclear facilities, great power involvement)
		if req.Location == "Tehran" || req.Location == "Jerusalem" ||
			req.Location == "Iraq" || req.Location == "Syria" {

			// Serious conflict: oil +2-4%, gold +0.5-1.5%
			response.Oil = &ImpactAnalysis{
				Direction: "up",
				Min:       2,
				Max:       4,
				Value:     3, // PM Agent analysis result: take midpoint
				Reason:    "Middle East tensions, Strait of Hormuz shipping risk",
			}
			response.Gold = &ImpactAnalysis{
				Direction: "up",
				Min:       0.5,
				Max:       1.5,
				Value:     1,
				Reason:    "Safe haven sentiment drives gold demand",
			}
			response.Silver = &ImpactAnalysis{
				Direction: "up",
				Min:       0.5,
				Max:       1.2,
				Value:     0.85,
				Reason:    "Precious metal safe haven demand increases",
			}
			response.BTC = &ImpactAnalysis{
				Direction: "up",
				Min:       0.3,
				Max:       1,
				Value:     0.65,
				Reason:    "Some capital flows to cryptocurrencies as safe haven",
			}
			response.ETH = &ImpactAnalysis{
				Direction: "up",
				Min:       0.5,
				Max:       1.5,
				Value:     1,
				Reason:    "Cryptocurrency market follows Bitcoin",
			}
			// US stocks fall
			response.SPX = &ImpactAnalysis{
				Direction: "down",
				Min:       0.5,
				Max:       1.5,
				Value:     1,
				Reason:    "Geopolitical risk suppresses market confidence",
			}
			// Hong Kong stocks fall slightly (Asian market)
			response.HSI = &ImpactAnalysis{
				Direction: "down",
				Min:       0.3,
				Max:       1,
				Value:     0.65,
				Reason:    "Middle East situation affects Asian market sentiment",
			}
			// UK stocks have smaller impact
			response.FTSE = &ImpactAnalysis{
				Direction: "down",
				Min:       0.2,
				Max:       0.5,
				Value:     0.35,
				Reason:    "European market limited impact from Middle East",
			}
			response.Summary = "Middle East military conflict will moderately push up oil and safe haven assets, global stock markets under slight pressure. Watch energy sector and defensive assets."
		} else {
			// Other regions (Saudi, UAE, etc.) - smaller impact
			response.Oil = &ImpactAnalysis{
				Direction: "up",
				Min:       1,
				Max:       2,
				Value:     1.5,
				Reason:    "Regional conflict creates supply concerns",
			}
			response.Gold = &ImpactAnalysis{
				Direction: "up",
				Min:       0.2,
				Max:       0.5,
				Value:     0.35,
				Reason:    "Mild safe haven demand",
			}
			response.Silver = &ImpactAnalysis{
				Direction: "up",
				Min:       0.2,
				Max:       0.4,
				Value:     0.3,
				Reason:    "Follows gold trend",
			}
			response.Summary = "Regional conflict has limited economic impact, market reacts moderately."
		}
	} else if req.EventType == "economic" {
		// Economic event
		response.Oil = &ImpactAnalysis{
			Direction: "down",
			Min:       0.5,
			Max:       1.5,
			Value:     1,
			Reason:    "Economic sanctions or increased supply expectations",
		}
		response.SPX = &ImpactAnalysis{
			Direction: "up",
			Min:       0.3,
			Max:       0.8,
			Value:     0.55,
			Reason:    "Economic policy benefits market",
		}
		response.HSI = &ImpactAnalysis{
			Direction: "up",
			Min:       0.2,
			Max:       0.5,
			Value:     0.35,
			Reason:    "Global economic sentiment improves",
		}
		response.Summary = "Economic event impact varies by specific policy, overall impact manageable."
	} else if req.EventType == "diplomacy" {
		// Diplomatic event
		response.Gold = &ImpactAnalysis{
			Direction: "down",
			Min:       0.2,
			Max:       0.5,
			Value:     0.35,
			Reason:    "Diplomatic detente reduces safe haven demand",
		}
		response.Silver = &ImpactAnalysis{
			Direction: "down",
			Min:       0.1,
			Max:       0.3,
			Value:     0.2,
			Reason:    "Follows gold trend",
		}
		response.SPX = &ImpactAnalysis{
			Direction: "up",
			Min:       0.2,
			Max:       0.5,
			Value:     0.35,
			Reason:    "Improved diplomatic relations boost market confidence",
		}
		response.HSI = &ImpactAnalysis{
			Direction: "up",
			Min:       0.1,
			Max:       0.3,
			Value:     0.2,
			Reason:    "Market sentiment improves",
		}
		response.FTSE = &ImpactAnalysis{
			Direction: "up",
			Min:       0.1,
			Max:       0.3,
			Value:     0.2,
			Reason:    "Market sentiment improves",
		}
		response.Summary = "Diplomatic events usually have limited impact, market reacts moderately."
	} else {
		// Default analysis - no significant impact
		response.Summary = "The event has limited economic impact, market reacts steadily."
	}

	return response
}

// calculatePriceChanges calculates concrete price changes and updates global economic status
func calculatePriceChanges(analysis *PMAnalyzeResponse) {
	economicMutex.Lock()
	defer economicMutex.Unlock()

	// Crude oil price change (use specific value from PM Agent analysis)
	if analysis.Oil != nil {
		baseline := economicBaseline["oil"]
		percentChange := analysis.Oil.Value // Use specific value
		if analysis.Oil.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		// Calculate min and max change values
		minChange := baseline * analysis.Oil.Min / 100
		maxChange := baseline * analysis.Oil.Max / 100
		if analysis.Oil.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.OilPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "$",
		}
		// Update global economic status
		economicBaseline["oil"] = analysis.OilPriceChange.NewPrice
		logger.Printf("[Economy] Oil updated: %.2f → %.2f (%.2f%%)", baseline, analysis.OilPriceChange.NewPrice, percentChange)
	}

	// Gold price change
	if analysis.Gold != nil {
		baseline := economicBaseline["gold"]
		percentChange := analysis.Gold.Value
		if analysis.Gold.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.Gold.Min / 100
		maxChange := baseline * analysis.Gold.Max / 100
		if analysis.Gold.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.GoldPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "$",
		}
		// Update global economic status
		economicBaseline["gold"] = analysis.GoldPriceChange.NewPrice
		logger.Printf("[Economy] Gold updated: %.2f → %.2f (%.2f%%)", baseline, analysis.GoldPriceChange.NewPrice, percentChange)
	}

	// Silver price change
	if analysis.Silver != nil {
		baseline := economicBaseline["silver"]
		percentChange := analysis.Silver.Value
		if analysis.Silver.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.Silver.Min / 100
		maxChange := baseline * analysis.Silver.Min / 100
		if analysis.Silver.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.SilverPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "$",
		}
		// Update global economic status
		economicBaseline["silver"] = analysis.SilverPriceChange.NewPrice
		logger.Printf("[Economy] Silver updated: %.2f → %.2f (%.2f%%)", baseline, analysis.SilverPriceChange.NewPrice, percentChange)
	}

	// Bitcoin price change
	if analysis.BTC != nil {
		baseline := economicBaseline["btc"]
		percentChange := analysis.BTC.Value
		if analysis.BTC.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.BTC.Min / 100
		maxChange := baseline * analysis.BTC.Max / 100
		if analysis.BTC.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.BTCPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "$",
		}
		// Update global economic status
		economicBaseline["btc"] = analysis.BTCPriceChange.NewPrice
		logger.Printf("[Economy] BTC updated: %.2f → %.2f (%.2f%%)", baseline, analysis.BTCPriceChange.NewPrice, percentChange)
	}

	// Ethereum price change
	if analysis.ETH != nil {
		baseline := economicBaseline["eth"]
		percentChange := analysis.ETH.Value
		if analysis.ETH.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.ETH.Min / 100
		maxChange := baseline * analysis.ETH.Max / 100
		if analysis.ETH.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.ETHPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "$",
		}
		// Update global economic status
		economicBaseline["eth"] = analysis.ETHPriceChange.NewPrice
		logger.Printf("[Economy] ETH updated: %.2f → %.2f (%.2f%%)", baseline, analysis.ETHPriceChange.NewPrice, percentChange)
	}

	// S&P 500 change
	if analysis.SPX != nil {
		baseline := economicBaseline["spx"]
		percentChange := analysis.SPX.Value
		if analysis.SPX.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.SPX.Min / 100
		maxChange := baseline * analysis.SPX.Max / 100
		if analysis.SPX.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.SPXPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "pts",
		}
		// Update global economic status
		economicBaseline["spx"] = analysis.SPXPriceChange.NewPrice
		logger.Printf("[Economy] S&P 500 updated: %.2f → %.2f (%.2f%%)", baseline, analysis.SPXPriceChange.NewPrice, percentChange)
	}

	// Hang Seng change
	if analysis.HSI != nil {
		baseline := economicBaseline["hsi"]
		percentChange := analysis.HSI.Value
		if analysis.HSI.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.HSI.Min / 100
		maxChange := baseline * analysis.HSI.Max / 100
		if analysis.HSI.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.HSIPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "pts",
		}
		// Update global economic status
		economicBaseline["hsi"] = analysis.HSIPriceChange.NewPrice
		logger.Printf("[Economy] Hang Seng updated: %.2f → %.2f (%.2f%%)", baseline, analysis.HSIPriceChange.NewPrice, percentChange)
	}

	// FTSE 100 change
	if analysis.FTSE != nil {
		baseline := economicBaseline["ftse"]
		percentChange := analysis.FTSE.Value
		if analysis.FTSE.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.FTSE.Min / 100
		maxChange := baseline * analysis.FTSE.Max / 100
		if analysis.FTSE.Direction == "down" {
			minChange = -minChange
			maxChange = -maxChange
		}
		analysis.FTSEPriceChange = &PriceChange{
			Baseline:      baseline,
			PercentChange: percentChange,
			MinChange:     math.Round(minChange*100) / 100,
			MaxChange:     math.Round(maxChange*100) / 100,
			NewPrice:      math.Round((baseline+priceChange)*100) / 100,
			Currency:      "pts",
		}
		// Update global economic status
		economicBaseline["ftse"] = analysis.FTSEPriceChange.NewPrice
		logger.Printf("[Economy] FTSE 100 updated: %.2f → %.2f (%.2f%%)", baseline, analysis.FTSEPriceChange.NewPrice, percentChange)
	}
}

// makeDecision integrated decision logic (based on Agent personality, military power, relations, allies, and other factors)
func makeDecision(agentID, action, targetID string, myData, targetData *Role) *AgentDecision {
	// 1. Calculate military power comparison
	myPower := myData.Attributes.Army + myData.Attributes.AirForce + myData.Attributes.Navy
	targetPower := targetData.Attributes.Army + targetData.Attributes.AirForce + targetData.Attributes.Navy
	powerRatio := float64(myPower) / float64(targetPower)

	// 2. Get bilateral relations (if available)
	relation, _ := db.GetRelation(agentID, targetID)
	relationshipScore := 0.5 // Default neutral
	if relation != nil {
		relationshipScore = (float64(relation.Value) + 100.0) / 200.0 // Normalize to 0-1
	}

	// 3. Calculate economic cost (GDP loss estimate)
	economicCost := calculateEconomicCost(myData, targetData, action)

	// 4. Assess ally attitude
	allySupport := calculateAllySupport(agentID, targetID, action)

	// 5. Assess domestic stability impact
	domesticImpact := calculateDomesticImpact(myData, action)

	// 6. Weight by Agent personality
	personalityWeights := getPersonalityWeights(agentID)

	// Composite score (0-1)
	score := powerRatio * 0.35 * personalityWeights.military
	score += (1.0 - relationshipScore) * 0.25 * personalityWeights.diplomatic
	score += (1.0 - economicCost) * 0.20 * personalityWeights.economic
	score += allySupport * 0.10 * personalityWeights.ally
	score += domesticImpact * 0.10 * personalityWeights.domestic

	// Decision threshold
	threshold := personalityWeights.threshold

	// Special scenario adjustments
	if action == "declare_war" {
		// Israel vs Iran: zero tolerance for nuclear threat
		if (agentID == "israel" || agentID == "netanyahu") && (targetID == "iran" || targetID == "irn") {
			threshold = 0.25
			score += 0.3 // Extra score
		}
		// USA vs Iran: moderate inclination
		if (agentID == "usa" || agentID == "trump") && (targetID == "iran" || targetID == "irn") {
			threshold = 0.40
		}
	}

	if action == "sanction" {
		// Sanctions have low cost, lower threshold
		threshold -= 0.15
	}

	if action == "military_exercise" {
		// Military exercise has low threat, lower threshold
		threshold -= 0.20
	}

	// Ensure threshold is within reasonable range
	if threshold < 0.2 {
		threshold = 0.2
	}
	if threshold > 0.8 {
		threshold = 0.8
	}

	execute := score > threshold

	// Generate detailed analysis
	analysis := generateDetailedAnalysis(powerRatio, relationshipScore, economicCost, allySupport, domesticImpact, score, threshold, agentID, action, targetID)

	// Generate concise reason
	reason := generateConciseReason(execute, score, threshold, action, targetID, agentID)

	confidence := "medium"
	if score > threshold+0.2 {
		confidence = "high"
	} else if score < threshold-0.2 {
		confidence = "low"
	}

	return &AgentDecision{
		Execute:    execute,
		Reason:     reason,
		Analysis:   analysis,
		Conditions: generateConditions(execute, action, targetID),
		Confidence: confidence,
	}
}

// PersonalityWeights holds personality weights for Agent
type PersonalityWeights struct {
	military      float64 // Military weight
	diplomatic    float64 // Diplomatic weight
	economic      float64 // Economic weight
	ally          float64 // Ally weight
	domestic      float64 // Domestic weight
	threshold     float64 // Decision threshold
	riskTolerance float64 // Risk tolerance
}

// getPersonalityWeights gets personality weights by Agent ID
func getPersonalityWeights(agentID string) PersonalityWeights {
	// Default weights
	defaultWeights := PersonalityWeights{
		military:      1.0,
		diplomatic:    1.0,
		economic:      1.0,
		ally:          1.0,
		domestic:      1.0,
		threshold:     0.6,
		riskTolerance: 0.5,
	}

	// USA (Trump): high risk appetite, military priority, economic second
	if agentID == "usa" || agentID == "trump" {
		return PersonalityWeights{
			military:      1.3,
			diplomatic:    0.8,
			economic:      0.7,
			ally:          0.9,
			domestic:      1.2,
			threshold:     0.50,
			riskTolerance: 0.8,
		}
	}

	// Iran: cautious, values allies, economically sensitive
	if agentID == "iran" || agentID == "mujtaba" {
		return PersonalityWeights{
			military:      1.0,
			diplomatic:    1.2,
			economic:      1.1,
			ally:          1.3,
			domestic:      1.0,
			threshold:     0.65,
			riskTolerance: 0.6,
		}
	}

	// Israel: military priority, high existential anxiety
	if agentID == "israel" || agentID == "netanyahu" {
		return PersonalityWeights{
			military:      1.5,
			diplomatic:    0.7,
			economic:      0.6,
			ally:          1.0,
			domestic:      1.1,
			threshold:     0.55,
			riskTolerance: 0.75,
		}
	}

	return defaultWeights
}

// calculateEconomicCost calculates economic cost (0-1, 1 means maximum cost)
func calculateEconomicCost(myData, targetData *Role, action string) float64 {
	// Simplified calculation: based on GDP and trade relations
	myGDP := float64(myData.Attributes.Economy)
	targetGDP := float64(targetData.Attributes.Economy)

	if action == "declare_war" {
		// War has high cost
		return 0.6 + (targetGDP/(myGDP+targetGDP))*0.4
	}
	if action == "sanction" {
		// Sanctions have moderate cost
		return 0.3 + (targetGDP/(myGDP+targetGDP))*0.3
	}
	if action == "military_exercise" {
		// Military exercise has low cost
		return 0.1
	}
	return 0.2
}

// calculateAllySupport calculates ally support level (0-1)
func calculateAllySupport(agentID, targetID, action string) float64 {
	// Simplified: judge by camp
	proWestern := []string{"usa", "israel", "saudi", "uae", "uk", "france"}

	isAgentWestern := contains(proWestern, agentID)
	isTargetWestern := contains(proWestern, targetID)

	if action == "declare_war" {
		if isAgentWestern && !isTargetWestern {
			return 0.8 // Western support
		}
		if !isAgentWestern && isTargetWestern {
			return 0.3 // Lack of support
		}
	}
	return 0.5 // Neutral
}

// calculateDomesticImpact calculates domestic stability impact (0-1)
func calculateDomesticImpact(myData *Role, action string) float64 {
	stability := float64(myData.Attributes.Stability) / 100.0

	if action == "declare_war" {
		// War can increase or decrease stability
		return 0.5 + (stability-0.5)*0.5
	}
	if action == "sanction" {
		// Sanctions usually have domestic support
		return 0.7
	}
	return 0.6
}

// generateDetailedAnalysis generates detailed analysis report
func generateDetailedAnalysis(powerRatio, relationshipScore, economicCost, allySupport, domesticImpact, score, threshold float64, agentID, action, targetID string) string {
	analysis := fmt.Sprintf("📊 Comprehensive Decision Analysis:\n\n")
	analysis += fmt.Sprintf("⚔️ Military Balance: %.2f (weight 35%%)\n", powerRatio)
	analysis += fmt.Sprintf("🤝 Relationship Score: %.1f/100 (weight 25%%)\n", (relationshipScore * 100))
	analysis += fmt.Sprintf("💰 Economic Cost: %.1f/100 (weight 20%%)\n", (economicCost * 100))
	analysis += fmt.Sprintf("🌍 Ally Support: %.1f/100 (weight 10%%)\n", (allySupport * 100))
	analysis += fmt.Sprintf("🏛️ Domestic Impact: %.1f/100 (weight 10%%)\n\n", (domesticImpact * 100))
	analysis += fmt.Sprintf("📈 Composite Score: %.2f\n", score)
	analysis += fmt.Sprintf("🎯 Decision Threshold: %.2f\n", threshold)

	// Add Agent-specific analysis
	if agentID == "usa" || agentID == "trump" {
		analysis += "\n🇺🇸 Trump considerations: midterm elections, domestic approval rating, Israeli security"
	}
	if agentID == "iran" || agentID == "mujtaba" {
		analysis += "\n🇮🇷 Iran considerations: regime survival, proxy network, nuclear program"
	}
	if agentID == "israel" || agentID == "netanyahu" {
		analysis += "\n🇮🇱 Israel considerations: existential threat, nuclear risk, US support"
	}

	return analysis
}

// generateConciseReason generates concise reason
func generateConciseReason(execute bool, score, threshold float64, action, targetID, agentID string) string {
	if execute {
		return fmt.Sprintf("✅ Execute, composite score %.2f exceeds threshold %.2f, action is feasible", score, threshold)
	}
	return fmt.Sprintf("❌ Postpone, composite score %.2f doesn't reach threshold %.2f, risk too high", score, threshold)
}

// generateConditions generates execution conditions or recommendations
func generateConditions(execute bool, action, targetID string) string {
	if !execute {
		return "Recommendation: Strengthen diplomatic mediation, wait for better timing, or consider alternatives (sanctions, military exercise)"
	}

	if action == "declare_war" {
		return "Recommendation: Set limited objectives, avoid prolonged war, prepare for retaliation"
	}
	if action == "sanction" {
		return "Recommendation: Join with allies to maximize effect"
	}
	if action == "military_exercise" {
		return "Recommendation: Choose appropriate scale, avoid excessive provocation"
	}
	return ""
}

// contains checks if slice contains an element
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Chat room API handler
func handleChatRooms(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		// Get chat room list
		rooms, err := db.GetChatRooms()
		if err != nil {
			http.Error(w, `{"error": "Failed to get chat rooms"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"rooms": rooms,
		})

	case "POST":
		// Create chat room
		var req struct {
			Name          string `json:"name"`
			CreatorID     string `json:"creator_id"`
			CreatorRoleID string `json:"creator_role_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
			return
		}

		if req.Name == "" {
			http.Error(w, `{"error": "Room name cannot be empty"}`, http.StatusBadRequest)
			return
		}

		// Get current user info - priority from header/JWT, otherwise from JSON body
		playerID := r.Header.Get("X-Player-ID")
		if playerID == "" {
			// Try to get from JWT
			claims := r.Context().Value("claims")
			if claimsMap, ok := claims.(map[string]interface{}); ok {
				playerID, _ = claimsMap["player_id"].(string)
			}
		}
		// If neither header/JWT, use creator_id from JSON body
		if playerID == "" {
			playerID = req.CreatorID
		}

		// Get user role
		roleID, _ := db.GetPlayerRole(playerID)
		// If not in database, use creator_role_id from JSON body
		if roleID == "" {
			roleID = req.CreatorRoleID
		}

		room, err := db.CreateChatRoom(req.Name, playerID, roleID)
		if err != nil {
			http.Error(w, `{"error": "Failed to create chat room"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"room":    room,
			"message": "Chat room created successfully",
		})

	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// Chat message API handler
func handleChatMessages(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		// Get message history
		roomID := r.URL.Query().Get("room_id")
		// If no room_id specified, default to world channel "world"
		if roomID == "" {
			roomID = "world"
		}
		limit := r.URL.Query().Get("limit")
		if limit == "" {
			limit = "50"
		}
		limitInt, _ := strconv.Atoi(limit)
		if limitInt <= 0 || limitInt > 200 {
			limitInt = 50
		}

		messages, err := db.GetChatMessages(roomID, limitInt)
		if err != nil {
			http.Error(w, `{"error": "Failed to get messages"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"messages": messages,
			"room_id":  roomID,
		})

	default:
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// Agent public channel speaking
func handlePublicChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		From      string `json:"from"`
		Content   string `json:"content"`
		Type      string `json:"type"`
		Timestamp string `json:"timestamp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.From == "" || req.Content == "" {
		http.Error(w, `{"error": "Sender and content cannot be empty"}`, http.StatusBadRequest)
		return
	}

	// Log to logger
	logger.Printf("💬 [World Channel] %s: %s", req.From, req.Content)

	// Save to database (world channel room_id = "world")
	msgType := req.Type
	if msgType == "" {
		msgType = "public"
	}
	if err := db.SaveChatMessage("world", req.From, "", req.Content, msgType); err != nil {
		logger.Printf("⚠️ Failed to save public message: %v", err)
	}

	// Broadcast to all WebSocket clients
	if hub != nil {
		msgJSON, _ := json.Marshal(WebSocketMessage{
			Type:      "world_message",
			From:      req.From,
			Content:   req.Content,
			Timestamp: time.Now().Format(time.RFC3339),
		})
		hub.broadcast <- msgJSON
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Message sent",
	})
}

// Agent private channel speaking
func handlePrivateChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		From      string   `json:"from"`
		Channel   string   `json:"channel"`
		Content   string   `json:"content"`
		To        []string `json:"to"`
		Timestamp string   `json:"timestamp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.From == "" || req.Channel == "" || req.Content == "" {
		http.Error(w, `{"error": "Sender, channel, and content cannot be empty"}`, http.StatusBadRequest)
		return
	}

	// Log to logger
	logger.Printf("🔒 [%s] %s: %s", req.Channel, req.From, req.Content)

	// Save to database
	if err := db.SaveChatMessage(req.Channel, req.From, "", req.Content, "private"); err != nil {
		logger.Printf("⚠️ Failed to save private message: %v", err)
	}

	// If WebSocket exists, send to channel members
	if hub != nil {
		msgJSON, _ := json.Marshal(WebSocketMessage{
			Type:      "private",
			From:      req.From,
			Channel:   req.Channel,
			Content:   req.Content,
			Timestamp: time.Now().Format(time.RFC3339),
		})
		hub.broadcast <- msgJSON
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Private message sent",
	})
}

// Create private channel
func handleCreateChannel(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Creator     string   `json:"creator"`
		ChannelName string   `json:"channelName"`
		Members     []string `json:"members"`
		CreatedAt   string   `json:"createdAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.Creator == "" || req.ChannelName == "" {
		http.Error(w, `{"error": "Creator and channel name cannot be empty"}`, http.StatusBadRequest)
		return
	}

	// Create chat room
	room, err := db.CreateChatRoom(req.ChannelName, req.Creator, "")
	if err != nil {
		http.Error(w, `{"error": "Failed to create channel"}`, http.StatusInternalServerError)
		return
	}

	logger.Printf("📢 [%s] Created private channel: %s", req.Creator, req.ChannelName)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"channelId": room["id"],
		"channel":   req.ChannelName,
		"creator":   req.Creator,
		"members":   req.Members,
		"message":   "Channel created successfully",
	})
}

// Get recent chat messages
func handleRecentChats(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	agent := r.URL.Query().get("agent")
	limit := r.URL.Query().Get("limit")
	msgType := r.URL.Query().Get("type")

	if limit == "" {
		limit = "20"
	}
	limitInt, _ := strconv.Atoi(limit)
	if limitInt <= 0 || limitInt > 100 {
		limitInt = 20
	}

	// Default to getting world channel messages
	roomID := "world"
	if msgType == "private" {
		// Private messages require channel specification
		roomID = r.URL.Query().Get("channel")
	}

	messages, err := db.GetChatMessages(roomID, limitInt)
	if err != nil {
		http.Error(w, `{"error": "Failed to get messages"}`, http.StatusInternalServerError)
		return
	}

	logger.Printf("📜 %s got last %d messages", agent, len(messages))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
