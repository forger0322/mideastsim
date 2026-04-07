package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

// handleAgentMemory gets Agent memory (single)
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

// handleAgentMemoryList gets memory list
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

// handleAIOfflineStatus gets offline AI status
func handleAIOfflineStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Note: needs access to offlineAI instance
	// Here we temporarily return empty response, actually need to pass offlineAI reference from main.go
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"ai_controlled_roles": []string{},
		"message": "Offline AI status query (full implementation pending)",
	})
}

// handlePlayerDisconnect handles player disconnection (called when WebSocket closes)
func handlePlayerDisconnect(playerID, roleID string) {
	log.Printf("🔌 Player %s disconnected (%s)", playerID, roleID)

	// Here needs access to offlineAI instance
	// offlineAI.PlayerDisconnected(playerID, roleID)
}

// handlePlayerReconnect handles player reconnection
func handlePlayerReconnect(playerID, roleID string) {
	log.Printf("✅ Player %s reconnected (%s)", playerID, roleID)

	// Here needs access to offlineAI instance
	// offlineAI.PlayerReconnected(playerID, roleID)
}

// AgentMemoryWithDetails represents Agent memory with additional details
type AgentMemoryWithDetails struct {
	AgentMemory
	ActorName       string `json:"actor_name,omitempty"`
	TargetName      string `json:"target_name,omitempty"`
	RelationChange  string `json:"relation_change,omitempty"`
}

// EnrichAgentMemories adds detailed information to memories
func EnrichAgentMemories(memories []AgentMemory) []AgentMemoryWithDetails {
	enriched := make([]AgentMemoryWithDetails, len(memories))

	for i, mem := range memories {
		enriched[i] = AgentMemoryWithDetails{
			AgentMemory: mem,
		}

		// Extract extra information from metadata
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

// GetAgentDecisionFactors gets decision factors for Agent (used for AI decision making)
func GetAgentDecisionFactors(roleID string) map[string]interface{} {
	factors := make(map[string]interface{})

	// Get recent memories
	memories, _ := db.GetAgentMemories(roleID, "", 10)

	// Calculate sentiment tendency
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

	// Get national power
	role, err := db.GetRoleByID(roleID)
	if err == nil && role != nil {
		factors["military_power"] = role.Attributes.Army + role.Attributes.AirForce + role.Attributes.Navy
		factors["economy"] = role.Attributes.Economy
		factors["stability"] = role.Attributes.Stability
	}

	return factors
}

// AIDecisionRequest represents AI decision request
type AIDecisionRequest struct {
	RoleID  string `json:"role_id"`
	Reason  string `json:"reason"`
	Urgent  bool   `json:"urgent"`
}

// AIDecisionResponse represents AI decision response
type AIDecisionResponse struct {
	ShouldAct    bool                   `json:"should_act"`
	Action       string                 `json:"action,omitempty"`
	TargetID     string                 `json:"target_id,omitempty"`
	Confidence   float64                `json:"confidence"`
	Reason       string                 `json:"reason"`
	DecisionData map[string]interface{} `json:"decision_data,omitempty"`
}

// MakeAIDecisionForRole generates AI decision for specified country
func MakeAIDecisionForRole(roleID string) *AIDecisionResponse {
	factors := GetAgentDecisionFactors(roleID)

	// Basic decision logic
	shouldAct := false
	action := ""
	targetID := ""
	confidence := 0.0
	reason := ""

	// Decide whether to act based on sentiment tendency
	avgSentiment, _ := factors["avg_sentiment"].(float64)
	threatCount, _ := factors["threat_count"].(int)

	if threatCount > 2 {
		shouldAct = true
		action = "military_exercise"
		confidence = 0.7
		reason = "Multiple threats detected, demonstrate military strength"
	} else if avgSentiment < -0.3 {
		shouldAct = true
		action = "statement"
		confidence = 0.6
		reason = "Negative sentiment accumulation, issue diplomatic statement"
	} else if avgSentiment > 0.3 {
		shouldAct = true
		action = "improve_relations"
		confidence = 0.5
		reason = "Positive sentiment, improve relations"
	}

	return &AIDecisionResponse{
		ShouldAct:    shouldAct,
		Action:       action,
		TargetID:     targetID,
		Confidence:   confidence,
		Reason:       reason,
		DecisionData: factors,
	}
}

// ScheduleAIAction schedules AI action execution
func ScheduleAIAction(roleID string, delay time.Duration) {
	go func() {
		time.Sleep(delay)

		decision := MakeAIDecisionForRole(roleID)
		if decision.ShouldAct {
			log.Printf("⏰ Scheduled AI action: %s → %s (%s)", roleID, decision.Action, decision.Reason)
			// Here can call rule engine to execute action
		}
	}()
}
