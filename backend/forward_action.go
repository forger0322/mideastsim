package main

import (
	"fmt"
	"time"
)

// RoleIDToAgent 将国家 role_id 映射到 Agent 名称
var RoleIDToAgent = map[string]string{
	"IRN": "mujtaba",   // 伊朗
	"IRQ": "rashid",    // 伊拉克
	"SYR": "assad",     // 叙利亚
	"LBN": "qassem",    // 黎巴嫩
	"ISR": "netanyahu", // 以色列
	"USA": "trump",     // 美国
	"SAU": "salman",    // 沙特
	"EGY": "sisi",      // 埃及
	"QAT": "tamim",     // 卡塔尔
	"ARE": "mbz",       // 阿联酋
	"KWT": "meshaal",   // 科威特
	"BHR": "hamad",     // 巴林
	"TUR": "erdogan",   // 土耳其
	"RUS": "putin",     // 俄罗斯
	"JOR": "jordan",    // 约旦
}

// AgentToRoleID 反向映射
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

// GetAllAgents 获取所有 Agent 列表
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

// ForwardActionToAgents 将行动结果转发给相关 Agent
func ForwardActionToAgents(req ActionRequest, result *ActionResult, actorRole *Role) {
	logger.Printf("[Forward] 开始转发行动结果：action=%s, target=%s, success=%v", req.ActionType, req.TargetID, result.Success)

	// 1. 确定消息类型（public 还是 private）
	// public: 所有人都能看到（外交声明、军事演习）
	// private: 只发给相关方（宣战、制裁、和平提议、结盟提议、政变）
	isPublic := false
	switch req.ActionType {
	case "diplomatic_statement", "military_exercise":
		isPublic = true
	}

	// 2. 获取发送者的 Agent 名称
	senderAgent := ""
	if actorRole != nil {
		// 从 role_id 映射到 agent
		senderAgent = RoleIDToAgent[actorRole.ID]
		if senderAgent == "" {
			// 尝试从 name 映射
			for roleID, agent := range RoleIDToAgent {
				if actorRole.ID == roleID {
					senderAgent = agent
					break
				}
			}
		}
	}

	logger.Printf("[Forward] 发送者 Agent: %s (roleID=%s)", senderAgent, actorRole.ID)

	// 3. 构建消息内容
	messageText := buildActionMessage(req, result, actorRole)

	// 4. 确定目标 Agent 列表
	var targetAgents []string
	if isPublic {
		// 公开消息：发给所有 Agent（除了发送者）
		for _, agent := range GetAllAgents() {
			if agent != senderAgent {
				targetAgents = append(targetAgents, agent)
			}
		}
		logger.Printf("[Forward] 公开消息，发送给 %d 个 Agent", len(targetAgents))
	} else {
		// 私密消息：只发给相关方
		// - 发送者自己
		// - 目标国家的 Agent
		targetAgents = append(targetAgents, senderAgent)

		// 解析目标国家的 Agent
		targetAgent := getAgentForTarget(req.TargetID, req.ActionType)
		if targetAgent != "" && targetAgent != senderAgent {
			targetAgents = append(targetAgents, targetAgent)
		}
		logger.Printf("[Forward] 私密消息，发送给 %v", targetAgents)
	}

	// 5. 对每个目标 Agent 发送消息
	for _, agent := range targetAgents {
		sessionKey := fmt.Sprintf("agent:%s:main", agent)

		logger.Printf("[Forward] 发送消息给 %s (session: %s)", agent, sessionKey)

		// 构建消息内容
		messageContent := fmt.Sprintf("%s\n\n【时间】%s", messageText, time.Now().Format("2006-01-02 15:04:05"))

		// 异步发送给目标 Agent
		go func(agentID, session, content string) {
			logger.Printf("[Forward] 调用 sendToOpenClawDefault 发送消息给 %s", agentID)

			resp, err := sendToOpenClawDefault(session, agentID, content)
			if err != nil {
				logger.Printf("[ERROR] [Forward] 发送失败给 %s: %v", agentID, err)
				return
			}

			logger.Printf("[Forward] ✅ 消息已发送给 %s, 收到 %d 条响应", agentID, len(resp.Output))
		}(agent, sessionKey, messageContent)
	}
}

// buildActionMessage 构建行动消息文本
func buildActionMessage(req ActionRequest, result *ActionResult, actorRole *Role) string {
	if actorRole == nil {
		return fmt.Sprintf("【行动】%s - %s", req.ActionType, result.Message)
	}

	actionNames := map[string]string{
		"declare_war":          "宣战",
		"sanction":             "制裁",
		"coup":                 "政变",
		"form_alliance":        "结盟",
		"propose_peace":        "和平提议",
		"military_exercise":    "军事演习",
		"diplomatic_statement": "外交声明",
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

// getAgentForTarget 根据目标 ID 获取对应的 Agent
func getAgentForTarget(targetID, actionType string) string {
	// 直接映射
	if agent, ok := RoleIDToAgent[targetID]; ok {
		return agent
	}

	// 特殊处理：政变的目标是国家
	if actionType == "coup" {
		if agent, ok := RoleIDToAgent[targetID]; ok {
			return agent
		}
	}

	// 默认返回空
	return ""
}

// sendToOpenClawDefault 使用默认配置发送消息到 OpenClaw
func sendToOpenClawDefault(sessionKey, agentID, messageText string) (*OpenClawResponse, error) {
	config, err := loadOpenClawConfig()
	if err != nil {
		return nil, err
	}

	return sendToOpenClaw(config, sessionKey, agentID, messageText)
}
