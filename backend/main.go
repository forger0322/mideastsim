package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
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

// WebSocketMessage WebSocket 消息
type WebSocketMessage struct {
	Type      string      `json:"type"`      // "public" | "private"
	From      string      `json:"from"`      // 发送者
	RoleID    string      `json:"role_id"`   // 发送者绑定的角色 ID（如 UAE, USA）
	Channel   string      `json:"channel"`   // 频道/目标
	Content   string      `json:"content"`   // 消息内容
	Data      interface{} `json:"data"`      // 附加数据
	Timestamp string      `json:"timestamp"` // 时间戳
}

func main() {
	// 加载环境变量
	godotenv.Load()

	// 初始化日志
	logger = log.New(os.Stdout, "[MideastSim] ", log.LstdFlags|log.Lshortfile)
	logger.Println("🚀 启动 MideastSim 后端...")

	// 🆕 初始化随机种子
	rand.Seed(time.Now().UnixNano())

	// 初始化数据库
	dbPath := getEnv("DATABASE_PATH", "./mideastsim.db")
	var err error
	db, err = NewDatabase(dbPath)
	if err != nil {
		logger.Fatalf("❌ 数据库初始化失败：%v", err)
	}
	defer db.Close()

	// 初始化数据库表结构
	if err := db.InitSchema(); err != nil {
		logger.Printf("⚠️ 数据库表结构初始化警告：%v", err)
	}

	// 数据库迁移：添加中文字段
	if err := db.MigrateAddChineseFields(); err != nil {
		logger.Printf("⚠️ 数据库迁移警告：%v", err)
	}

	// 初始化认证服务
	jwtSecret := []byte(getEnv("JWT_SECRET", "mideastsim-secret-key-change-in-production"))
	jwtTTL := 24 * time.Hour
	authService := NewAuthService(jwtSecret, jwtTTL)

	// 初始化 session store
	sessionStore := NewSessionStore()

	// 初始化玩家服务
	playerService := NewPlayerService(db, authService, sessionStore)

	// 初始化 WebSocket Hub
	hub = NewWebSocketHub()
	go hub.run()

	// 初始化规则引擎
	ruleEngine = NewRuleEngine(db)

	// 🆕 初始化 Telegram Bot（PM Agent 通知）
	initTelegram()

	// 🆕 设置 Telegram Webhook（获取 Chat ID）
	webhookURL := getEnv("TELEGRAM_WEBHOOK_URL", "")
	if webhookURL != "" && telegramBot != nil {
		if err := setTelegramWebhook(webhookURL); err != nil {
			logger.Printf("[Telegram] ⚠️ Webhook 设置失败：%v", err)
			logger.Printf("[Telegram] 💡 使用 /api/telegram/getUpdates 手动获取 Chat ID")
		}
	}

	// 🆕 初始化 Agent 记忆系统
	if err := db.CreateAgentMemoryTable(); err != nil {
		logger.Printf("⚠️ Agent 记忆表初始化警告：%v", err)
	}

	// 🆕 初始化离线 AI 管理器
	offlineAI := NewOfflineAIManager(db)
	if err := offlineAI.InitializeOfflineAI(); err != nil {
		logger.Printf("⚠️ 离线 AI 初始化警告：%v", err)
	}

	// 🆕 加载 Agent 会话配置
	if err := loadAgentSessions(); err != nil {
		logger.Printf("⚠️ Agent 会话配置加载失败：%v", err)
		logger.Printf("⚠️ 将使用默认 session key 格式：agent:{id}:main")
	}

	// 初始化领导人数据
	if err := db.InitDefaultLeaders(); err != nil {
		logger.Printf("⚠️ 领导人数据初始化警告：%v", err)
	}

	// 设置路由
	http.HandleFunc("/api/auth/register", playerService.Register)
	http.HandleFunc("/api/auth/login", playerService.Login)
	http.HandleFunc("/api/auth/me", JWTMiddleware(authService, playerService.GetPlayerInfo))

	http.HandleFunc("/api/roles/available", JWTMiddleware(authService, playerService.GetAvailableRoles))
	http.HandleFunc("/api/roles/claim", JWTMiddleware(authService, playerService.ClaimRole))
	http.HandleFunc("/api/roles/release", JWTMiddleware(authService, playerService.ReleaseRole))

	// Admin API - 重置所有角色绑定（开发用）
	http.HandleFunc("/api/admin/reset-roles", handleResetRoles)

	// 国家信息查询
	http.HandleFunc("/api/roles/info", handleRoleInfo)
	http.HandleFunc("/api/roles", handleAllRoles)

	// 领导人信息
	http.HandleFunc("/api/leaders", handleAllLeaders)
	http.HandleFunc("/api/leaders/info", handleLeaderInfo)

	// 行动 API（需要已选择国家）
	http.HandleFunc("/api/actions/execute", JWTMiddleware(authService, ruleEngine.HandleAction))

	// Agent 指令 API（玩家发送指令给 Agent，Agent 自主决策）
	http.HandleFunc("/api/agent/command", JWTMiddleware(authService, handleAgentCommand))

	// PM Agent 经济影响分析 API
	http.HandleFunc("/api/agent/pm/analyze", JWTMiddleware(authService, handlePMAnalyze))

	// 🆕 PM Agent 回调 API（PM Agent 分析完成后调用此接口返回结果）
	http.HandleFunc("/api/agent/pm/callback", handlePMCallback)

	// 🆕 Agent 记忆 API
	http.HandleFunc("/api/agent/memory", JWTMiddleware(authService, handleAgentMemory))
	http.HandleFunc("/api/agent/memory/list", JWTMiddleware(authService, handleAgentMemoryList))

	// 🆕 离线 AI 状态 API
	http.HandleFunc("/api/ai/offline/status", handleAIOfflineStatus)

	// 📲 Telegram Webhook API
	http.HandleFunc("/api/telegram/webhook", handleTelegramWebhook)
	http.HandleFunc("/api/telegram/getUpdates", handleTelegramGetUpdates)

	// 🎬 历史回放 API
	http.HandleFunc("/api/history/events", handleGetHistory)
	http.HandleFunc("/api/history/event", handleGetEventDetail)
	http.HandleFunc("/api/history/snapshot", handlePlaybackSnapshot)
	http.HandleFunc("/api/history/timeline", handleGetTimeline)

	// 世界频道声明 API（Agent 发送公开声明）
	http.HandleFunc("/api/world/actions/declare", handleDeclareStatement)

	http.HandleFunc("/api/world/state", handleWorldState)
	http.HandleFunc("/api/world/events", handleEvents)
	http.HandleFunc("/api/world/relations", handleRelations)
	http.HandleFunc("/api/world/wars", handleWars)

	// 静态文件服务（领导人照片）
	imgPath := "/home/node/.openclaw/workspace/mideastsim/img"
	fs := http.FileServer(http.Dir(imgPath))
	http.Handle("/img/", http.StripPrefix("/img/", fs))

	http.HandleFunc("/ws", handleWebSocket)

	// 健康检查
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":         "ok",
			"time":           time.Now().Format(time.RFC3339),
			"online_players": sessionStore.Count(),
		})
	})

	// 添加 CORS 中间件包装所有路由
	corsHandler := CORSMiddleware(http.DefaultServeMux)

	// 启动后台任务
	go simulationLoop(db)

	// 🆕 启动离线 AI 定时任务 (每 5 分钟执行一次 AI 决策)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			offlineAI.ExecuteAIActions(ruleEngine)
		}
	}()

	// 🆕 启动记忆清理定时任务 (每小时清理过期记忆)
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			db.DeleteExpiredAgentMemories()
		}
	}()

	// 启动服务器
	port := getEnv("PORT", "8080")
	host := getEnv("HOST", "0.0.0.0")
	addr := fmt.Sprintf("%s:%s", host, port)
	logger.Printf("🌐 服务器监听于 http://%s%s", host, addr)
	logger.Printf("📊 在线玩家数：%d", sessionStore.Count())

	if err := http.ListenAndServe(addr, corsHandler); err != nil {
		logger.Fatalf("❌ 服务器启动失败：%v", err)
	}
}

