package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"
)

// OfflineAIConfig represents offline AI configuration
type OfflineAIConfig struct {
	RoleID             string    `json:"role_id"`              // Country ID
	PlayerID           string    `json:"player_id"`            // Player ID
	Enabled            bool      `json:"enabled"`              // Whether enabled
	LastPlayerActive   time.Time `json:"last_player_active"`   // Last player active time
	AIControlStartTime time.Time `json:"ai_control_start"`     // AI control start time
	DecisionStyle      string    `json:"decision_style"`       // Decision style (aggressive, defensive, diplomatic)
	PriorityActions    []string  `json:"priority_actions"`     // Priority actions
}

// OfflineAIManager manages offline AI
type OfflineAIManager struct {
	configs map[string]*OfflineAIConfig // role_id -> config
	db      *Database
}

// NewOfflineAIManager creates a new offline AI manager
func NewOfflineAIManager(db *Database) *OfflineAIManager {
	return &OfflineAIManager{
		configs: make(map[string]*OfflineAIConfig),
		db:      db,
	}
}

// InitializeOfflineAI initializes offline AI configuration
func (m *OfflineAIManager) InitializeOfflineAI() error {
	// Load all unbound countries from database
	roles, err := m.db.GetAllRoles()
	if err != nil {
		return err
	}

	for _, role := range roles {
		if !role.PlayerID.Valid || role.PlayerID.String == "" {
			// Enable AI control for countries without players
			config := &OfflineAIConfig{
				RoleID:             role.ID,
				PlayerID:           "",
				Enabled:            true,
				LastPlayerActive:   time.Now(),
				AIControlStartTime: time.Now(),
				DecisionStyle:      getAIDecisionStyle(role.ID),
			}
			m.configs[role.ID] = config
			log.Printf("🤖 AI takes control: %s (%s)", role.Name, role.ID)
		}
	}

	log.Printf("✅ Offline AI manager initialized, controlling %d countries", len(m.configs))
	return nil
}

// getAIDecisionStyle gets AI decision style based on country
func getAIDecisionStyle(roleID string) string {
	// Set decision style based on country characteristics
	switch roleID {
	case "USA", "IRN", "RUS", "ISR":
		return "aggressive" // Great/powerful countries
	case "SAU", "ARE", "EGY":
		return "diplomatic" // Moderate countries
	case "SYR", "LBN", "YEM":
		return "defensive" // Weaker countries
	default:
		return "balanced"
	}
}

// PlayerDisconnected handles player disconnection
func (m *OfflineAIManager) PlayerDisconnected(playerID, roleID string) {
	if config, exists := m.configs[roleID]; exists {
		config.LastPlayerActive = time.Now()
		config.Enabled = true
		config.AIControlStartTime = time.Now()
		log.Printf("🔌 Player %s disconnected, AI takes control of %s", playerID, roleID)
	} else {
		// Create new config
		config := &OfflineAIConfig{
			RoleID:             roleID,
			PlayerID:           playerID,
			Enabled:            true,
			LastPlayerActive:   time.Now(),
			AIControlStartTime: time.Now(),
			DecisionStyle:      getAIDecisionStyle(roleID),
		}
		m.configs[roleID] = config
		log.Printf("🆕 AI takes control of new country: %s (player: %s)", roleID, playerID)
	}
}

// PlayerReconnected handles player reconnection
func (m *OfflineAIManager) PlayerReconnected(playerID, roleID string) {
	if config, exists := m.configs[roleID]; exists {
		config.Enabled = false
		config.LastPlayerActive = time.Now()
		log.Printf("✅ Player %s reconnected, AI relinquishes control of %s", playerID, roleID)
	}
}

// GetAIControlledRoles gets all AI-controlled countries
func (m *OfflineAIManager) GetAIControlledRoles() []string {
	var roles []string
	for roleID, config := range m.configs {
		if config.Enabled {
			roles = append(roles, roleID)
		}
	}
	return roles
}

// MakeAIDecision has AI make a decision
func (m *OfflineAIManager) MakeAIDecision(roleID string) *AgentCommand {
	config, exists := m.configs[roleID]
	if !exists || !config.Enabled {
		return nil
	}

	// Generate decision based on country characteristics and current situation
	decision := m.generateDecision(roleID, config)

	if decision != nil {
		log.Printf("🤖 AI decision: %s → %s (%s)", roleID, decision.Action, decision.TargetID)
	}

	return decision
}

