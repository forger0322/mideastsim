package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"time"
)

// OfflineAIConfig 离线 AI 配置
type OfflineAIConfig struct {
	RoleID             string    `json:"role_id"`              // 国家 ID
	PlayerID           string    `json:"player_id"`            // 玩家 ID
	Enabled            bool      `json:"enabled"`              // 是否启用
	LastPlayerActive   time.Time `json:"last_player_active"`   // 玩家最后活跃时间
	AIControlStartTime time.Time `json:"ai_control_start"`     // AI 接管开始时间
	DecisionStyle      string    `json:"decision_style"`       // 决策风格 (aggressive, defensive, diplomatic)
	PriorityActions    []string  `json:"priority_actions"`     // 优先行动
}

// OfflineAIManager 离线 AI 管理器
type OfflineAIManager struct {
	configs map[string]*OfflineAIConfig // role_id -> config
	db      *Database
}

// NewOfflineAIManager 创建离线 AI 管理器
func NewOfflineAIManager(db *Database) *OfflineAIManager {
	return &OfflineAIManager{
		configs: make(map[string]*OfflineAIConfig),
		db:      db,
	}
}

// InitializeOfflineAI 初始化离线 AI 配置
func (m *OfflineAIManager) InitializeOfflineAI() error {
	// 从数据库加载所有未绑定玩家的国家
	roles, err := m.db.GetAllRoles()
	if err != nil {
		return err
	}

	for _, role := range roles {
		if !role.PlayerID.Valid || role.PlayerID.String == "" {
			// 无玩家的国家，启用 AI 控制
			config := &OfflineAIConfig{
				RoleID:             role.ID,
				PlayerID:           "",
				Enabled:            true,
				LastPlayerActive:   time.Now(),
				AIControlStartTime: time.Now(),
				DecisionStyle:      getAIDecisionStyle(role.ID),
			}
			m.configs[role.ID] = config
			log.Printf("🤖 AI 接管国家：%s (%s)", role.Name, role.ID)
		}
	}

	log.Printf("✅ 离线 AI 管理器初始化完成，接管 %d 个国家", len(m.configs))
	return nil
}

// getAIDecisionStyle 根据国家获取 AI 决策风格
func getAIDecisionStyle(roleID string) string {
	// 根据国家特性设置决策风格
	switch roleID {
	case "USA", "IRN", "RUS", "ISR":
		return "aggressive" // 大国/强势国家
	case "SAU", "ARE", "EGY":
		return "diplomatic" // 温和国家
	case "SYR", "LBN", "YEM":
		return "defensive" // 弱势国家
	default:
		return "balanced"
	}
}

// PlayerDisconnected 玩家断开连接
func (m *OfflineAIManager) PlayerDisconnected(playerID, roleID string) {
	if config, exists := m.configs[roleID]; exists {
		config.LastPlayerActive = time.Now()
		config.Enabled = true
		config.AIControlStartTime = time.Now()
		log.Printf("🔌 玩家 %s 断开，AI 接管 %s", playerID, roleID)
	} else {
		// 创建新配置
		config := &OfflineAIConfig{
			RoleID:             roleID,
			PlayerID:           playerID,
			Enabled:            true,
			LastPlayerActive:   time.Now(),
			AIControlStartTime: time.Now(),
			DecisionStyle:      getAIDecisionStyle(roleID),
		}
		m.configs[roleID] = config
		log.Printf("🆕 AI 接管新国家：%s (玩家：%s)", roleID, playerID)
	}
}

// PlayerReconnected 玩家重新连接
func (m *OfflineAIManager) PlayerReconnected(playerID, roleID string) {
	if config, exists := m.configs[roleID]; exists {
		config.Enabled = false
		config.LastPlayerActive = time.Now()
		log.Printf("✅ 玩家 %s 重连，AI 交出 %s 控制权", playerID, roleID)
	}
}

// GetAIControlledRoles 获取所有 AI 控制的国家
func (m *OfflineAIManager) GetAIControlledRoles() []string {
	var roles []string
	for roleID, config := range m.configs {
		if config.Enabled {
			roles = append(roles, roleID)
		}
	}
	return roles
}

// MakeAIDecision AI 做出决策
func (m *OfflineAIManager) MakeAIDecision(roleID string) *AgentCommand {
	config, exists := m.configs[roleID]
	if !exists || !config.Enabled {
		return nil
	}

	// 根据国家特性和当前局势生成决策
	decision := m.generateDecision(roleID, config)
	
	if decision != nil {
		log.Printf("🤖 AI 决策：%s → %s (%s)", roleID, decision.Action, decision.TargetID)
	}

	return decision
}

