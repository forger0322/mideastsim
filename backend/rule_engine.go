package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

// ActionResult represents the result of an action
type ActionResult struct {
	Success       bool     `json:"success"`
	Message       string   `json:"message"`
	Changes       []Change `json:"changes,omitempty"`
	NewEvent      *Event   `json:"new_event,omitempty"`
	Casualties    int      `json:"casualties,omitempty"`
	TerritoryGain string   `json:"territory_gain,omitempty"`
}

// Change represents an attribute change
type Change struct {
	TargetID  string `json:"target_id"`
	Attribute string `json:"attribute"`
	OldValue  int    `json:"old_value"`
	NewValue  int    `json:"new_value"`
	Reason    string `json:"reason"`
}

// RuleEngine is the rule engine
type RuleEngine struct {
	db *Database
}

// NewRuleEngine creates a new rule engine
func NewRuleEngine(db *Database) *RuleEngine {
	return &RuleEngine{db: db}
}

// DeclareWar executes a declare war action
func (re *RuleEngine) DeclareWar(attackerID, defenderID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] DeclareWar starting: attacker=%s, defender=%s", attackerID, defenderID)

	attacker, err := re.db.GetRoleByID(attackerID)
	if err != nil {
		logger.Printf("[ERROR] Failed to get attacker: %v", err)
		return nil, fmt.Errorf("failed to get attacker: %v", err)
	}

	defender, err := re.db.GetRoleByID(defenderID)
	if err != nil {
		return nil, fmt.Errorf("failed to get defender: %v", err)
	}

	// Calculate success rate based on military power comparison
	attackerPower := attacker.Attributes.Army + attacker.Attributes.AirForce
	defenderPower := defender.Attributes.Army + defender.Attributes.AirForce

	// Base success rate 50%, adjusted by power difference
	powerRatio := float64(attackerPower) / float64(defenderPower)
	baseSuccessRate := 0.5 + (powerRatio-1)*0.2

	// Clamp between 20%-80%
	if baseSuccessRate < 0.2 {
		baseSuccessRate = 0.2
	}
	if baseSuccessRate > 0.8 {
		baseSuccessRate = 0.8
	}

	// Random determination
	success := rand.Float64() < baseSuccessRate
	logger.Printf("[DEBUG] DeclareWar success rate: %.2f%%, result: %v", baseSuccessRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		// Success: defender suffers greater losses
		attackerLoss := int(float64(attacker.Attributes.Army) * 0.05)
		defenderLoss := int(float64(defender.Attributes.Army) * 0.15)

		result.Message = fmt.Sprintf("✅ %s successfully declared war on %s! Initial offensive gains advantage", attacker.Name, defender.Name)
		result.Casualties = attackerLoss + defenderLoss

		// Update attributes
		changes := []Change{}

		newAttackerArmy := attacker.Attributes.Army - attackerLoss
		changes = append(changes, Change{
			TargetID:  attackerID,
			Attribute: "army",
			OldValue:  attacker.Attributes.Army,
			NewValue:  newAttackerArmy,
			Reason:    fmt.Sprintf("Declaration of war on %s", defender.Name),
		})

		newDefenderArmy := defender.Attributes.Army - defenderLoss
		changes = append(changes, Change{
			TargetID:  defenderID,
			Attribute: "army",
			OldValue:  defender.Attributes.Army,
			NewValue:  newDefenderArmy,
			Reason:    fmt.Sprintf("Under attack by %s", attacker.Name),
		})

		// Reduce stability
		newDefenderStability := defender.Attributes.Stability - 10
		changes = append(changes, Change{
			TargetID:  defenderID,
			Attribute: "stability",
			OldValue:  defender.Attributes.Stability,
			NewValue:  newDefenderStability,
			Reason:    "War broke out",
		})

		result.Changes = changes

		// Create event
		result.NewEvent = &Event{
			ID:            fmt.Sprintf("war_%s_%s_%d", attackerID, defenderID, time.Now().Unix()),
			Timestamp:     time.Now(),
			Location:      defender.Name,
			LocationZh:    defender.Name, // Chinese location
			Type:          "military",
			Title:         "War Broke Out",
			TitleZh:       "战争爆发",
			Description:   fmt.Sprintf("%s formally declared war on %s, conflict has broken out", attacker.Name, defender.Name),
			DescriptionZh: fmt.Sprintf("%s 正式向 %s 宣战，冲突爆发", attacker.Name, defender.Name),
			ActorID:       attackerID,
			ActorName:     attacker.Name,
			TargetID:      defenderID,
			TargetName:    defender.Name,
		}

		// Send Telegram war notification
		go sendWarNotification(attacker.Name, defender.Name, "Military conflict broke out")
	} else {
		// Failed: attacker suffers losses
		attackerLoss := int(float64(attacker.Attributes.Army) * 0.1)

		result.Message = fmt.Sprintf("❌ %s's military action against %s failed", attacker.Name, defender.Name)
		result.Casualties = attackerLoss

		changes := []Change{
			{
				TargetID:  attackerID,
				Attribute: "army",
				OldValue:  attacker.Attributes.Army,
				NewValue:  attacker.Attributes.Army - attackerLoss,
				Reason:    fmt.Sprintf("Military action against %s failed", defender.Name),
			},
			{
				TargetID:  attackerID,
				Attribute: "stability",
				OldValue:  attacker.Attributes.Stability,
				NewValue:  attacker.Attributes.Stability - 5,
				Reason:    "Military operation failed",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("war_failed_%s_%s_%d", attackerID, defenderID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    attacker.Name,
			Type:        "military",
			Title:       "Military Operation Failed",
			Description: fmt.Sprintf("%s's military action against %s failed with heavy losses", attacker.Name, defender.Name),
			ActorID:     attackerID,
			TargetID:    defenderID,
		}
	}

	return result, nil
}

// Sanction executes a sanction action
func (re *RuleEngine) Sanction(initiatorID, targetID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] Sanction starting: initiator=%s, target=%s", initiatorID, targetID)

	initiator, err := re.db.GetRoleByID(initiatorID)
	if err != nil {
		logger.Printf("[ERROR] Failed to get initiator: %v", err)
		return nil, fmt.Errorf("failed to get initiator: %v", err)
	}

	target, err := re.db.GetRoleByID(targetID)
	if err != nil {
		return nil, fmt.Errorf("failed to get target: %v", err)
	}

	// Sanction success rate based on diplomatic + economic power comparison
	initiatorPower := initiator.Attributes.Diplomacy + initiator.Attributes.Economy
	targetPower := target.Attributes.Diplomacy + target.Attributes.Economy

	powerRatio := float64(initiatorPower) / float64(targetPower)
	successRate := 0.5 + (powerRatio-1)*0.15

	if successRate < 0.3 {
		successRate = 0.3
	}
	if successRate > 0.9 {
		successRate = 0.9
	}

	success := rand.Float64() < successRate
	logger.Printf("[DEBUG] Sanction success rate: %.2f%%, result: %v", successRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		// Success: target economy damaged
		economyLoss := int(float64(target.Attributes.Economy) * 0.1)
		stabilityLoss := 8

		result.Message = fmt.Sprintf("✅ Sanctions by %s against %s are effective!", initiator.Name, target.Name)

		changes := []Change{
			{
				TargetID:  targetID,
				Attribute: "economy",
				OldValue:  target.Attributes.Economy,
				NewValue:  target.Attributes.Economy - economyLoss,
				Reason:    fmt.Sprintf("Sanctions imposed by %s", initiator.Name),
			},
			{
				TargetID:  targetID,
				Attribute: "stability",
				OldValue:  target.Attributes.Stability,
				NewValue:  target.Attributes.Stability - stabilityLoss,
				Reason:    "Impact of sanctions",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("sanction_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    target.Name,
			Type:        "economic",
			Title:       "Economic Sanctions Imposed",
			Description: fmt.Sprintf("%s imposed economic sanctions on %s with significant effect", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	} else {
		result.Message = fmt.Sprintf("⚠️ Sanctions by %s failed to have significant impact on %s", initiator.Name, target.Name)

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("sanction_failed_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    initiator.Name,
			Type:        "economic",
			Title:       "Sanctions Had Limited Effect",
			Description: fmt.Sprintf("Sanctions by %s against %s had limited effect", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	}

	return result, nil
}

// Coup executes a coup d'état action
func (re *RuleEngine) Coup(organizerID, targetCountryID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] Coup starting: organizer=%s, target=%s", organizerID, targetCountryID)

	organizer, err := re.db.GetRoleByID(organizerID)
	if err != nil {
		logger.Printf("[ERROR] Failed to get organizer: %v", err)
		return nil, fmt.Errorf("failed to get organizer: %v", err)
	}

	target, err := re.db.GetRoleByID(targetCountryID)
	if err != nil {
		return nil, fmt.Errorf("failed to get target country: %v", err)
	}

	// Coup success rate based on intelligence and stability
	// Higher intelligence + lower target stability = higher success rate
	successChance := float64(organizer.Attributes.Intel) / 100.0
	stabilityFactor := float64(100-target.Attributes.Stability) / 100.0

	successRate := 0.3 + successChance*0.4 + stabilityFactor*0.3

	if successRate > 0.85 {
		successRate = 0.85
	}

	success := rand.Float64() < successRate
	logger.Printf("[DEBUG] Coup success rate: %.2f%%, result: %v", successRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		result.Message = fmt.Sprintf("🎯 Coup organized by %s in %s succeeded!", organizer.Name, target.Name)

		changes := []Change{
			{
				TargetID:  targetCountryID,
				Attribute: "stability",
				OldValue:  target.Attributes.Stability,
				NewValue:  30, // Greatly reduced stability after coup
				Reason:    "Coup succeeded",
			},
			{
				TargetID:  targetCountryID,
				Attribute: "diplomacy",
				OldValue:  target.Attributes.Diplomacy,
				NewValue:  target.Attributes.Diplomacy - 15,
				Reason:    "Regime change",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("coup_%s_%s_%d", organizerID, targetCountryID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    target.Name,
			Type:        "political",
			Title:       "Coup Succeeded",
			Description: fmt.Sprintf("🎯 Coup succeeded! Regime change organized by %s in %s has gained control", organizer.Name, target.Name),
			ActorID:     organizerID,
			TargetID:    targetCountryID,
		}
	} else {
		result.Message = fmt.Sprintf("❌ Coup organized by %s in %s failed", organizer.Name, target.Name)

		changes := []Change{
			{
				TargetID:  organizerID,
				Attribute: "intel",
				OldValue:  organizer.Attributes.Intel,
				NewValue:  organizer.Attributes.Intel - 20,
				Reason:    "Coup failed, intelligence network damaged",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("coup_failed_%s_%s_%d", organizerID, targetCountryID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    target.Name,
			Type:        "political",
			Title:       "Coup Failed",
			Description: fmt.Sprintf("❌ Coup failed! Operation organized by %s in %s was foiled", organizer.Name, target.Name),
			ActorID:     organizerID,
			TargetID:    targetCountryID,
		}
	}

	return result, nil
}

// FormAlliance executes an alliance formation action
func (re *RuleEngine) FormAlliance(initiatorID, targetID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] FormAlliance starting: initiator=%s, target=%s", initiatorID, targetID)

	initiator, err := re.db.GetRoleByID(initiatorID)
	if err != nil {
		logger.Printf("[ERROR] Failed to get initiator: %v", err)
		return nil, fmt.Errorf("failed to get initiator: %v", err)
	}

	target, err := re.db.GetRoleByID(targetID)
	if err != nil {
		return nil, fmt.Errorf("failed to get target: %v", err)
	}

	// Alliance success rate based on diplomacy and existing relations
	avgDiplomacy := float64(initiator.Attributes.Diplomacy+target.Attributes.Diplomacy) / 2
	baseRate := 0.4 + (avgDiplomacy/200.0)*0.4

	if baseRate > 0.8 {
		baseRate = 0.8
	}

	success := rand.Float64() < baseRate
	logger.Printf("[DEBUG] FormAlliance success rate: %.2f%%, result: %v", baseRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		result.Message = fmt.Sprintf("🤝 %s and %s formally formed an alliance!", initiator.Name, target.Name)

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("alliance_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    "International Stage",
			Type:        "diplomacy",
			Title:       "Alliance Formed",
			Description: fmt.Sprintf("🤝 %s and %s signed a mutual defense treaty, formally establishing alliance relations", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	} else {
		result.Message = fmt.Sprintf("⚠️ Alliance negotiations between %s and %s broke down", initiator.Name, target.Name)

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("alliance_failed_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    "International Stage",
			Type:        "diplomacy",
			Title:       "Alliance Negotiations Failed",
			Description: fmt.Sprintf("⚠️ Alliance negotiations between %s and %s failed to reach agreement", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	}

	return result, nil
}

// ActionRequest represents an action request
type ActionRequest struct {
	ActionType      string            `json:"action_type"`
	TargetID        string            `json:"target_id"`
	TargetCountryID string            `json:"target_country_id,omitempty"`
	Params          map[string]string `json:"params,omitempty"`
	Content         string            `json:"content,omitempty"`
}

// HandleAction handles action requests (HTTP Handler)
func (re *RuleEngine) HandleAction(w http.ResponseWriter, r *http.Request) {
	logger.Printf("[DEBUG] HandleAction received request: method=%s", r.Method)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[ERROR] Request parsing failed: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[DEBUG] Action request: type=%s, targetID=%s", req.ActionType, req.TargetID)

	// Get player ID from JWT context (set by middleware)
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
	role, err := re.db.GetRoleByPlayerID(playerID)
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

	var result *ActionResult

	// Execute corresponding action
	logger.Printf("[DEBUG] Starting action execution: %s", req.ActionType)
	switch req.ActionType {
	case "declare_war":
		result, err = re.DeclareWar(role.ID, req.TargetID)
	case "sanction":
		result, err = re.Sanction(role.ID, req.TargetID)
	case "coup":
		result, err = re.Coup(role.ID, req.TargetCountryID)
	case "form_alliance":
		result, err = re.FormAlliance(role.ID, req.TargetID)
	case "diplomatic_statement":
		statementType := req.Params["statement_type"]
		if statementType == "" {
			statementType = "neutral"
		}
		content := req.Params["content"]
		if content == "" {
			content = req.Content
		}
		result, err = re.DiplomaticStatement(role.ID, req.TargetID, statementType, content)
	default:
		logger.Printf("[ERROR] Unknown action type: %s", req.ActionType)
		http.Error(w, fmt.Sprintf("Unknown action type: %s", req.ActionType), http.StatusBadRequest)
		return
	}

	if err != nil {
		logger.Printf("[ERROR] Action execution failed: %v", err)
		http.Error(w, fmt.Sprintf("Action failed: %v", err), http.StatusInternalServerError)
		return
	}

	logger.Printf("[DEBUG] Action execution completed: success=%v, message=%s", result.Success, result.Message)

	// Apply attribute changes
	if len(result.Changes) > 0 {
		logger.Printf("[DEBUG] Processing %d attribute changes", len(result.Changes))
		for _, change := range result.Changes {
			logger.Printf("[DEBUG] Attribute change: target=%s, attr=%s, %d -> %d", change.TargetID, change.Attribute, change.OldValue, change.NewValue)
			if err := re.db.UpdateRoleAttribute(change.TargetID, change.Attribute, change.NewValue); err != nil {
				logger.Printf("[ERROR] Failed to update attribute: %v", err)
			}
		}
	}

	// Store event
	if result.NewEvent != nil {
		logger.Printf("[DEBUG] Storing event: type=%s, title=%s", result.NewEvent.Type, result.NewEvent.Title)
		if err := re.db.InsertEvent(*result.NewEvent); err != nil {
			logger.Printf("[ERROR] Failed to store event: %v", err)
		} else {
			// Asynchronous PM Agent analysis of event economic impact
			event := result.NewEvent
			go func() {
				logger.Printf("🔍 [PM Agent] Starting async analysis goroutine for event %s", event.ID)
				req := PMAnalyzeRequest{
					EventID:     event.ID,
					EventType:   event.Type,
					Location:    event.Location,
					Title:       event.Title,
					Description: event.Description,
				}

				logger.Printf("📤 [PM Agent] Starting analyzeEventViaPMAgent for %s", event.ID)
				analysis := analyzeEventViaPMAgent(req)
				if analysis != nil {
					logger.Printf("📊 [PM Agent] Analysis complete, calculating price changes for %s", event.ID)
					calculatePriceChanges(analysis)

					// Store PM analysis in event Data field
					eventData := make(map[string]interface{})
					eventData["pm_analysis"] = analysis
					err := re.db.UpdateEventData(event.ID, eventData)
					if err != nil {
						logger.Printf("❌ [PM Agent] Failed to update event data: %v", err)
					} else {
						logger.Printf("✅ [PM Agent] Event %s analysis completed and saved", event.ID)

						// Push event update to frontend (WebSocket)
						updatedEvent, err := re.db.GetEventByID(event.ID)
						if err == nil {
							eventUpdateMsg := map[string]interface{}{
								"type":  "event_updated",
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
		}
	}

	// Return result
	logger.Printf("[DEBUG] Returning action result")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// DiplomaticStatement issues a diplomatic statement
func (re *RuleEngine) DiplomaticStatement(actorID, targetID, statementType, content string) (*ActionResult, error) {
	actor, err := re.db.GetRoleByID(actorID)
	if err != nil || actor == nil {
		return nil, fmt.Errorf("role does not exist: %s", actorID)
	}

	target, err := re.db.GetRoleByID(targetID)
	if err != nil || target == nil {
		return nil, fmt.Errorf("target role does not exist: %s", targetID)
	}

	logger.Printf("[INFO] Diplomatic statement: %s → %s (%s): %s", actorID, targetID, statementType, content)

	// Calculate relationship impact
	relationshipImpact := 0.0
	switch statementType {
	case "support":
		relationshipImpact = 10.0
	case "criticize":
		relationshipImpact = -10.0
	}

	// Update relationship
	if err := re.db.UpdateRelation(actorID, targetID, relationshipImpact, 0); err != nil {
		logger.Printf("[WARN] Failed to update relationship: %v", err)
	}

	// Create event
	event := &Event{
		ID:          fmt.Sprintf("stmt_%s_%s_%d", actorID, targetID, time.Now().UnixNano()),
		Timestamp:   time.Now(),
		Location:    target.Name,
		Type:        "diplomacy",
		Title:       getStatementTitle(statementType),
		Description: fmt.Sprintf("%s issued a %s statement regarding %s", actor.Name, getStatementTypeName(statementType), target.Name),
		ActorID:     actorID,
		TargetID:    targetID,
		Severity:    1,
		Data: map[string]interface{}{
			"statement_type":      statementType,
			"content":             content,
			"relationship_impact": relationshipImpact,
		},
	}

	if err := re.db.InsertEvent(*event); err != nil {
		logger.Printf("[WARN] Failed to store event: %v", err)
	} else {
		// Asynchronous PM Agent analysis of event economic impact
		go func() {
			logger.Printf("🔍 [PM Agent] Starting async analysis goroutine for event %s", event.ID)
			req := PMAnalyzeRequest{
				EventID:     event.ID,
				EventType:   event.Type,
				Location:    event.Location,
				Title:       event.Title,
				Description: event.Description,
			}

			logger.Printf("📤 [PM Agent] Starting analyzeEventViaPMAgent for %s", event.ID)
			analysis := analyzeEventViaPMAgent(req)
			if analysis != nil {
				logger.Printf("📊 [PM Agent] Analysis complete, calculating price changes for %s", event.ID)
				calculatePriceChanges(analysis)

				// Store PM analysis in event Data field
				eventData := make(map[string]interface{})
				eventData["pm_analysis"] = analysis
				err := re.db.UpdateEventData(event.ID, eventData)
				if err != nil {
					logger.Printf("❌ [PM Agent] Failed to update event data: %v", err)
				} else {
					logger.Printf("✅ [PM Agent] Event %s analysis completed and saved", event.ID)

					// Push event update to frontend (WebSocket)
					updatedEvent, err := re.db.GetEventByID(event.ID)
					if err == nil {
						eventUpdateMsg := map[string]interface{}{
							"type":  "event_updated",
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
	}

	return &ActionResult{
		Success:  true,
		Message:  fmt.Sprintf("Diplomatic statement issued: %s", content),
		NewEvent: event,
	}, nil
}

func getStatementTitle(statementType string) string {
	switch statementType {
	case "support":
		return "Statement of Support"
	case "criticize":
		return "Statement of Criticism"
	default:
		return "Neutral Statement"
	}
}

func getStatementTypeName(statementType string) string {
	switch statementType {
	case "support":
		return "support"
	case "criticize":
		return "criticism"
	default:
		return "neutral"
	}
}

// analyzeEventForPM generates PM economic impact analysis for an event
func (re *RuleEngine) analyzeEventForPM(event *Event) *PMAnalyzeResponse {
	// Build PM analysis request
	req := PMAnalyzeRequest{
		EventID:     event.ID,
		EventType:   event.Type,
		Location:    event.Location,
		Title:       event.Title,
		Description: event.Description,
	}

	// Call PM analysis API (internal call)
	analysis := analyzeEventImpact(req)
	calculatePriceChanges(analysis)

	// Store PM analysis in event Data field
	if event.Data == nil {
		event.Data = make(map[string]interface{})
	}
	event.Data["pm_analysis"] = analysis

	return analysis
}