// generateDecision generates a concrete decision
func (m *OfflineAIManager) generateDecision(roleID string, config *OfflineAIConfig) *AgentCommand {
	// Get country information
	role, err := m.db.GetRoleByID(roleID)
	if err != nil {
		return nil
	}

	// Get all relations, then filter
	allRelations, err := m.db.GetAllRelations()
	if err != nil {
		return nil
	}

	// Filter relations for this country
	var relations []Relation
	for _, rel := range allRelations {
		if rel.ActorID == roleID || rel.TargetID == roleID {
			relations = append(relations, rel)
		}
	}

	// Select action based on decision style
	switch config.DecisionStyle {
	case "aggressive":
		return m.makeAggressiveDecision(role, relations)
	case "defensive":
		return m.makeDefensiveDecision(role, relations)
	case "diplomatic":
		return m.makeDiplomaticDecision(role, relations)
	default:
		return m.makeBalancedDecision(role, relations)
	}
}

// makeAggressiveDecision makes an aggressive decision
func (m *OfflineAIManager) makeAggressiveDecision(role *Role, relations []Relation) *AgentCommand {
	// Look for hostile countries
	for _, rel := range relations {
		if rel.Value < 30 && rand.Float64() < 0.3 {
			// 30% chance to take action against hostile country
			actionType := []string{"sanction", "military_exercise", "declare_war"}[rand.Intn(3)]
			return &AgentCommand{
				Action:   actionType,
				TargetID: rel.TargetID,
				Reason:   "AI: National security is threatened",
				ReasonZh: "AI：国家安全受到威胁",
			}
		}
	}

	// No enemies, develop military
	if rand.Float64() < 0.5 {
		return &AgentCommand{
			Action: "build_military",
			Reason: "AI: Strengthen national defense",
			ReasonZh: "AI：增强国防实力",
		}
	}

	return nil
}

// makeDefensiveDecision makes a defensive decision
func (m *OfflineAIManager) makeDefensiveDecision(role *Role, relations []Relation) *AgentCommand {
	// Look for friendly countries to seek protection
	for _, rel := range relations {
		if rel.Value > 70 && rand.Float64() < 0.4 {
			return &AgentCommand{
				Action:   "alliance",
				TargetID: rel.TargetID,
				Reason:   "AI: Seeking security guarantees",
				ReasonZh: "AI：寻求安全保障",
			}
		}
	}

	// Otherwise remain neutral
	if rand.Float64() < 0.5 {
		return &AgentCommand{
			Action: "statement",
			Data: map[string]interface{}{
				"content": "We call on all parties to exercise restraint and resolve disputes through dialogue.",
			},
			Reason: "AI: Calling for peace",
			ReasonZh: "AI：呼吁和平",
		}
	}

	return nil
}

// makeDiplomaticDecision makes a diplomatic decision
func (m *OfflineAIManager) makeDiplomaticDecision(role *Role, relations []Relation) *AgentCommand {
	// Look for opportunities to improve relations
	for _, rel := range relations {
		if rel.Value >= 30 && rel.Value <= 60 && rand.Float64() < 0.4 {
			return &AgentCommand{
				Action:   "improve_relations",
				TargetID: rel.TargetID,
				Reason:   "AI: Improve bilateral relations",
				ReasonZh: "AI：改善双边关系",
			}
		}
	}

	// Issue diplomatic statement
	if rand.Float64() < 0.5 {
		return &AgentCommand{
			Action: "statement",
			Data: map[string]interface{}{
				"content": "We are committed to maintaining regional stability and prosperity through diplomatic means.",
			},
			Reason: "AI: Diplomatic statement",
			ReasonZh: "AI：外交声明",
		}
	}

	return nil
}

// makeBalancedDecision makes a balanced decision
func (m *OfflineAIManager) makeBalancedDecision(role *Role, relations []Relation) *AgentCommand {
	actions := []string{"statement", "sanction", "military_exercise", "improve_relations"}
	action := actions[rand.Intn(len(actions))]

	// Randomly select a target
	if len(relations) > 0 {
		target := relations[rand.Intn(len(relations))]
		return &AgentCommand{
			Action:   action,
			TargetID: target.TargetID,
			Reason:   "AI: Balanced strategy",
			ReasonZh: "AI：平衡策略",
		}
	}

	return &AgentCommand{
		Action: "statement",
		Data: map[string]interface{}{
			"content": "We will make the best decision based on national interests.",
		},
		Reason: "AI: Autonomous decision making",
		ReasonZh: "AI：自主决策",
	}
}