// 辅助函数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// simulationLoop 后台模拟循环
func simulationLoop(db *Database) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// ⚠️ 随机事件生成已禁用 - 事件由 AI Agent 行动生成
		// generateRandomEvent(db)

		// 更新关系
		updateRelations(db)

		// 广播世界状态更新
		broadcastWorldState()
	}
}

// generateRandomEvent 生成随机事件
func generateRandomEvent(db *Database) {
	// 所有国家/地点（14 个中东国家）
	locations := []string{
		"Tehran", "Jerusalem", "Riyadh", "Damascus", "Baghdad",
		"Abu Dhabi", "Cairo", "Ankara", "Amman", "Beirut",
		"Doha", "Kuwait City", "Muscat", "Sanaa", "Ramallah",
	}

	// 中英文地点名称
	locationNames := map[string]map[string]string{
		"Tehran":       {"zh": "德黑兰", "en": "Tehran"},
		"Jerusalem":    {"zh": "耶路撒冷", "en": "Jerusalem"},
		"Riyadh":       {"zh": "利雅得", "en": "Riyadh"},
		"Damascus":     {"zh": "大马士革", "en": "Damascus"},
		"Baghdad":      {"zh": "巴格达", "en": "Baghdad"},
		"Abu Dhabi":    {"zh": "阿布扎比", "en": "Abu Dhabi"},
		"Cairo":        {"zh": "开罗", "en": "Cairo"},
		"Ankara":       {"zh": "安卡拉", "en": "Ankara"},
		"Amman":        {"zh": "安曼", "en": "Amman"},
		"Beirut":       {"zh": "贝鲁特", "en": "Beirut"},
		"Doha":         {"zh": "多哈", "en": "Doha"},
		"Kuwait City":  {"zh": "科威特城", "en": "Kuwait City"},
		"Muscat":       {"zh": "马斯喀特", "en": "Muscat"},
		"Sanaa":        {"zh": "萨那", "en": "Sanaa"},
		"Ramallah":     {"zh": "拉马拉", "en": "Ramallah"},
	}

	// 事件类型
	eventTypes := []string{"diplomacy", "military", "economic"}
	eventType := eventTypes[rand.Intn(len(eventTypes))]

	// 随机选择地点
	location := locations[rand.Intn(len(locations))]

	// 根据事件类型随机选择标题（每个类型多个选项）
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

	// 中英文事件类型描述
	eventTypeDesc := map[string]map[string]string{
		"diplomacy": {"zh": "外交", "en": "diplomatic"},
		"military":  {"zh": "军事", "en": "military"},
		"economic":  {"zh": "经济", "en": "economic"},
	}

	// 更自然的事件描述
	description := fmt.Sprintf("A %s event has been reported in %s, reflecting ongoing regional developments.", eventTypeDesc[eventType]["en"], location)
	descriptionZh := fmt.Sprintf("%s发生%s事件，反映地区局势持续发展。", locationNames[location]["zh"], eventTypeDesc[eventType]["zh"])

	// 🆕 去重检查：检查最近 5 分钟内是否已生成相同标题的事件
	recentEvents, err := db.GetRecentEvents(20)
	if err == nil {
		fiveMinutesAgo := time.Now().Add(-5 * time.Minute)
		for _, recentEvent := range recentEvents {
			if recentEvent.Timestamp.After(fiveMinutesAgo) &&
				recentEvent.Title == title {
				// 重复事件，跳过生成
				logger.Printf("⚠️ 跳过重复事件：%s (生成于 %v 前)",
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

	// 为事件生成 PM 经济影响分析（通过 PM Agent）
	go func() {
		req := PMAnalyzeRequest{
			EventID:     event.ID,
			EventType:   event.Type,
			Location:    event.Location,
			Title:       event.Title,
			Description: event.Description,
		}

		// 调用 PM Agent 进行分析
		analysis := analyzeEventViaPMAgent(req)
		if analysis != nil {
			calculatePriceChanges(analysis)

			// 将 PM 分析存入事件 Data 字段
			eventData := make(map[string]interface{})
			eventData["pm_analysis"] = analysis
			db.UpdateEventData(event.ID, eventData)

			logger.Printf("✅ [PM Agent] 事件 %s 分析完成", event.ID)
		}
	}()

	// 先创建事件（不带 PM 分析，分析完成后异步更新）
	db.CreateEvent(event)
}

// updateRelations 更新关系
func updateRelations(db *Database) {
	// 简单的关系波动逻辑
	relations, _ := db.GetAllRelations()
	for _, rel := range relations {
		// 随机波动
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

// broadcastWorldState 广播世界状态
func broadcastWorldState() {
	state := getWorldState()
	data, _ := json.Marshal(state)

	hub.broadcast <- data
}

// getWorldState 获取世界状态
func getWorldState() map[string]interface{} {
	// 从数据库获取最新状态
	roles, _ := db.GetAllRoles()
	events, _ := db.GetRecentEvents(10)
	relations, _ := db.GetAllRelations()
	wars, _ := db.GetActiveWars()
	leaders, err := db.GetAllLeaders()
	if err != nil {
		log.Printf("⚠️ 获取领导人失败：%v", err)
	}

	// 构建 role_id 到领导人的映射
	leaderMap := make(map[string]map[string]interface{})
	for _, l := range leaders {
		if l.IsAlive {
			// 使用 GetLeaderByRoleID 来获取正确的角色 ID 映射
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

	// 创建角色 ID 到 role_id 的映射（三字码 -> 英文全称）
	roleCodeMap := map[string]string{
		"EGY": "egypt", "IRN": "iran", "ISR": "israel", "SAU": "saudi_arabia",
		"TUR": "turkey", "SYR": "syria", "IRQ": "iraq", "JOR": "jordan",
		"QAT": "qatar", "UAE": "uae", "KWT": "kuwait", "BHR": "bahrain",
		"OMN": "oman", "YEM": "yemen", "LBN": "lebanon", "PSE": "palestine",
		"USA": "usa", "RUS": "russia", "CHN": "china",
	}

	// 为每个角色添加领导人信息
	for _, role := range roles {
		if roleID, ok := roleCodeMap[role.ID]; ok {
			if leader, ok := leaderMap[roleID]; ok {
				role.Leader = leader
			}
		}
	}

	// 获取当前经济数据
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

// HTTP 处理函数
func handleWorldState(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(getWorldState())
}

func handleEvents(w http.ResponseWriter, r *http.Request) {
	limit := 20
	events, err := db.GetRecentEvents(limit)
	if err != nil {
		http.Error(w, `{"error":"查询失败"}`, http.StatusInternalServerError)
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
		http.Error(w, `{"error":"查询失败"}`, http.StatusInternalServerError)
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
		http.Error(w, `{"error":"查询失败"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"wars":  wars,
		"total": len(wars),
	})
}

// DeclareStatementRequest 声明请求
type DeclareStatementRequest struct {
	Content    string `json:"content"`
	ContentZh  string `json:"content_zh"`  // 中文内容（可选）
	Type       string `json:"type"`        // diplomacy, military, economic
	Location   string `json:"location"`    // 可选，默认自动
	LocationZh string `json:"location_zh"` // 中文地点（可选）
	AgentID    string `json:"agent_id"`    // Agent 标识
	RoleID     string `json:"role_id"`     // 国家/角色 ID（如 USA, IRN）
}

// 中英文地点映射
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

// handleDeclareStatement 处理公开声明
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

	// 默认类型
	if req.Type == "" {
		req.Type = "diplomacy"
	}

	// 默认地点
	if req.Location == "" {
		locations := []string{"Washington", "Tehran", "Jerusalem", "Riyadh", "Damascus"}
		req.Location = locations[time.Now().Unix()%int64(len(locations))]
	}

	// 中文地点
	locationZh := req.LocationZh
	if locationZh == "" {
		if names, ok := locationNames[req.Location]; ok {
			locationZh = names["zh"]
		} else {
			locationZh = req.Location
		}
	}

	// 中文内容（如果没有提供，使用英文内容）
	contentZh := req.ContentZh
	if contentZh == "" {
		contentZh = req.Content
	}

	// 创建事件
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
		logger.Printf("❌ 创建事件失败：%v", err)
		http.Error(w, `{"error":"Failed to create event"}`, http.StatusInternalServerError)
		return
	}

	// 构建 WebSocket 消息
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

	// 广播消息
	if msgBytes, err := json.Marshal(wsMsg); err == nil {
		hub.broadcast <- msgBytes
		logger.Printf("📢 [声明] %s (%s): %s", req.AgentID, req.RoleID, req.Content)

		// 转发给 Agent（去重检查在 ForwardMessage 中）
		go ForwardMessage(wsMsg)
	}

	logger.Printf("✅ [声明] 事件已创建：%s", event.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"message":   "声明已发送",
		"event_id":  event.ID,
		"timestamp": event.Timestamp.Format(time.RFC3339),
	})
}

// handleAllRoles 处理所有国家列表（排行榜）
func handleAllRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := db.GetAllRoles()
	if err != nil {
		http.Error(w, `{"error":"获取国家列表失败"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"roles": roles,
	})
}

// handleRoleInfo 处理国家信息查询
func handleRoleInfo(w http.ResponseWriter, r *http.Request) {
	roleID := r.URL.Query().Get("id")
	if roleID == "" {
		http.Error(w, `{"error":"需要提供国家 ID"}`, http.StatusBadRequest)
		return
	}

	role, err := db.GetRoleByID(roleID)
	if err != nil {
		http.Error(w, `{"error":"国家不存在"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"role": role,
	})
}

// handleAllLeaders 处理所有领导人列表
func handleAllLeaders(w http.ResponseWriter, r *http.Request) {
	leaders, err := db.GetAllLeaders()
	if err != nil {
		http.Error(w, `{"error":"获取领导人列表失败"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"leaders": leaders,
		"total":   len(leaders),
	})
}

// handleLeaderInfo 处理领导人信息查询
func handleLeaderInfo(w http.ResponseWriter, r *http.Request) {
	leaderID := r.URL.Query().Get("id")
	roleID := r.URL.Query().Get("role_id")

	var leader *Leader
	var err error

	if leaderID != "" {
		// 通过领导人 ID 查询（需要额外实现）
		http.Error(w, `{"error":"暂不支持通过 ID 查询"}`, http.StatusNotImplemented)
		return
	} else if roleID != "" {
		leader, err = db.GetLeaderByRoleID(roleID)
		if err != nil {
			http.Error(w, `{"error":"查询失败"}`, http.StatusInternalServerError)
			return
		}
		if leader == nil {
			http.Error(w, `{"error":"该国家没有领导人信息"}`, http.StatusNotFound)
			return
		}
	} else {
		http.Error(w, `{"error":"需要提供领导人 ID 或国家 ID"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"leader": leader,
	})
}

// WebSocket 处理
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
		return true // 允许所有来源（生产环境应该限制）
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
		logger.Println("WebSocket 升级失败:", err)
		return
	}

	// 获取 agentID（从 URL 参数或 header）
	agentID := r.URL.Query().Get("agentId")
	if agentID == "" {
		agentID = r.Header.Get("X-Agent-ID")
	}

	logger.Printf("🔌 [WebSocket] 新连接：%s", agentID)

	client := &WebSocketClient{
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, 256),
		agentID: agentID,
	}

	client.hub.register <- client

	// 启动写入协程
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
				// 发送通道关闭，立即关闭连接
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
				logger.Printf("⚠️ [WebSocket] 读取错误（意外关闭）：%v", err)
			} else {
				logger.Printf("⚠️ [WebSocket] 读取错误：%v", err)
			}
			break
		}

		logger.Printf("📨 [WebSocket] 收到消息 (TEST BUILD v2)：%s", string(message))

		// 解析消息并广播
		var msg WebSocketMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			logger.Printf("❌ [WebSocket] 解析失败：%v", err)
			continue
		}

		logger.Printf("✅ [WebSocket] 消息类型：%s, 内容：%s", msg.Type, msg.Content)

		// 添加发送者信息
		msg.From = c.agentID
		if msg.From == "" {
			msg.From = "anonymous"
		}

		// === DEBUG: 角色查询 ===
		logger.Printf("🔍 [DEBUG] 开始查询角色，msg.From=%s", msg.From)
		roleID, err := db.GetPlayerRole(msg.From)
		logger.Printf("🔍 [DEBUG] GetPlayerRole 返回：roleID=%s, err=%v", roleID, err)
		if err == nil && roleID != "" {
			msg.RoleID = roleID
			logger.Printf("🎭 [WebSocket] 玩家 %s 绑定角色：%s", msg.From, roleID)
		} else {
			logger.Printf("⚠️ [WebSocket] 玩家 %s 未绑定角色 (err=%v, roleID='%s')", msg.From, err, roleID)
		}
		logger.Printf("🔍 [DEBUG] 广播前 msg.RoleID=%s", msg.RoleID)
		// === END DEBUG ===

		msg.Timestamp = time.Now().UTC().Format(time.RFC3339)

		// 广播消息
		if msgBytes, err := json.Marshal(msg); err == nil {
			c.hub.broadcast <- msgBytes
			logger.Printf("📢 [WebSocket] 广播消息：%s (%s): %s", msg.From, msg.RoleID, msg.Content)
			logger.Printf("🔍 [DEBUG] 广播的原始 JSON: %s", string(msgBytes))
		} else {
			logger.Printf("❌ [WebSocket] 序列化失败：%v", err)
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

// NewWebSocketHub 创建 WebSocket Hub
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

// handleResetRoles 重置所有角色绑定（开发用）
func handleResetRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	result, err := db.db.Exec("UPDATE roles SET player_id = NULL")
	if err != nil {
		log.Printf("❌ 重置角色失败：%v", err)
		http.Error(w, fmt.Sprintf("重置失败：%v", err), http.StatusInternalServerError)
		return
	}

	rows, _ := result.RowsAffected()
	log.Printf("✅ 已重置 %d 个角色的绑定", rows)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("已重置 %d 个角色", rows),
	})
}

// AgentCommandRequest Agent 指令请求
type AgentCommandRequest struct {
	Action  string            `json:"action"`
	Target  string            `json:"target"`
	Params  map[string]string `json:"params,omitempty"`
	Content string            `json:"content,omitempty"`
}

// AgentDecision Agent 决策结果
type AgentDecision struct {
	Execute    bool   `json:"execute"`
	Reason     string `json:"reason"`
	Analysis   string `json:"analysis"`
	Conditions string `json:"conditions,omitempty"`
	Confidence string `json:"confidence"`
}

// handleAgentCommand 处理 Agent 指令（玩家发送指令给 Agent，Agent 自主决策）
func handleAgentCommand(w http.ResponseWriter, r *http.Request) {
	logger.Printf("[DEBUG] handleAgentCommand 收到请求：method=%s", r.Method)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AgentCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[ERROR] 请求解析失败：%v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[DEBUG] Agent 指令：action=%s, target=%s", req.Action, req.Target)

	// 从 JWT 上下文中获取玩家 ID
	playerIDVal := r.Context().Value("player_id")
	if playerIDVal == nil {
		logger.Printf("[ERROR] 缺少玩家 ID")
		http.Error(w, "Player ID required", http.StatusUnauthorized)
		return
	}
	playerID, ok := playerIDVal.(string)
	if !ok {
		logger.Printf("[ERROR] 玩家 ID 格式错误")
		http.Error(w, "Invalid player ID", http.StatusUnauthorized)
		return
	}

	logger.Printf("[DEBUG] 玩家 ID: %s", playerID)

	// 获取玩家控制的角色
	role, err := db.GetRoleByPlayerID(playerID)
	if err != nil {
		logger.Printf("[ERROR] 获取玩家角色失败：%v", err)
		http.Error(w, fmt.Sprintf("Failed to get player role: %v", err), http.StatusInternalServerError)
		return
	}

	if role == nil {
		logger.Printf("[ERROR] 玩家没有激活的角色")
		http.Error(w, "Player has no active role", http.StatusBadRequest)
		return
	}

	logger.Printf("[DEBUG] 玩家角色：%s (ID=%s)", role.Name, role.ID)

	// 获取决策所需数据
	myData, err := db.GetRoleByID(role.ID)
	if err != nil {
		logger.Printf("[ERROR] 获取己方数据失败：%v", err)
		http.Error(w, fmt.Sprintf("Failed to get my data: %v", err), http.StatusInternalServerError)
		return
	}

	targetData, err := db.GetRoleByID(req.Target)
	if err != nil {
		logger.Printf("[ERROR] 获取目标数据失败：%v", err)
		http.Error(w, fmt.Sprintf("Failed to get target data: %v", err), http.StatusNotFound)
		return
	}

	// Agent 决策逻辑
	decision := makeDecision(role.ID, req.Action, req.Target, myData, targetData)

	logger.Printf("🤖 [Agent 决策] %s → %s (%s): %v", role.ID, req.Action, req.Target, decision.Execute)

	// 如果决定执行，直接调用规则引擎执行行动
	if decision.Execute {
		var result *ActionResult
		var err error

		// 根据行动类型直接调用规则引擎方法
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
			logger.Printf("[ERROR] 未知行动类型：%s", req.Action)
			http.Error(w, fmt.Sprintf("Unknown action type: %s", req.Action), http.StatusBadRequest)
			return
		}

		if err != nil {
			logger.Printf("[ERROR] 行动执行失败：%v", err)
			http.Error(w, fmt.Sprintf("Action execution failed: %v", err), http.StatusInternalServerError)
			return
		}

		// 应用属性变化
		if len(result.Changes) > 0 {
			for _, change := range result.Changes {
				if err := db.UpdateRoleAttribute(change.TargetID, change.Attribute, change.NewValue); err != nil {
					logger.Printf("[ERROR] 更新属性失败：%v", err)
				}
			}
		}

		// 存储事件
		if result.NewEvent != nil {
			if err := db.InsertEvent(*result.NewEvent); err != nil {
				logger.Printf("[ERROR] 存储事件失败：%v", err)
			}
		}

		// 返回决策 + 执行结果
		response := map[string]interface{}{
			"decision":      decision,
			"action_result": result,
			"executed":      true,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// 决定不执行，返回决策结果
	response := map[string]interface{}{
		"decision": decision,
		"executed": false,
		"reason":   decision.Reason,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// PMAnalyzeRequest PM Agent 分析请求
type PMAnalyzeRequest struct {
	EventID     string `json:"event_id"`
	EventType   string `json:"event_type"`
	Location    string `json:"location"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

// PMAnalyzeResponse PM Agent 分析响应
type PMAnalyzeResponse struct {
	// 大宗商品
	Oil    *ImpactAnalysis `json:"oil,omitempty"`
	Gold   *ImpactAnalysis `json:"gold,omitempty"`
	Silver *ImpactAnalysis `json:"silver,omitempty"`
	// 加密货币
	BTC *ImpactAnalysis `json:"btc,omitempty"`
	ETH *ImpactAnalysis `json:"eth,omitempty"`
	// 股市
	SPX  *ImpactAnalysis `json:"spx,omitempty"`  // 标普 500
	HSI  *ImpactAnalysis `json:"hsi,omitempty"`  // 恒生
	FTSE *ImpactAnalysis `json:"ftse,omitempty"` // 富时 100
	// 总结
	Summary string `json:"summary"`
	// 具体价格变化（基于当前基准）
	OilPriceChange    *PriceChange `json:"oil_price_change,omitempty"`
	GoldPriceChange   *PriceChange `json:"gold_price_change,omitempty"`
	SilverPriceChange *PriceChange `json:"silver_price_change,omitempty"`
	BTCPriceChange    *PriceChange `json:"btc_price_change,omitempty"`
	ETHPriceChange    *PriceChange `json:"eth_price_change,omitempty"`
	SPXPriceChange    *PriceChange `json:"spx_price_change,omitempty"`
	HSIPriceChange    *PriceChange `json:"hsi_price_change,omitempty"`
	FTSEPriceChange   *PriceChange `json:"ftse_price_change,omitempty"`
}

// PriceChange 具体价格变化
type PriceChange struct {
	Baseline      float64 `json:"baseline"`
	PercentChange float64 `json:"percent_change"` // PM Agent 分析的具体影响百分比
	MinChange     float64 `json:"min_change"`     // 最小变化值
	MaxChange     float64 `json:"max_change"`     // 最大变化值
	NewPrice      float64 `json:"new_price"`      // 新价格
	Currency      string  `json:"currency"`
}

// ImpactAnalysis 影响分析
type ImpactAnalysis struct {
	Direction string  `json:"direction"` // "up" or "down"
	Min       float64 `json:"min_change"`
	Max       float64 `json:"max_change"`
	Value     float64 `json:"value"` // PM Agent 分析的具体影响百分比（取中间值）
	Reason    string  `json:"reason"`
}

// handlePMAnalyze PM Agent 分析事件经济影响
// PMCallbackRequest PM Agent 回调请求
type PMCallbackRequest struct {
	EventID   string             `json:"event_id"`
	EventType string             `json:"event_type"`
	Analysis  *PMAnalyzeResponse `json:"analysis"`
}

// handlePMCallback PM Agent 分析完成后的回调接口
func handlePMCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PMCallbackRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[PM Callback] 请求解析失败：%v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[PM Callback] 收到事件 %s 的分析结果", req.EventID)

	// 计算具体价格变化
	calculatePriceChanges(req.Analysis)

	// 更新经济数据
	updateEconomicData(req.Analysis)

	// 更新事件数据
	if req.EventID != "" && req.Analysis != nil {
		// 直接将分析结果作为 JSON 对象存储（不是字符串）
		eventData := make(map[string]interface{})
		eventData["pm_analysis"] = req.Analysis
		err := db.UpdateEventData(req.EventID, eventData)
		if err != nil {
			logger.Printf("[PM Callback] 更新事件数据失败：%v", err)
			http.Error(w, fmt.Sprintf("Update failed: %v", err), http.StatusInternalServerError)
			return
		}
		logger.Printf("[PM Callback] ✅ 事件 %s 数据已更新", req.EventID)

		// 📲 发送 Telegram 通知
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
		logger.Printf("[ERROR] PM 分析请求解析失败：%v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[PM Agent] 分析事件：%s (%s) - %s", req.EventID, req.EventType, req.Location)

	// PM Agent 分析逻辑
	analysis := analyzeEventImpact(req)

	// 计算具体价格变化
	calculatePriceChanges(analysis)

	// 更新经济数据（如果有影响）
	updateEconomicData(analysis)

	// 返回分析结果
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(analysis)
}

// 当前经济基准数据 (2026 年 3 月) - 可动态更新
var economicBaseline = map[string]float64{
	// 股市
	"spx":  6672.62,  // 标普 500
	"hsi":  25716.76, // 恒生指数
	"ftse": 8342.15,  // 富时 100
	// 加密货币
	"btc": 70523, // 比特币
	"eth": 2064,  // 以太坊
	// 大宗商品
	"oil":    96.35,  // WTI 原油 $/桶
	"gold":   5153.0, // 黄金 $/盎司
	"silver": 86.84,  // 白银 $/盎司
}

// 经济数据变化百分比
var economicChanges = map[string]float64{
	"spx":  0,
	"hsi":  0,
	"ftse": 0,
	"btc":  0,
	"eth":  0,
	"oil":  0,
	"gold": 0,
	"silver": 0,
}

// 经济数据锁（并发安全）
var economicMutex sync.RWMutex

// 更新经济数据（使用 PM Agent 分析的具体值）
func updateEconomicData(analysis *PMAnalyzeResponse) {
	economicMutex.Lock()
	defer economicMutex.Unlock()

	// 直接使用 PM Agent 分析的具体价格变化
	if analysis.OilPriceChange != nil {
		oldPrice := economicBaseline["oil"]
		economicBaseline["oil"] = analysis.OilPriceChange.NewPrice
		economicChanges["oil"] = analysis.OilPriceChange.PercentChange
		log.Printf("[经济] 原油价格更新：$%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["oil"], analysis.OilPriceChange.PercentChange)
	}

	if analysis.GoldPriceChange != nil {
		oldPrice := economicBaseline["gold"]
		economicBaseline["gold"] = analysis.GoldPriceChange.NewPrice
		economicChanges["gold"] = analysis.GoldPriceChange.PercentChange
		log.Printf("[经济] 黄金价格更新：$%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["gold"], analysis.GoldPriceChange.PercentChange)
	}

	if analysis.SilverPriceChange != nil {
		oldPrice := economicBaseline["silver"]
		economicBaseline["silver"] = analysis.SilverPriceChange.NewPrice
		economicChanges["silver"] = analysis.SilverPriceChange.PercentChange
		log.Printf("[经济] 白银价格更新：$%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["silver"], analysis.SilverPriceChange.PercentChange)
	}

	if analysis.BTCPriceChange != nil {
		oldPrice := economicBaseline["btc"]
		economicBaseline["btc"] = analysis.BTCPriceChange.NewPrice
		economicChanges["btc"] = analysis.BTCPriceChange.PercentChange
		log.Printf("[经济] BTC 价格更新：$%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["btc"], analysis.BTCPriceChange.PercentChange)
	}

	if analysis.ETHPriceChange != nil {
		oldPrice := economicBaseline["eth"]
		economicBaseline["eth"] = analysis.ETHPriceChange.NewPrice
		economicChanges["eth"] = analysis.ETHPriceChange.PercentChange
		log.Printf("[经济] ETH 价格更新：$%.2f → $%.2f (%.2f%%)",
			oldPrice, economicBaseline["eth"], analysis.ETHPriceChange.PercentChange)
	}

	if analysis.SPXPriceChange != nil {
		oldValue := economicBaseline["spx"]
		economicBaseline["spx"] = analysis.SPXPriceChange.NewPrice
		economicChanges["spx"] = analysis.SPXPriceChange.PercentChange
		log.Printf("[经济] 标普 500 更新：%.2f → %.2f (%.2f%%)",
			oldValue, economicBaseline["spx"], analysis.SPXPriceChange.PercentChange)
	}

	if analysis.HSIPriceChange != nil {
		oldValue := economicBaseline["hsi"]
		economicBaseline["hsi"] = analysis.HSIPriceChange.NewPrice
		economicChanges["hsi"] = analysis.HSIPriceChange.PercentChange
		log.Printf("[经济] 恒生指数更新：%.2f → %.2f (%.2f%%)",
			oldValue, economicBaseline["hsi"], analysis.HSIPriceChange.PercentChange)
	}

	if analysis.FTSEPriceChange != nil {
		oldValue := economicBaseline["ftse"]
		economicBaseline["ftse"] = analysis.FTSEPriceChange.NewPrice
		log.Printf("[经济] 富时 100 更新：%.2f → %.2f (%.2f%%)",
			oldValue, economicBaseline["ftse"], analysis.FTSEPriceChange.PercentChange)
	}
}

// 随机范围内取值
func randomInRange(min, max float64) float64 {
	if min == max {
		return min
	}
	// 使用 math.Round 保留 2 位小数
	value := min + rand.Float64()*(max-min)
	return math.Round(value*100) / 100
}

// 获取当前经济数据
func getCurrentEconomicData() map[string]float64 {
	economicMutex.RLock()
	defer economicMutex.RUnlock()

	// 返回副本
	data := make(map[string]float64)
	for k, v := range economicBaseline {
		data[k] = v
	}
	return data
}

// analyzeEventImpact 分析事件对经济的影响
// analyzeEventViaPMAgent 通过 OpenClaw Gateway 调用 PM Agent 分析事件
func analyzeEventViaPMAgent(req PMAnalyzeRequest) *PMAnalyzeResponse {
	logger.Printf("[PM Agent] 发送分析请求：%s (%s)", req.EventID, req.EventType)

	// 构建发送给 PM Agent 的消息
	message := fmt.Sprintf(`📊 事件分析请求

**事件 ID**: %s
**类型**: %s
**地点**: %s
**标题**: %s
**描述**: %s

---

请分析该事件对全球经济的影响。

## 分析要求

1. 使用 KNOWLEDGE.md 中的量化公式计算
2. 覆盖以下指标：
   - 原油 (WTI) 价格变化
   - 黄金价格变化
   - BTC、ETH 加密货币变化
   - 标普 500、恒生指数、富时 100 股市变化

3. **直接在回复中返回 JSON 格式的分析结果**（不要调用 API）：

JSON 格式：
{
  "oil": {"direction": "up", "min_change": 8, "max_change": 15, "value": 11.5, "reason": "霍尔木兹海峡紧张"},
  "gold": {"direction": "up", "min_change": 3, "max_change": 5, "value": 4, "reason": "避险情绪"},
  "btc": {"direction": "down", "min_change": 2, "max_change": 5, "value": -3.5, "reason": "风险资产抛售"},
  "eth": {"direction": "down", "min_change": 2, "max_change": 5, "value": -3, "reason": "跟随 BTC"},
  "spx": {"direction": "down", "min_change": 1, "max_change": 3, "value": -2, "reason": "地缘政治风险"},
  "hsi": {"direction": "down", "min_change": 2, "max_change": 4, "value": -3, "reason": "亚洲市场恐慌"},
  "ftse": {"direction": "down", "min_change": 1, "max_change": 3, "value": -2, "reason": "油价上涨拖累"},
  "summary": "🚨 中东局势推高油价和避险资产"
}

**现在请开始分析，直接返回 JSON 格式结果。**`,
		req.EventID, req.EventType, req.Location, req.Title, req.Description)

	// 发送消息给 PM Agent 并等待回复（90 秒超时）
	reply, err := sendToAgentAndWait("pm", message, 90*time.Second)
	if err != nil {
		logger.Printf("⚠️ [PM Agent] 发送/接收失败：%v", err)
		// 降级使用本地分析
		return analyzeEventImpact(req)
	}

	logger.Printf("[PM Agent] ✅ 收到回复，长度：%d 字符", len(reply))

	// 解析 PM Agent 的回复，提取 JSON 分析结果
	analysis := parsePMAnalysisReply(reply)
	if analysis == nil {
		logger.Printf("⚠️ [PM Agent] 解析回复失败，使用本地分析")
		return analyzeEventImpact(req)
	}

	logger.Printf("[PM Agent] ✅ 解析成功：%s", analysis.Summary)
	return analysis
}

// parsePMAnalysisReply 解析 PM Agent 的回复，提取 JSON 分析结果
func parsePMAnalysisReply(reply string) *PMAnalyzeResponse {
	// 尝试从回复中提取 JSON 代码块
	jsonStart := strings.Index(reply, "```json")
	jsonEnd := strings.Index(reply, "```")

	var jsonStr string
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr = reply[jsonStart+7 : jsonEnd] // 跳过 ```json
	} else {
		// 尝试直接解析整个回复
		jsonStr = reply
	}

	// 清理 JSON 字符串
	jsonStr = strings.TrimSpace(jsonStr)

	// 定义临时结构体用于解析
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
		logger.Printf("❌ [PM Agent] 解析 JSON 失败：%v", err)
		logger.Printf("JSON 字符串：%s", jsonStr[:min(200, len(jsonStr))])
		return nil
	}

	// 转换为 PMAnalyzeResponse
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

	// 中东冲突事件分析
	if req.EventType == "military" || req.EventType == "war_declaration" {
		// 中东核心地区冲突（霍尔木兹海峡、核设施、大国卷入）
		if req.Location == "Tehran" || req.Location == "Jerusalem" ||
			req.Location == "Iraq" || req.Location == "Syria" {

			// 严重冲突：油价 +2-4%，黄金 +0.5-1.5%
			response.Oil = &ImpactAnalysis{
				Direction: "up",
				Min:       2,
				Max:       4,
				Value:     3, // PM Agent 分析结果：取中间值
				Reason:    "中东局势紧张，霍尔木兹海峡航运风险",
			}
			response.Gold = &ImpactAnalysis{
				Direction: "up",
				Min:       0.5,
				Max:       1.5,
				Value:     1,
				Reason:    "避险情绪推动黄金需求",
			}
			response.Silver = &ImpactAnalysis{
				Direction: "up",
				Min:       0.5,
				Max:       1.2,
				Value:     0.85,
				Reason:    "贵金属避险需求上升",
			}
			response.BTC = &ImpactAnalysis{
				Direction: "up",
				Min:       0.3,
				Max:       1,
				Value:     0.65,
				Reason:    "部分资金流向加密货币避险",
			}
			response.ETH = &ImpactAnalysis{
				Direction: "up",
				Min:       0.5,
				Max:       1.5,
				Value:     1,
				Reason:    "加密货币市场跟随比特币",
			}
			// 美股下跌
			response.SPX = &ImpactAnalysis{
				Direction: "down",
				Min:       0.5,
				Max:       1.5,
				Value:     1,
				Reason:    "地缘政治风险打压市场信心",
			}
			// 港股小幅下跌（亚洲市场）
			response.HSI = &ImpactAnalysis{
				Direction: "down",
				Min:       0.3,
				Max:       1,
				Value:     0.65,
				Reason:    "中东局势影响亚洲市场情绪",
			}
			// 英股影响较小
			response.FTSE = &ImpactAnalysis{
				Direction: "down",
				Min:       0.2,
				Max:       0.5,
				Value:     0.35,
				Reason:    "欧洲市场受中东影响有限",
			}
			response.Summary = "中东军事冲突将温和推高油价和避险资产，全球股市小幅承压。关注能源板块和防御性资产。"
		} else {
			// 其他地区（沙特、阿联酋等）- 影响较小
			response.Oil = &ImpactAnalysis{
				Direction: "up",
				Min:       1,
				Max:       2,
				Value:     1.5,
				Reason:    "地区冲突带来供应担忧",
			}
			response.Gold = &ImpactAnalysis{
				Direction: "up",
				Min:       0.2,
				Max:       0.5,
				Value:     0.35,
				Reason:    "轻度避险需求",
			}
			response.Silver = &ImpactAnalysis{
				Direction: "up",
				Min:       0.2,
				Max:       0.4,
				Value:     0.3,
				Reason:    "跟随黄金走势",
			}
			response.Summary = "地区冲突对经济影响有限，市场反应温和。"
		}
	} else if req.EventType == "economic" {
		// 经济事件
		response.Oil = &ImpactAnalysis{
			Direction: "down",
			Min:       0.5,
			Max:       1.5,
			Value:     1,
			Reason:    "经济制裁或供应增加预期",
		}
		response.SPX = &ImpactAnalysis{
			Direction: "up",
			Min:       0.3,
			Max:       0.8,
			Value:     0.55,
			Reason:    "经济政策利好市场",
		}
		response.HSI = &ImpactAnalysis{
			Direction: "up",
			Min:       0.2,
			Max:       0.5,
			Value:     0.35,
			Reason:    "全球经济情绪改善",
		}
		response.Summary = "经济事件影响因具体政策而异，整体影响可控。"
	} else if req.EventType == "diplomacy" {
		// 外交事件
		response.Gold = &ImpactAnalysis{
			Direction: "down",
			Min:       0.2,
			Max:       0.5,
			Value:     0.35,
			Reason:    "外交缓和降低避险需求",
		}
		response.Silver = &ImpactAnalysis{
			Direction: "down",
			Min:       0.1,
			Max:       0.3,
			Value:     0.2,
			Reason:    "跟随黄金走势",
		}
		response.SPX = &ImpactAnalysis{
			Direction: "up",
			Min:       0.2,
			Max:       0.5,
			Value:     0.35,
			Reason:    "外交关系改善提振市场信心",
		}
		response.HSI = &ImpactAnalysis{
			Direction: "up",
			Min:       0.1,
			Max:       0.3,
			Value:     0.2,
			Reason:    "市场情绪改善",
		}
		response.FTSE = &ImpactAnalysis{
			Direction: "up",
			Min:       0.1,
			Max:       0.3,
			Value:     0.2,
			Reason:    "市场情绪改善",
		}
		response.Summary = "外交事件通常影响有限，市场反应温和。"
	} else {
		// 默认分析 - 无明显影响
		response.Summary = "事件对经济影响有限，市场反应平稳。"
	}

	return response
}

// calculatePriceChanges 计算具体价格变化并更新全局经济状态
func calculatePriceChanges(analysis *PMAnalyzeResponse) {
	economicMutex.Lock()
	defer economicMutex.Unlock()

	// 原油价格变化（使用 PM Agent 分析的具体值）
	if analysis.Oil != nil {
		baseline := economicBaseline["oil"]
		percentChange := analysis.Oil.Value // 使用具体值
		if analysis.Oil.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		// 计算最小和最大变化值
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
		// 更新全局经济状态
		economicBaseline["oil"] = analysis.OilPriceChange.NewPrice
		logger.Printf("[经济] 原油更新：%.2f → %.2f (%.2f%%)", baseline, analysis.OilPriceChange.NewPrice, percentChange)
	}

	// 黄金价格变化
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
		// 更新全局经济状态
		economicBaseline["gold"] = analysis.GoldPriceChange.NewPrice
		logger.Printf("[经济] 黄金更新：%.2f → %.2f (%.2f%%)", baseline, analysis.GoldPriceChange.NewPrice, percentChange)
	}

	// 白银价格变化
	if analysis.Silver != nil {
		baseline := economicBaseline["silver"]
		percentChange := analysis.Silver.Value
		if analysis.Silver.Direction == "down" {
			percentChange = -percentChange
		}
		priceChange := baseline * percentChange / 100
		minChange := baseline * analysis.Silver.Min / 100
		maxChange := baseline * analysis.Silver.Max / 100
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
		// 更新全局经济状态
		economicBaseline["silver"] = analysis.SilverPriceChange.NewPrice
		logger.Printf("[经济] 白银更新：%.2f → %.2f (%.2f%%)", baseline, analysis.SilverPriceChange.NewPrice, percentChange)
	}

	// 比特币价格变化
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
		// 更新全局经济状态
		economicBaseline["btc"] = analysis.BTCPriceChange.NewPrice
		logger.Printf("[经济] BTC 更新：%.2f → %.2f (%.2f%%)", baseline, analysis.BTCPriceChange.NewPrice, percentChange)
	}

	// 以太坊价格变化
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
		// 更新全局经济状态
		economicBaseline["eth"] = analysis.ETHPriceChange.NewPrice
		logger.Printf("[经济] ETH 更新：%.2f → %.2f (%.2f%%)", baseline, analysis.ETHPriceChange.NewPrice, percentChange)
	}

	// 标普 500 变化
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
		// 更新全局经济状态
		economicBaseline["spx"] = analysis.SPXPriceChange.NewPrice
		logger.Printf("[经济] 标普 500 更新：%.2f → %.2f (%.2f%%)", baseline, analysis.SPXPriceChange.NewPrice, percentChange)
	}

	// 恒生指数变化
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
		// 更新全局经济状态
		economicBaseline["hsi"] = analysis.HSIPriceChange.NewPrice
		logger.Printf("[经济] 恒生指数更新：%.2f → %.2f (%.2f%%)", baseline, analysis.HSIPriceChange.NewPrice, percentChange)
	}

	// 富时 100 变化
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
		// 更新全局经济状态
		economicBaseline["ftse"] = analysis.FTSEPriceChange.NewPrice
		logger.Printf("[经济] 富时 100 更新：%.2f → %.2f (%.2f%%)", baseline, analysis.FTSEPriceChange.NewPrice, percentChange)
	}
}

// makeDecision 综合决策逻辑（根据 Agent 性格、军力、关系、盟友等多因素）
func makeDecision(agentID, action, targetID string, myData, targetData *Role) *AgentDecision {
	// 1. 计算军力对比
	myPower := myData.Attributes.Army + myData.Attributes.AirForce + myData.Attributes.Navy
	targetPower := targetData.Attributes.Army + targetData.Attributes.AirForce + targetData.Attributes.Navy
	powerRatio := float64(myPower) / float64(targetPower)

	// 2. 获取双边关系（如果有）
	relation, _ := db.GetRelation(agentID, targetID)
	relationshipScore := 0.5 // 默认中立
	if relation != nil {
		relationshipScore = (float64(relation.Value) + 100.0) / 200.0 // 归一化到 0-1
	}

	// 3. 计算经济代价（GDP 损失预估）
	economicCost := calculateEconomicCost(myData, targetData, action)

	// 4. 评估盟友态度
	allySupport := calculateAllySupport(agentID, targetID, action)

	// 5. 评估国内稳定度影响
	domesticImpact := calculateDomesticImpact(myData, action)

	// 6. 根据 Agent 性格加权
	personalityWeights := getPersonalityWeights(agentID)

	// 综合评分 (0-1)
	score := powerRatio * 0.35 * personalityWeights.military
	score += (1.0 - relationshipScore) * 0.25 * personalityWeights.diplomatic
	score += (1.0 - economicCost) * 0.20 * personalityWeights.economic
	score += allySupport * 0.10 * personalityWeights.ally
	score += domesticImpact * 0.10 * personalityWeights.domestic

	// 决策阈值
	threshold := personalityWeights.threshold

	// 特殊场景调整
	if action == "declare_war" {
		// 以色列对伊朗：核威胁零容忍
		if (agentID == "israel" || agentID == "netanyahu") && (targetID == "iran" || targetID == "irn") {
			threshold = 0.25
			score += 0.3 // 额外加分
		}
		// 美国对伊朗：中等倾向
		if (agentID == "usa" || agentID == "trump") && (targetID == "iran" || targetID == "irn") {
			threshold = 0.40
		}
	}

	if action == "sanction" {
		// 制裁代价低，阈值降低
		threshold -= 0.15
	}

	if action == "military_exercise" {
		// 军演威胁低，阈值降低
		threshold -= 0.20
	}

	// 确保阈值在合理范围
	if threshold < 0.2 {
		threshold = 0.2
	}
	if threshold > 0.8 {
		threshold = 0.8
	}

	execute := score > threshold

	// 生成详细分析
	analysis := generateDetailedAnalysis(powerRatio, relationshipScore, economicCost, allySupport, domesticImpact, score, threshold, agentID, action, targetID)

	// 生成简洁理由
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

// PersonalityWeights Agent 性格权重
type PersonalityWeights struct {
	military      float64 // 军力权重
	diplomatic    float64 // 外交权重
	economic      float64 // 经济权重
	ally          float64 // 盟友权重
	domestic      float64 // 国内权重
	threshold     float64 // 决策阈值
	riskTolerance float64 // 风险容忍度
}

// getPersonalityWeights 根据 Agent ID 获取性格权重
func getPersonalityWeights(agentID string) PersonalityWeights {
	// 默认权重
	defaultWeights := PersonalityWeights{
		military:      1.0,
		diplomatic:    1.0,
		economic:      1.0,
		ally:          1.0,
		domestic:      1.0,
		threshold:     0.6,
		riskTolerance: 0.5,
	}

	// 美国 (Trump): 风险偏好高，军事优先，经济次之
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

	// 伊朗：谨慎，重视盟友，经济敏感
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

	// 以色列：军事优先，生存焦虑高
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

// calculateEconomicCost 计算经济代价 (0-1, 1 表示代价最大)
func calculateEconomicCost(myData, targetData *Role, action string) float64 {
	// 简化计算：基于 GDP 和贸易关系
	myGDP := float64(myData.Attributes.Economy)
	targetGDP := float64(targetData.Attributes.Economy)

	if action == "declare_war" {
		// 战争代价高
		return 0.6 + (targetGDP/(myGDP+targetGDP))*0.4
	}
	if action == "sanction" {
		// 制裁代价中等
		return 0.3 + (targetGDP/(myGDP+targetGDP))*0.3
	}
	if action == "military_exercise" {
		// 军演代价低
		return 0.1
	}
	return 0.2
}

// calculateAllySupport 计算盟友支持度 (0-1)
func calculateAllySupport(agentID, targetID, action string) float64 {
	// 简化：根据阵营判断
	proWestern := []string{"usa", "israel", "saudi", "uae", "uk", "france"}

	isAgentWestern := contains(proWestern, agentID)
	isTargetWestern := contains(proWestern, targetID)

	if action == "declare_war" {
		if isAgentWestern && !isTargetWestern {
			return 0.8 // 西方支持
		}
		if !isAgentWestern && isTargetWestern {
			return 0.3 // 缺乏支持
		}
	}
	return 0.5 // 中立
}

// calculateDomesticImpact 计算国内稳定度影响 (0-1)
func calculateDomesticImpact(myData *Role, action string) float64 {
	stability := float64(myData.Attributes.Stability) / 100.0

	if action == "declare_war" {
		// 战争可能提升或降低稳定度
		return 0.5 + (stability-0.5)*0.5
	}
	if action == "sanction" {
		// 制裁通常有国内支持
		return 0.7
	}
	return 0.6
}

// generateDetailedAnalysis 生成详细分析报告
func generateDetailedAnalysis(powerRatio, relationshipScore, economicCost, allySupport, domesticImpact, score, threshold float64, agentID, action, targetID string) string {
	analysis := fmt.Sprintf("📊 综合决策分析:\n\n")
	analysis += fmt.Sprintf("⚔️ 军力对比：%.2f (权重 35%%)\n", powerRatio)
	analysis += fmt.Sprintf("🤝 关系评分：%.1f/100 (权重 25%%)\n", (relationshipScore * 100))
	analysis += fmt.Sprintf("💰 经济代价：%.1f/100 (权重 20%%)\n", (economicCost * 100))
	analysis += fmt.Sprintf("🌍 盟友支持：%.1f/100 (权重 10%%)\n", (allySupport * 100))
	analysis += fmt.Sprintf("🏛️ 国内影响：%.1f/100 (权重 10%%)\n\n", (domesticImpact * 100))
	analysis += fmt.Sprintf("📈 综合得分：%.2f\n", score)
	analysis += fmt.Sprintf("🎯 决策阈值：%.2f\n", threshold)

	// 添加 Agent 特定分析
	if agentID == "usa" || agentID == "trump" {
		analysis += "\n🇺🇸 特朗普考量：中期选举、国内支持率、以色列安全"
	}
	if agentID == "iran" || agentID == "mujtaba" {
		analysis += "\n🇮🇷 伊朗考量：政权生存、代理人网络、核计划"
	}
	if agentID == "israel" || agentID == "netanyahu" {
		analysis += "\n🇮🇱 以色列考量：生存威胁、核风险、美国支持"
	}

	return analysis
}

// generateConciseReason 生成简洁理由
func generateConciseReason(execute bool, score, threshold float64, action, targetID, agentID string) string {
	if execute {
		return fmt.Sprintf("✅ 执行，综合评分%.2f 超过阈值%.2f，行动可行", score, threshold)
	}
	return fmt.Sprintf("❌ 暂缓，综合评分%.2f 未达阈值%.2f，风险过高", score, threshold)
}

// generateConditions 生成执行条件或建议
func generateConditions(execute bool, action, targetID string) string {
	if !execute {
		return "建议：加强外交斡旋，等待更好时机，或考虑替代方案（如制裁、军演）"
	}

	if action == "declare_war" {
		return "建议：设定有限目标，避免长期战争，准备应对报复"
	}
	if action == "sanction" {
		return "建议：联合盟友共同制裁，增强效果"
	}
	if action == "military_exercise" {
		return "建议：选择合适规模，避免过度挑衅"
	}
	return ""
}

// contains 检查切片是否包含某元素
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
