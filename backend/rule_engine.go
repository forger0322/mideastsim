package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

// ActionResult 行动结果
type ActionResult struct {
	Success       bool     `json:"success"`
	Message       string   `json:"message"`
	Changes       []Change `json:"changes,omitempty"`
	NewEvent      *Event   `json:"new_event,omitempty"`
	Casualties    int      `json:"casualties,omitempty"`
	TerritoryGain string   `json:"territory_gain,omitempty"`
}

// Change 属性变化
type Change struct {
	TargetID  string `json:"target_id"`
	Attribute string `json:"attribute"`
	OldValue  int    `json:"old_value"`
	NewValue  int    `json:"new_value"`
	Reason    string `json:"reason"`
}

// RuleEngine 规则引擎
type RuleEngine struct {
	db *Database
}

// NewRuleEngine 创建规则引擎
func NewRuleEngine(db *Database) *RuleEngine {
	return &RuleEngine{db: db}
}

// DeclareWar 宣战行动
func (re *RuleEngine) DeclareWar(attackerID, defenderID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] DeclareWar 开始：attacker=%s, defender=%s", attackerID, defenderID)

	attacker, err := re.db.GetRoleByID(attackerID)
	if err != nil {
		logger.Printf("[ERROR] 获取攻击方失败：%v", err)
		return nil, fmt.Errorf("获取攻击方失败：%v", err)
	}

	defender, err := re.db.GetRoleByID(defenderID)
	if err != nil {
		return nil, fmt.Errorf("获取防守方失败：%v", err)
	}

	// 计算成功率：基于军力对比
	attackerPower := attacker.Attributes.Army + attacker.Attributes.AirForce
	defenderPower := defender.Attributes.Army + defender.Attributes.AirForce

	// 基础成功率 50%，根据军力差调整
	powerRatio := float64(attackerPower) / float64(defenderPower)
	baseSuccessRate := 0.5 + (powerRatio-1)*0.2

	// 限制在 20%-80% 之间
	if baseSuccessRate < 0.2 {
		baseSuccessRate = 0.2
	}
	if baseSuccessRate > 0.8 {
		baseSuccessRate = 0.8
	}

	// 随机判定
	success := rand.Float64() < baseSuccessRate
	logger.Printf("[DEBUG] DeclareWar成功率: %.2f%%, 判定结果: %v", baseSuccessRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		// 成功：防守方损失更大
		attackerLoss := int(float64(attacker.Attributes.Army) * 0.05)
		defenderLoss := int(float64(defender.Attributes.Army) * 0.15)

		result.Message = fmt.Sprintf("✅ %s 对 %s 宣战成功！初期攻势取得优势", attacker.Name, defender.Name)
		result.Casualties = attackerLoss + defenderLoss

		// 更新属性
		changes := []Change{}

		newAttackerArmy := attacker.Attributes.Army - attackerLoss
		changes = append(changes, Change{
			TargetID:  attackerID,
			Attribute: "army",
			OldValue:  attacker.Attributes.Army,
			NewValue:  newAttackerArmy,
			Reason:    fmt.Sprintf("对%s宣战", defender.Name),
		})

		newDefenderArmy := defender.Attributes.Army - defenderLoss
		changes = append(changes, Change{
			TargetID:  defenderID,
			Attribute: "army",
			OldValue:  defender.Attributes.Army,
			NewValue:  newDefenderArmy,
			Reason:    fmt.Sprintf("遭受%s攻击", attacker.Name),
		})

		// 降低稳定性
		newDefenderStability := defender.Attributes.Stability - 10
		changes = append(changes, Change{
			TargetID:  defenderID,
			Attribute: "stability",
			OldValue:  defender.Attributes.Stability,
			NewValue:  newDefenderStability,
			Reason:    "战争爆发",
		})

		result.Changes = changes

		// 创建事件
		result.NewEvent = &Event{
			ID:          fmt.Sprintf("war_%s_%s_%d", attackerID, defenderID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    defender.Name,
			LocationZh:  defender.Name, // 中文地点
			Type:        "military",
			Title:       "战争爆发",
			TitleZh:     "战争爆发",
			Description: fmt.Sprintf("%s 正式向 %s 宣战，冲突爆发", attacker.Name, defender.Name),
			DescriptionZh: fmt.Sprintf("%s 正式向 %s 宣战，冲突爆发", attacker.Name, defender.Name),
			ActorID:     attackerID,
			ActorName:   attacker.Name,
			TargetID:    defenderID,
			TargetName:  defender.Name,
		}

		// 📲 发送 Telegram 战争通知
		go sendWarNotification(attacker.Name, defender.Name, "军事冲突爆发")
	} else {
		// 失败：攻击方损失
		attackerLoss := int(float64(attacker.Attributes.Army) * 0.1)

		result.Message = fmt.Sprintf("❌ %s 对 %s 的军事行动受挫", attacker.Name, defender.Name)
		result.Casualties = attackerLoss

		changes := []Change{
			{
				TargetID:  attackerID,
				Attribute: "army",
				OldValue:  attacker.Attributes.Army,
				NewValue:  attacker.Attributes.Army - attackerLoss,
				Reason:    fmt.Sprintf("对%s军事行动失败", defender.Name),
			},
			{
				TargetID:  attackerID,
				Attribute: "stability",
				OldValue:  attacker.Attributes.Stability,
				NewValue:  attacker.Attributes.Stability - 5,
				Reason:    "军事行动失败",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("war_failed_%s_%s_%d", attackerID, defenderID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    attacker.Name,
			Type:        "military",
			Title:       "军事行动受挫",
			Description: fmt.Sprintf("%s 对 %s 的军事行动受挫，损失惨重", attacker.Name, defender.Name),
			ActorID:     attackerID,
			TargetID:    defenderID,
		}
	}

	return result, nil
}

// Sanction 制裁行动
func (re *RuleEngine) Sanction(initiatorID, targetID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] Sanction 开始：initiator=%s, target=%s", initiatorID, targetID)

	initiator, err := re.db.GetRoleByID(initiatorID)
	if err != nil {
		logger.Printf("[ERROR] 获取发起方失败：%v", err)
		return nil, fmt.Errorf("获取发起方失败：%v", err)
	}

	target, err := re.db.GetRoleByID(targetID)
	if err != nil {
		return nil, fmt.Errorf("获取目标方失败：%v", err)
	}

	// 制裁成功率基于外交实力对比
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
	logger.Printf("[DEBUG] Sanction成功率: %.2f%%, 判定结果: %v", successRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		// 成功：目标经济受损
		economyLoss := int(float64(target.Attributes.Economy) * 0.1)
		stabilityLoss := 8

		result.Message = fmt.Sprintf("✅ %s 对 %s 的制裁生效！", initiator.Name, target.Name)

		changes := []Change{
			{
				TargetID:  targetID,
				Attribute: "economy",
				OldValue:  target.Attributes.Economy,
				NewValue:  target.Attributes.Economy - economyLoss,
				Reason:    fmt.Sprintf("遭受%s制裁", initiator.Name),
			},
			{
				TargetID:  targetID,
				Attribute: "stability",
				OldValue:  target.Attributes.Stability,
				NewValue:  target.Attributes.Stability - stabilityLoss,
				Reason:    "制裁影响",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("sanction_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    target.Name,
			Type:        "economic",
			Title:       "经济制裁",
			Description: fmt.Sprintf("%s 对 %s 实施经济制裁，效果显著", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	} else {
		result.Message = fmt.Sprintf("⚠️ %s 的制裁未能对 %s 产生重大影响", initiator.Name, target.Name)

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("sanction_failed_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    initiator.Name,
			Type:        "economic",
			Title:       "制裁失败",
			Description: fmt.Sprintf("%s 对 %s 的制裁效果有限", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	}

	return result, nil
}

// Coup 政变行动
func (re *RuleEngine) Coup(organizerID, targetCountryID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] Coup 开始：organizer=%s, target=%s", organizerID, targetCountryID)

	organizer, err := re.db.GetRoleByID(organizerID)
	if err != nil {
		logger.Printf("[ERROR] 获取组织者失败：%v", err)
		return nil, fmt.Errorf("获取组织者失败：%v", err)
	}

	target, err := re.db.GetRoleByID(targetCountryID)
	if err != nil {
		return nil, fmt.Errorf("获取目标国家失败：%v", err)
	}

	// 政变成功率基于情报和稳定性
	// 情报越高、目标稳定性越低，成功率越高
	successChance := float64(organizer.Attributes.Intel) / 100.0
	stabilityFactor := float64(100-target.Attributes.Stability) / 100.0

	successRate := 0.3 + successChance*0.4 + stabilityFactor*0.3

	if successRate > 0.85 {
		successRate = 0.85
	}

	success := rand.Float64() < successRate
	logger.Printf("[DEBUG] Coup成功率: %.2f%%, 判定结果: %v", successRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		result.Message = fmt.Sprintf("🎯 %s 在 %s 策划的政变成功！", organizer.Name, target.Name)

		changes := []Change{
			{
				TargetID:  targetCountryID,
				Attribute: "stability",
				OldValue:  target.Attributes.Stability,
				NewValue:  30, // 政变后稳定性大幅降低
				Reason:    "政变成功",
			},
			{
				TargetID:  targetCountryID,
				Attribute: "diplomacy",
				OldValue:  target.Attributes.Diplomacy,
				NewValue:  target.Attributes.Diplomacy - 15,
				Reason:    "政权更迭",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("coup_%s_%s_%d", organizerID, targetCountryID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    target.Name,
			Type:        "political",
			Title:       "政变成功",
			Description: fmt.Sprintf("🎯 政变成功！%s 在 %s 策划的政权更迭取得控制", organizer.Name, target.Name),
			ActorID:     organizerID,
			TargetID:    targetCountryID,
		}
	} else {
		result.Message = fmt.Sprintf("❌ %s 在 %s 策划的政变失败", organizer.Name, target.Name)

		changes := []Change{
			{
				TargetID:  organizerID,
				Attribute: "intel",
				OldValue:  organizer.Attributes.Intel,
				NewValue:  organizer.Attributes.Intel - 20,
				Reason:    "政变失败，情报网受损",
			},
		}

		result.Changes = changes

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("coup_failed_%s_%s_%d", organizerID, targetCountryID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    target.Name,
			Type:        "political",
			Title:       "政变失败",
			Description: fmt.Sprintf("❌ 政变失败！%s 在 %s 策划的行动被挫败", organizer.Name, target.Name),
			ActorID:     organizerID,
			TargetID:    targetCountryID,
		}
	}

	return result, nil
}

// FormAlliance 结盟行动
func (re *RuleEngine) FormAlliance(initiatorID, targetID string) (*ActionResult, error) {
	logger.Printf("[DEBUG] FormAlliance 开始：initiator=%s, target=%s", initiatorID, targetID)

	initiator, err := re.db.GetRoleByID(initiatorID)
	if err != nil {
		logger.Printf("[ERROR] 获取发起方失败：%v", err)
		return nil, fmt.Errorf("获取发起方失败：%v", err)
	}

	target, err := re.db.GetRoleByID(targetID)
	if err != nil {
		return nil, fmt.Errorf("获取目标方失败：%v", err)
	}

	// 结盟成功率基于外交和现有关系
	avgDiplomacy := float64(initiator.Attributes.Diplomacy+target.Attributes.Diplomacy) / 2
	baseRate := 0.4 + (avgDiplomacy/200.0)*0.4

	if baseRate > 0.8 {
		baseRate = 0.8
	}

	success := rand.Float64() < baseRate
	logger.Printf("[DEBUG] FormAlliance成功率: %.2f%%, 判定结果: %v", baseRate*100, success)

	result := &ActionResult{
		Success: success,
	}

	if success {
		result.Message = fmt.Sprintf("🤝 %s 与 %s 正式结盟！", initiator.Name, target.Name)

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("alliance_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    "国际舞台",
			Type:        "diplomacy",
			Title:       "结盟成功",
			Description: fmt.Sprintf("🤝 %s 与 %s 签署共同防御条约，正式建立同盟关系", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	} else {
		result.Message = fmt.Sprintf("⚠️ %s 与 %s 的结盟谈判破裂", initiator.Name, target.Name)

		result.NewEvent = &Event{
			ID:          fmt.Sprintf("alliance_failed_%s_%s_%d", initiatorID, targetID, time.Now().Unix()),
			Timestamp:   time.Now(),
			Location:    "国际舞台",
			Type:        "diplomacy",
			Title:       "结盟失败",
			Description: fmt.Sprintf("⚠️ %s 与 %s 的同盟谈判未能达成协议", initiator.Name, target.Name),
			ActorID:     initiatorID,
			TargetID:    targetID,
		}
	}

	return result, nil
}

// ActionRequest 行动请求
type ActionRequest struct {
	ActionType      string            `json:"action_type"`
	TargetID        string            `json:"target_id"`
	TargetCountryID string            `json:"target_country_id,omitempty"`
	Params          map[string]string `json:"params,omitempty"`
	Content         string            `json:"content,omitempty"`
}

// HandleAction 处理行动请求（HTTP Handler）
func (re *RuleEngine) HandleAction(w http.ResponseWriter, r *http.Request) {
	logger.Printf("[DEBUG] HandleAction 收到请求: method=%s", r.Method)

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Printf("[ERROR] 请求解析失败: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	logger.Printf("[DEBUG] 行动请求: type=%s, targetID=%s", req.ActionType, req.TargetID)

	// 从 JWT 上下文中获取玩家 ID（由中间件设置）
	// 从 JWT 上下文中获取玩家 ID（由中间件设置）
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

	logger.Printf("[DEBUG] 玩家ID: %s", playerID)

	// 获取玩家控制的角色
	role, err := re.db.GetRoleByPlayerID(playerID)
	if err != nil {
		logger.Printf("[ERROR] 获取玩家角色失败: %v", err)
		http.Error(w, fmt.Sprintf("Failed to get player role: %v", err), http.StatusInternalServerError)
		return
	}

	if role == nil {
		logger.Printf("[ERROR] 玩家没有激活的角色")
		http.Error(w, "Player has no active role", http.StatusBadRequest)
		return
	}

	logger.Printf("[DEBUG] 玩家角色: %s (ID=%s)", role.Name, role.ID)

	var result *ActionResult

	// 执行对应的行动
	logger.Printf("[DEBUG] 开始执行行动: %s", req.ActionType)
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
		logger.Printf("[ERROR] 未知的行动类型: %s", req.ActionType)
		http.Error(w, fmt.Sprintf("Unknown action type: %s", req.ActionType), http.StatusBadRequest)
		return
	}

	if err != nil {
		logger.Printf("[ERROR] 行动执行失败: %v", err)
		http.Error(w, fmt.Sprintf("Action failed: %v", err), http.StatusInternalServerError)
		return
	}

	logger.Printf("[DEBUG] 行动执行完成: success=%v, message=%s", result.Success, result.Message)

	// 应用属性变化
	if len(result.Changes) > 0 {
		logger.Printf("[DEBUG] 处理 %d 个属性变化", len(result.Changes))
		for _, change := range result.Changes {
			logger.Printf("[DEBUG] 属性变化: target=%s, attr=%s, %d -> %d", change.TargetID, change.Attribute, change.OldValue, change.NewValue)
			if err := re.db.UpdateRoleAttribute(change.TargetID, change.Attribute, change.NewValue); err != nil {
				logger.Printf("[ERROR] 更新属性失败：%v", err)
			}
		}
	}

	// 存储事件
	if result.NewEvent != nil {
		logger.Printf("[DEBUG] 存储事件: type=%s, title=%s", result.NewEvent.Type, result.NewEvent.Title)
		if err := re.db.InsertEvent(*result.NewEvent); err != nil {
			logger.Printf("[ERROR] 存储事件失败：%v", err)
		}
	}

	// 返回结果
	logger.Printf("[DEBUG] 返回行动结果")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// DiplomaticStatement 发表外交声明
func (re *RuleEngine) DiplomaticStatement(actorID, targetID, statementType, content string) (*ActionResult, error) {
	actor, err := re.db.GetRoleByID(actorID)
	if err != nil || actor == nil {
		return nil, fmt.Errorf("角色不存在：%s", actorID)
	}
	
	target, err := re.db.GetRoleByID(targetID)
	if err != nil || target == nil {
		return nil, fmt.Errorf("目标角色不存在：%s", targetID)
	}
	
	logger.Printf("[INFO] 外交声明：%s → %s (%s): %s", actorID, targetID, statementType, content)
	
	// 计算关系影响
	relationshipImpact := 0.0
	switch statementType {
	case "support":
		relationshipImpact = 10.0
	case "criticize":
		relationshipImpact = -10.0
	}
	
	// 更新关系
	if err := re.db.UpdateRelation(actorID, targetID, relationshipImpact, 0); err != nil {
		logger.Printf("[WARN] 更新关系失败：%v", err)
	}
	
	// 创建事件
	event := &Event{
		ID:          fmt.Sprintf("stmt_%s_%s_%d", actorID, targetID, time.Now().UnixNano()),
		Timestamp:   time.Now(),
		Location:    target.Name,
		Type:        "diplomacy",
		Title:       getStatementTitle(statementType),
		Description: fmt.Sprintf("%s 对 %s 发表%s声明", actor.Name, target.Name, getStatementTypeName(statementType)),
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
		logger.Printf("[WARN] 存储事件失败：%v", err)
	}
	
	return &ActionResult{
		Success:  true,
		Message:  fmt.Sprintf("外交声明已发表：%s", content),
		NewEvent: event,
	}, nil
}

func getStatementTitle(statementType string) string {
	switch statementType {
	case "support":
		return "支持声明"
	case "criticize":
		return "批评声明"
	default:
		return "中立声明"
	}
}

func getStatementTypeName(statementType string) string {
	switch statementType {
	case "support":
		return "支持"
	case "criticize":
		return "批评"
	default:
		return "中立"
	}
}

// analyzeEventForPM 为事件生成 PM 经济影响分析
func (re *RuleEngine) analyzeEventForPM(event *Event) *PMAnalyzeResponse {
	// 构建 PM 分析请求
	req := PMAnalyzeRequest{
		EventID:     event.ID,
		EventType:   event.Type,
		Location:    event.Location,
		Title:       event.Title,
		Description: event.Description,
	}
	
	// 调用 PM 分析 API（内部调用）
	analysis := analyzeEventImpact(req)
	calculatePriceChanges(analysis)
	
	// 将 PM 分析存入事件 Data 字段
	if event.Data == nil {
		event.Data = make(map[string]interface{})
	}
	event.Data["pm_analysis"] = analysis
	
	return analysis
}