// AgentCommand represents an Agent command
type AgentCommand struct {
	Action   string                 `json:"action"`
	TargetID string                 `json:"target_id,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Reason   string                 `json:"reason"`
	ReasonZh string                 `json:"reason_zh"`
}

// ExecuteAIActions executes AI actions (called periodically)
func (m *OfflineAIManager) ExecuteAIActions(ruleEngine *RuleEngine) {
	for roleID := range m.configs {
		if command := m.MakeAIDecision(roleID); command != nil {
			// Execute AI decision
			go func(roleID string, cmd *AgentCommand) {
				log.Printf("🤖 AI decision: %s → %s (%s)", roleID, cmd.Action, cmd.TargetID)

				var result *ActionResult
				var err error

				// Call rule engine based on action type
				switch cmd.Action {
				case "declare_war":
					if cmd.TargetID != "" {
						result, err = ruleEngine.DeclareWar(roleID, cmd.TargetID)
					}
				case "sanction":
					if cmd.TargetID != "" {
						result, err = ruleEngine.Sanction(roleID, cmd.TargetID)
					}
				case "alliance":
					if cmd.TargetID != "" {
						result, err = ruleEngine.FormAlliance(roleID, cmd.TargetID)
					}
				case "statement":
					// Diplomatic statement
					statementType := "neutral"
					if cmd.Data != nil {
						if t, ok := cmd.Data["statement_type"].(string); ok {
							statementType = t
						}
					}
					content := cmd.ReasonZh
					if content == "" {
						content = "We are committed to maintaining regional peace and stability."
					}
					result, err = ruleEngine.DiplomaticStatement(roleID, cmd.TargetID, statementType, content)
				case "military_exercise":
					// Military exercise - create event
					event := &Event{
						ID:            fmt.Sprintf("evt_mil_%s_%d", roleID, time.Now().Unix()),
						Timestamp:     time.Now(),
						Location:      roleID,
						Type:          "military",
						Title:         "Military Exercise",
						TitleZh:       "军事演习",
						Description:   fmt.Sprintf("%s conducted a military exercise near border regions.", roleID),
						DescriptionZh: fmt.Sprintf("%s 在边境地区举行军事演习。", roleID),
						ActorID:       roleID,
					}
					result = &ActionResult{
						Success:  true,
						Message:  fmt.Sprintf("%s held a military exercise in border regions", roleID),
						NewEvent: event,
					}

					// Asynchronous PM Agent analysis of event economic impact
					go func() {
						log.Printf("🔍 [PM Agent] Starting async analysis goroutine for event %s", event.ID)
						req := PMAnalyzeRequest{
							EventID:     event.ID,
							EventType:   event.Type,
							Location:    event.Location,
							Title:       event.Title,
							Description: event.Description,
						}
						analysis := analyzeEventViaPMAgent(req)
						if analysis != nil {
							log.Printf("📊 [PM Agent] Analysis complete, calculating price changes for %s", event.ID)
							calculatePriceChanges(analysis)
							eventData := map[string]interface{}{"pm_analysis": analysis}
							if err := m.db.UpdateEventData(event.ID, eventData); err != nil {
								log.Printf("❌ [PM Agent] Failed to update event data: %v", err)
							} else {
								log.Printf("✅ [PM Agent] Event %s analysis completed and saved", event.ID)
								eventUpdateMsg := map[string]interface{}{
									"type":  "event_updated",
									"event": map[string]interface{}{"id": event.ID, "pm_analysis": analysis},
								}
								if msgBytes, err := json.Marshal(eventUpdateMsg); err == nil {
									hub.broadcast <- msgBytes
									log.Printf("📡 [PM Agent] Pushed event update to frontend: %s", event.ID)
								}
							}
						}
					}()
				case "improve_relations":
					// Improve relations - increase relation value
					if cmd.TargetID != "" {
						currentRel, err := m.db.GetRelation(roleID, cmd.TargetID)
						if currentRel == nil || err != nil {
							// Relation doesn't exist, skip
							result = &ActionResult{
								Success: false,
								Message: fmt.Sprintf("%s failed to improve relations: relation with %s does not exist", roleID, cmd.TargetID),
							}
							break
						}
						newValue := currentRel.Value + 5
						if newValue > 100 {
							newValue = 100
						}
						m.db.UpdateRelation(roleID, cmd.TargetID, newValue, 5)
						event := &Event{
							ID:             fmt.Sprintf("evt_rel_%s_%s_%d", roleID, cmd.TargetID, time.Now().Unix()),
							Timestamp:      time.Now(),
							Location:       roleID,
							Type:           "diplomacy",
							Title:          "Relations Improved",
							TitleZh:        "改善关系",
							Description:    fmt.Sprintf("%s took steps to improve relations with %s.", roleID, cmd.TargetID),
							DescriptionZh:  fmt.Sprintf("%s 采取措施改善与 %s 的关系。", roleID, cmd.TargetID),
							ActorID:        roleID,
							TargetID:       cmd.TargetID,
						}

						result = &ActionResult{
							Success:  true,
							Message:  fmt.Sprintf("%s improved relations with %s", roleID, cmd.TargetID),
							NewEvent: event,
						}

						// Asynchronous PM Agent analysis of event economic impact
						go func() {
							log.Printf("🔍 [PM Agent] Starting async analysis goroutine for event %s", event.ID)
							req := PMAnalyzeRequest{
								EventID:     event.ID,
								EventType:   event.Type,
								Location:    event.Location,
								Title:       event.Title,
								Description: event.Description,
							}
							analysis := analyzeEventViaPMAgent(req)
							if analysis != nil {
								log.Printf("📊 [PM Agent] Analysis complete, calculating price changes for %s", event.ID)
								calculatePriceChanges(analysis)
								eventData := map[string]interface{}{"pm_analysis": analysis}
								if err := m.db.UpdateEventData(event.ID, eventData); err != nil {
									log.Printf("❌ [PM Agent] Failed to update event data: %v", err)
								} else {
									log.Printf("✅ [PM Agent] Event %s analysis completed and saved", event.ID)
									// Push WebSocket update
									eventUpdateMsg := map[string]interface{}{
										"type":  "event_updated",
										"event": map[string]interface{}{"id": event.ID, "pm_analysis": analysis},
									}
									if msgBytes, err := json.Marshal(eventUpdateMsg); err == nil {
										hub.broadcast <- msgBytes
										log.Printf("📡 [PM Agent] Pushed event update to frontend: %s", event.ID)
									}
								}
							}
						}()
					}
				case "build_military":
					// Military development - increase military strength
					role, err := m.db.GetRoleByID(roleID)
					if err == nil && role != nil {
						newAttrs := role.Attributes
						newAttrs.Army += 2
						m.db.UpdateRoleAttributes(roleID, newAttrs)
						event := &Event{
							ID:             fmt.Sprintf("evt_build_%s_%d", roleID, time.Now().Unix()),
							Timestamp:      time.Now(),
							Location:       roleID,
							Type:           "military",
							Title:          "Military Buildup",
							TitleZh:        "军事建设",
							Description:    fmt.Sprintf("%s invested in military development.", roleID),
							DescriptionZh:  fmt.Sprintf("%s 投资发展军事力量。", roleID),
							ActorID:        roleID,
						}
						result = &ActionResult{
							Success:  true,
							Message:  fmt.Sprintf("%s strengthened military construction", roleID),
							NewEvent: event,
						}

						// Asynchronous PM Agent analysis of event economic impact
						go func() {
							log.Printf("🔍 [PM Agent] Starting async analysis goroutine for event %s", event.ID)
							req := PMAnalyzeRequest{
								EventID:     event.ID,
								EventType:   event.Type,
								Location:    event.Location,
								Title:       event.Title,
								Description: event.Description,
							}
							analysis := analyzeEventViaPMAgent(req)
							if analysis != nil {
								log.Printf("📊 [PM Agent] Analysis complete, calculating price changes for %s", event.ID)
								calculatePriceChanges(analysis)
								eventData := map[string]interface{}{"pm_analysis": analysis}
								if err := m.db.UpdateEventData(event.ID, eventData); err != nil {
									log.Printf("❌ [PM Agent] Failed to update event data: %v", err)
								} else {
									log.Printf("✅ [PM Agent] Event %s analysis completed and saved", event.ID)
									eventUpdateMsg := map[string]interface{}{
										"type":  "event_updated",
										"event": map[string]interface{}{"id": event.ID, "pm_analysis": analysis},
									}
									if msgBytes, err := json.Marshal(eventUpdateMsg); err == nil {
										hub.broadcast <- msgBytes
										log.Printf("📡 [PM Agent] Pushed event update to frontend: %s", event.ID)
									}
								}
							}
						}()
					}
				default:
					log.Printf("⚠️ Unknown action type: %s", cmd.Action)
				}

				// Handle result
				if err != nil {
					log.Printf("❌ AI action failed: %s - %v", cmd.Action, err)
					return
				}

				if result != nil && result.NewEvent != nil {
					// Save event to database
					if err := m.db.CreateEvent(result.NewEvent); err != nil {
						log.Printf("❌ Failed to create event: %v", err)
					} else {
						log.Printf("✅ AI event created: %s - %s", result.NewEvent.ID, result.NewEvent.TitleZh)
					}

					// Broadcast world state
					broadcastWorldState()
				}
			}(roleID, command)
		}
	}
}

// GetAIStatus gets AI status
func (m *OfflineAIManager) GetAIStatus() map[string]interface{} {
	status := make(map[string]interface{})
	for roleID, config := range m.configs {
		status[roleID] = map[string]interface{}{
			"enabled":              config.Enabled,
			"decision_style":       config.DecisionStyle,
			"last_player_active":   config.LastPlayerActive,
			"ai_control_since":     config.AIControlStartTime,
			"control_duration_min": int(time.Since(config.AIControlStartTime).Minutes()),
		}
	}
	return status
}

// ToJSON converts to JSON
func (m *OfflineAIManager) ToJSON() string {
	data, _ := json.MarshalIndent(m.GetAIStatus(), "", "  ")
	return string(data)
}
