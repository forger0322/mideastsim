package main

import (
	"fmt"
	"time"
)

// RoleIDToAgent maps country role_id to Agent name
var RoleIDToAgent = map[string]string{
	"IRN": "mujtaba",   // Iran
	"IRQ": "rashid",    // Iraq
	"SYR": "assad",     // Syria
	"LBN": "qassem",    // Lebanon
	"ISR": "netanyahu", // Israel
	"USA": "trump",     // United States
	"SAU": "salman",    // Saudi Arabia
	"EGY": "sisi",      // Egypt
	"QAT": "tamim",     // Qatar
	"ARE": "mbz",       // UAE
	"KWT": "meshaal",   // Kuwait
	"BHR": "hamad",     // Bahrain
	"TUR": "erdogan",   // Turkey
	"RUS": "putin",     // Russia
	"JOR": "jordan",    // Jordan
}

// AgentToRoleID reverse mapping
var AgentToRoleID = map[string]string{
	"mujtaba":   "IRN",
	"rashid":    "IRQ",
	"assad":     "SYR",
	"qassem":    "LBN",
	"netanyahu": "ISR",
	"trump":     "USA",
	"salman":    "SAU",
	"sisi":      "EGY",
	"tamim":     "QAT",
	"mbz":       "ARE",
	"meshaal":   "KWT",
	"hamad":     "BHR",
	"erdogan":   "TUR",
	"putin":     "RUS",
	"jordan":    "JOR",
}

// GetAllAgents gets all Agent list
func GetAllAgents() []string {
	return []string{
		"mujtaba", "rashid", "assad", "qassem",
		"netanyahu", "trump",
		"salman", "sisi", "tamim", "mbz", "meshaal", "hamad",
		"erdogan",
		"putin",
		"jordan",
	}
}

// ForwardActionToAgents forwards action result to related Agents
func ForwardActionToAgents(req ActionRequest, result *ActionResult, actorRole *Role) {
	logger.Printf("[Forward] Starting action result forwarding: action=%s, target=%s, success=%v", req.ActionType, req.TargetID, result.Success)

	// 1. Determine message type (public or private)
	// public: visible to everyone (diplomatic statement, military exercise)
	// private: only to related parties (declare war, sanction, peace proposal, alliance proposal, coup)
	isPublic := false
	switch req.ActionType {
	case "diplomatic_statement", "military_exercise":
		isPublic = true
	}

	// 2. Get sender Agent name
	senderAgent := ""
	if actorRole != nil {
		// Map from role_id to agent
		senderAgent = RoleIDToAgent[actorRole.ID]
		if senderAgent == "" {
			// Try mapping from name
			for roleID, agent := range RoleIDToAgent {
				if actorRole.ID == roleID {
					senderAgent = agent
					break
				}
			}
		}
	}

	logger.Printf("[Forward] Sender Agent: %s (roleID=%s)", senderAgent, actorRole.ID)

	// 3. Build message content
	messageText := buildActionMessage(req, result, actorRole)

	// 4. Determine target Agent list
	var targetAgents []string
	if isPublic {
		// Public message: send to all Agents (except sender)
		for _, agent := range GetAllAgents() {
			if agent != senderAgent {
				targetAgents = append(targetAgents, agent)
			}
		}
		logger.Printf("[Forward] Public message, sending to %d Agents", len(targetAgents))
	} else {
		// Private message: only to related parties
		// - Sender itself
		// - Target country's Agent
		targetAgents = append(targetAgents, senderAgent)

		// Parse target country's Agent
		targetAgent := getAgentForTarget(req.TargetID, req.ActionType)
		if targetAgent != "" && targetAgent != senderAgent {
			targetAgents = append(targetAgents, targetAgent)
		}
		logger.Printf("[Forward] Private message, sending to %v", targetAgents)
	}

	// 5. Send message to each target Agent
	for _, agent := range targetAgents {
		sessionKey := fmt.Sprintf("agent:%s:main", agent)

		logger.Printf("[Forward] Sending message to %s (session: %s)", agent, sessionKey)

		// Build message content
		messageContent := fmt.Sprintf("%s\n\n【Time】%s", messageText, time.Now().Format("2006-01-02 15:04:05"))

		// Send to target Agent asynchronously
		go func(agentID, session, content string) {
			logger.Printf("[Forward] Calling sendToOpenClawDefault to send message to %s", agentID)

			resp, err := sendToOpenClawDefault(session, agentID, content)
			if err != nil {
				logger.Printf("[ERROR] [Forward] Send failed to %s: %v", agentID, err)
				return
			}

			logger.Printf("[Forward] ✅ Message sent to %s, received %d responses", agentID, len(resp.Output))
		}(agent, sessionKey, messageContent)
	}
}

// buildActionMessage builds action message text
func buildActionMessage(req ActionRequest, result *ActionResult, actorRole *Role) string {
	if actorRole == nil {
		return fmt.Sprintf("【Action】%s - %s", req.ActionType, result.Message)
	}

	actionNames := map[string]string{
		"declare_war":          "Declaration of War",
		"sanction":             "Sanctions",
		"coup":                 "Coup",
		"form_alliance":        "Form Alliance",
		"propose_peace":        "Peace Proposal",
		"military_exercise":    "Military Exercise",
		"diplomatic_statement": "Diplomatic Statement",
	}

	actionName := actionNames[req.ActionType]
	if actionName == "" {
		actionName = req.ActionType
	}

	status := "✅"
	if !result.Success {
		status = "❌"
	}

	return fmt.Sprintf("%s【%s】%s %s %s", status, actionName, actorRole.Name, req.ActionType, result.Message)
}

// getAgentForTarget gets corresponding Agent by target ID
func getAgentForTarget(targetID, actionType string) string {
	// Direct mapping
	if agent, ok := RoleIDToAgent[targetID]; ok {
		return agent
	}

	// Special handling: coup target is country
	if actionType == "coup" {
		if agent, ok := RoleIDToAgent[targetID]; ok {
			return agent
		}
	}

	// Default return empty
	return ""
}

// sendToOpenClawDefault sends message to OpenClaw using default configuration
func sendToOpenClawDefault(sessionKey, agentID, messageText string) (*OpenClawResponse, error) {
	config, err := loadOpenClawConfig()
	if err != nil {
		return nil, err
	}

	return sendToOpenClaw(config, sessionKey, agentID, messageText)
}