// generateDecision 生成具体决策
func (m *OfflineAIManager) generateDecision(roleID string, config *OfflineAIConfig) *AgentCommand {
	// 获取国家信息
	role, err := m.db.GetRoleByID(roleID)
	if err != nil {
		return nil
	}

	// 获取所有关系，然后过滤
	allRelations, err := m.db.GetAllRelations()
	if err != nil {
		return nil
	}
	
	// 过滤出该国的关系
	var relations []Relation
	for _, rel := range allRelations {
		if rel.ActorID == roleID || rel.TargetID == roleID {
			relations = append(relations, rel)
		}
	}

	// 根据决策风格选择行动
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

// makeAggressiveDecision 激进决策
func (m *OfflineAIManager) makeAggressiveDecision(role *Role, relations []Relation) *AgentCommand {
	// 寻找敌对国家
	for _, rel := range relations {
		if rel.Value < 30 && rand.Float64() < 0.3 {
			// 30% 概率对敌对国家采取行动
			actionType := []string{"sanction", "military_exercise", "declare_war"}[rand.Intn(3)]
			return &AgentCommand{
				Action:   actionType,
				TargetID: rel.TargetID,
				Reason:   "AI: 国家安全受到威胁",
				ReasonZh: "AI：国家安全受到威胁",
			}
		}
	}

	// 无敌人则发展军备
	if rand.Float64() < 0.5 {
		return &AgentCommand{
			Action: "build_military",
			Reason: "AI: 增强国防实力",
			ReasonZh: "AI：增强国防实力",
		}
	}

	return nil
}

// makeDefensiveDecision 防御决策
func (m *OfflineAIManager) makeDefensiveDecision(role *Role, relations []Relation) *AgentCommand {
	// 寻找友好国家寻求保护
	for _, rel := range relations {
		if rel.Value > 70 && rand.Float64() < 0.4 {
			return &AgentCommand{
				Action:   "alliance",
				TargetID: rel.TargetID,
				Reason:   "AI: 寻求安全保障",
				ReasonZh: "AI：寻求安全保障",
			}
		}
	}

	// 否则保持中立
	if rand.Float64() < 0.5 {
		return &AgentCommand{
			Action: "statement",
			Data: map[string]interface{}{
				"content": "我们呼吁各方保持克制，通过对话解决争端。",
			},
			Reason: "AI: 呼吁和平",
			ReasonZh: "AI：呼吁和平",
		}
	}

	return nil
}

// makeDiplomaticDecision 外交决策
func (m *OfflineAIManager) makeDiplomaticDecision(role *Role, relations []Relation) *AgentCommand {
	// 寻找改善关系的机会
	for _, rel := range relations {
		if rel.Value >= 30 && rel.Value <= 60 && rand.Float64() < 0.4 {
			return &AgentCommand{
				Action:   "improve_relations",
				TargetID: rel.TargetID,
				Reason:   "AI: 改善双边关系",
				ReasonZh: "AI：改善双边关系",
			}
		}
	}

	// 发表外交声明
	if rand.Float64() < 0.5 {
		return &AgentCommand{
			Action: "statement",
			Data: map[string]interface{}{
				"content": "我们致力于通过外交途径维护地区稳定与繁荣。",
			},
			Reason: "AI: 外交声明",
			ReasonZh: "AI：外交声明",
		}
	}

	return nil
}

// makeBalancedDecision 平衡决策
func (m *OfflineAIManager) makeBalancedDecision(role *Role, relations []Relation) *AgentCommand {
	actions := []string{"statement", "sanction", "military_exercise", "improve_relations"}
	action := actions[rand.Intn(len(actions))]

	// 随机选择一个目标
	if len(relations) > 0 {
		target := relations[rand.Intn(len(relations))]
		return &AgentCommand{
			Action:   action,
			TargetID: target.TargetID,
			Reason:   "AI: 平衡策略",
			ReasonZh: "AI：平衡策略",
		}
	}

	return &AgentCommand{
		Action: "statement",
		Data: map[string]interface{}{
			"content": "我们将根据国家利益做出最佳决策。",
		},
		Reason: "AI: 自主决策",
		ReasonZh: "AI：自主决策",
	}
}

// AgentCommand Agent 指令
type AgentCommand struct {
	Action   string                 `json:"action"`
	TargetID string                 `json:"target_id,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
	Reason   string                 `json:"reason"`
	ReasonZh string                 `json:"reason_zh"`
}

// ExecuteAIActions 执行 AI 行动 (定时调用)
func (m *OfflineAIManager) ExecuteAIActions(ruleEngine *RuleEngine) {
	for roleID := range m.configs {
		if command := m.MakeAIDecision(roleID); command != nil {
			// 执行 AI 决策
			go func(roleID string, cmd *AgentCommand) {
				// 调用规则引擎执行行动
				// 注意：这里需要访问 ruleEngine 的相关方法
				log.Printf("🤖 执行 AI 行动：%s - %s", roleID, cmd.Action)
			}(roleID, command)
		}
	}
}

// GetAIStatus 获取 AI 状态
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

// ToJSON 转换为 JSON
func (m *OfflineAIManager) ToJSON() string {
	data, _ := json.MarshalIndent(m.GetAIStatus(), "", "  ")
	return string(data)
}
