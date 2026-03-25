package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// handleAgentMemory 获取 Agent 记忆 (单个)
func handleAgentMemory(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	roleID := r.URL.Query().Get("role_id")
	eventType := r.URL.Query().Get("event_type")
	limit := 20

	if roleID == "" {
		http.Error(w, "Missing role_id parameter", http.StatusBadRequest)
		return
	}

	memories, err := db.GetAgentMemories(roleID, eventType, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "ok",
		"memories": memories,
		"count":    len(memories),
	})
}

// handleAgentMemoryList 获取记忆列表
func handleAgentMemoryList(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limit := 50
	memories, err := db.GetRecentAgentMemories(limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "ok",
		"memories": memories,
		"count":    len(memories),
	})
}

// handleAIOfflineStatus 获取离线 AI 状态
func handleAIOfflineStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 注意：需要访问 offlineAI 实例
	// 这里暂时返回空响应，实际需要在 main.go 中传递 offlineAI 引用
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"ai_controlled_roles": []string{},
		"message": "离线 AI 状态查询 (待实现完整)",
	})
}

// handlePlayerDisconnect 处理玩家断开连接 (WebSocket 关闭时调用)
func handlePlayerDisconnect(playerID, roleID string) {
	log.Printf("🔌 玩家 %s 断开连接 (%s)", playerID, roleID)
	
	// 这里需要访问 offlineAI 实例
	// offlineAI.PlayerDisconnected(playerID, roleID)
}

// handlePlayerReconnect 处理玩家重连
func handlePlayerReconnect(playerID, roleID string) {
	log.Printf("✅ 玩家 %s 重新连接 (%s)", playerID, roleID)
	
	// 这里需要访问 offlineAI 实例
	// offlineAI.PlayerReconnected(playerID, roleID)
}

// AgentMemoryWithDetails 带详细信息的 Agent 记忆
type AgentMemoryWithDetails struct {
	AgentMemory
	ActorName    string `json:"actor_name,omitempty"`
	TargetName   string `json:"target_name,omitempty"`
	RelationChange string `json:"relation_change,omitempty"`
}

// EnrichAgentMemories 为记忆添加详细信息
func EnrichAgentMemories(memories []AgentMemory) []AgentMemoryWithDetails {
	enriched := make([]AgentMemoryWithDetails, len(memories))
	
	for i, mem := range memories {
		enriched[i] = AgentMemoryWithDetails{
			AgentMemory: mem,
		}
		
		// 从元数据中提取额外信息
		if mem.Metadata != "" {
			var metadata map[string]interface{}
			if err := json.Unmarshal([]byte(mem.Metadata), &metadata); err == nil {
				if relationImpact, ok := metadata["relation_impact"].(string); ok {
					enriched[i].RelationChange = relationImpact
				}
			}
		}
	}
	
	return enriched
}

// GetAgentDecisionFactors 获取 Agent 决策因素 (用于 AI 决策)
func GetAgentDecisionFactors(roleID string) map[string]interface{} {
	factors := make(map[string]interface{})
	
	// 获取最近记忆
	memories, _ := db.GetAgentMemories(roleID, "", 10)
	
	// 计算情感倾向
	var totalSentiment float64
	threatCount := 0
	alliedCount := 0
	
	for _, mem := range memories {
		totalSentiment += mem.Sentiment
		if mem.Sentiment < -0.5 {
			threatCount++
		} else if mem.Sentiment > 0.5 {
			alliedCount++
		}
	}
	
	factors["recent_memories"] = len(memories)
	factors["avg_sentiment"] = 0
	if len(memories) > 0 {
		factors["avg_sentiment"] = totalSentiment / float64(len(memories))
	}
	factors["threat_count"] = threatCount
	factors["allied_count"] = alliedCount
	
	// 获取国力
	role, err := db.GetRoleByID(roleID)
	if err == nil && role != nil {
		factors["military_power"] = role.Attributes.Army + role.Attributes.AirForce + role.Attributes.Navy
		factors["economy"] = role.Attributes.Economy
		factors["stability"] = role.Attributes.Stability
	}
	
	return factors
}

// AIDecisionRequest AI 决策请求
type AIDecisionRequest struct {
	RoleID  string `json:"role_id"`
	Reason  string `json:"reason"`
	Urgent  bool   `json:"urgent"`
}

// AIDecisionResponse AI 决策响应
type AIDecisionResponse struct {
	ShouldAct    bool                   `json:"should_act"`
	Action       string                 `json:"action,omitempty"`
	TargetID     string                 `json:"target_id,omitempty"`
	Confidence   float64                `json:"confidence"`
	Reason       string                 `json:"reason"`
	DecisionData map[string]interface{} `json:"decision_data,omitempty"`
}

// MakeAIDecisionForRole 为指定国家生成 AI 决策
func MakeAIDecisionForRole(roleID string) *AIDecisionResponse {
	factors := GetAgentDecisionFactors(roleID)
	
	// 基础决策逻辑
	shouldAct := false
	action := ""
	targetID := ""
	confidence := 0.0
	reason := ""
	
	// 根据情感倾向决定是否行动
	avgSentiment, _ := factors["avg_sentiment"].(float64)
	threatCount, _ := factors["threat_count"].(int)
	
	if threatCount > 2 {
		shouldAct = true
		action = "military_exercise"
		confidence = 0.7
		reason = "多个威胁 detected，展示军事实力"
	} else if avgSentiment < -0.3 {
		shouldAct = true
		action = "statement"
		confidence = 0.6
		reason = "负面情感积累，发表外交声明"
	} else if avgSentiment > 0.3 {
		shouldAct = true
		action = "improve_relations"
		confidence = 0.5
		reason = "积极情感，改善关系"
	}
	
	return &AIDecisionResponse{
		ShouldAct:  shouldAct,
		Action:     action,
		TargetID:   targetID,
		Confidence: confidence,
		Reason:     reason,
		DecisionData: factors,
	}
}

// ScheduleAIAction 定时执行 AI 行动
func ScheduleAIAction(roleID string, delay time.Duration) {
	go func() {
		time.Sleep(delay)
		
		decision := MakeAIDecisionForRole(roleID)
		if decision.ShouldAct {
			log.Printf("⏰ 定时 AI 行动：%s → %s (%s)", roleID, decision.Action, decision.Reason)
			// 这里可以调用规则引擎执行行动
		}
	}()
}
