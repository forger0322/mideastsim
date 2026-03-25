package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// AgentMemory Agent 记忆条目
type AgentMemory struct {
	ID          string    `json:"id"`
	RoleID      string    `json:"role_id"`      // 国家 ID (如 USA, IRN)
	EventType   string    `json:"event_type"`   // 事件类型 (war, sanction, peace 等)
	EventID     string    `json:"event_id"`     // 关联事件 ID
	Title       string    `json:"title"`        // 记忆标题
	TitleZh     string    `json:"title_zh"`     // 中文标题
	Description string    `json:"description"`  // 记忆描述
	Impact      int       `json:"impact"`       // 影响程度 (1-10)
	Sentiment   float64   `json:"sentiment"`    // 情感倾向 (-1.0 敌对 ~ 1.0 友好)
	Metadata    string    `json:"metadata"`     // JSON 元数据
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`   // 过期时间 (可选)
}

// CreateAgentMemoryTable 创建 Agent 记忆表
func (d *Database) CreateAgentMemoryTable() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`
		CREATE TABLE IF NOT EXISTS agent_memories (
			id TEXT PRIMARY KEY,
			role_id TEXT NOT NULL,
			event_type TEXT NOT NULL,
			event_id TEXT,
			title TEXT NOT NULL,
			title_zh TEXT,
			description TEXT NOT NULL,
			impact INTEGER DEFAULT 5,
			sentiment REAL DEFAULT 0,
			metadata TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP,
			INDEX idx_role_id (role_id),
			INDEX idx_event_type (event_type),
			INDEX idx_created_at (created_at)
		)
	`)

	if err != nil {
		log.Printf("⚠️ 创建 agent_memories 表失败：%v", err)
		return err
	}

	log.Println("✅ Agent 记忆表创建成功")
	return nil
}

// AddAgentMemory 添加 Agent 记忆
func (d *Database) AddAgentMemory(memory *AgentMemory) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	memory.ID = fmt.Sprintf("mem_%d", time.Now().UnixNano())
	memory.CreatedAt = time.Now()

	_, err := d.db.Exec(`
		INSERT INTO agent_memories (id, role_id, event_type, event_id, title, title_zh, description, impact, sentiment, metadata, created_at, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, memory.ID, memory.RoleID, memory.EventType, memory.EventID, memory.Title, memory.TitleZh,
		memory.Description, memory.Impact, memory.Sentiment, memory.Metadata, memory.CreatedAt, memory.ExpiresAt)

	if err != nil {
		log.Printf("⚠️ 添加 Agent 记忆失败：%v", err)
		return err
	}

	log.Printf("🧠 Agent %s 添加记忆：%s (impact=%d)", memory.RoleID, memory.Title, memory.Impact)
	return nil
}

// GetAgentMemories 获取 Agent 记忆 (支持过滤)
func (d *Database) GetAgentMemories(roleID string, eventType string, limit int) ([]AgentMemory, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	var query string
	var args []interface{}

	if eventType != "" {
		query = `
			SELECT id, role_id, event_type, event_id, title, title_zh, description, impact, sentiment, metadata, created_at, expires_at
			FROM agent_memories
			WHERE role_id = ? AND event_type = ?
			ORDER BY created_at DESC
			LIMIT ?
		`
		args = []interface{}{roleID, eventType, limit}
	} else {
		query = `
			SELECT id, role_id, event_type, event_id, title, title_zh, description, impact, sentiment, metadata, created_at, expires_at
			FROM agent_memories
			WHERE role_id = ?
			ORDER BY created_at DESC
			LIMIT ?
		`
		args = []interface{}{roleID, limit}
	}

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var memories []AgentMemory
	for rows.Next() {
		var m AgentMemory
		err := rows.Scan(&m.ID, &m.RoleID, &m.EventType, &m.EventID, &m.Title, &m.TitleZh,
			&m.Description, &m.Impact, &m.Sentiment, &m.Metadata, &m.CreatedAt, &m.ExpiresAt)
		if err != nil {
			return nil, err
		}
		memories = append(memories, m)
	}

	return memories, rows.Err()
}

// GetRecentAgentMemories 获取最近 N 条记忆 (所有 Agent)
func (d *Database) GetRecentAgentMemories(limit int) ([]AgentMemory, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	rows, err := d.db.Query(`
		SELECT id, role_id, event_type, event_id, title, title_zh, description, impact, sentiment, metadata, created_at, expires_at
		FROM agent_memories
		ORDER BY created_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var memories []AgentMemory
	for rows.Next() {
		var m AgentMemory
		err := rows.Scan(&m.ID, &m.RoleID, &m.EventType, &m.EventID, &m.Title, &m.TitleZh,
			&m.Description, &m.Impact, &m.Sentiment, &m.Metadata, &m.CreatedAt, &m.ExpiresAt)
		if err != nil {
			return nil, err
		}
		memories = append(memories, m)
	}

	return memories, rows.Err()
}

// DeleteExpiredAgentMemories 删除过期记忆
func (d *Database) DeleteExpiredAgentMemories() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	result, err := d.db.Exec(`
		DELETE FROM agent_memories
		WHERE expires_at IS NOT NULL AND expires_at < ?
	`, time.Now())

	if err != nil {
		return err
	}

	count, _ := result.RowsAffected()
	if count > 0 {
		log.Printf("🧹 清理 %d 条过期 Agent 记忆", count)
	}

	return nil
}

// CreateAgentMemoryFromEvent 从事件创建 Agent 记忆 (自动分析事件影响)
func (re *RuleEngine) CreateAgentMemoryFromEvent(event *Event) {
	// 确定涉及的国家
	involvedCountries := []string{}
	if event.ActorID != "" {
		involvedCountries = append(involvedCountries, event.ActorID)
	}
	if event.TargetID != "" {
		involvedCountries = append(involvedCountries, event.TargetID)
	}

	// 为每个涉及的国家创建记忆
	for _, countryID := range involvedCountries {
		memory := &AgentMemory{
			RoleID:      countryID,
			EventType:   event.Type,
			EventID:     event.ID,
			Title:       event.Title,
			TitleZh:     event.TitleZh,
			Description: event.Description,
			Impact:      event.Severity,
			CreatedAt:   event.Timestamp,
		}

		// 根据事件类型设置情感倾向和元数据
		switch event.Type {
		case "military":
			if event.TargetID == countryID {
				// 被攻击 → 负面情感
				memory.Sentiment = -0.8
				memory.Metadata = `{"relation_impact": "negative", "threat_level": "high"}`
			} else {
				// 攻击方 → 正面情感 (对自己的行动)
				memory.Sentiment = 0.3
				memory.Metadata = `{"relation_impact": "assertive", "threat_level": "medium"}`
			}

		case "economic":
			if event.TargetID == countryID {
				// 被制裁 → 负面情感
				memory.Sentiment = -0.6
				memory.Metadata = `{"economic_impact": "negative"}`
			} else {
				memory.Sentiment = 0.2
				memory.Metadata = `{"economic_impact": "pressure"}`
			}

		case "diplomacy":
			// 外交事件通常中性或略正面
			memory.Sentiment = 0.1
			memory.Metadata = `{"diplomatic_impact": "neutral"}`

		default:
			memory.Sentiment = 0
			memory.Metadata = `{}`
		}

		// 设置过期时间 (严重事件记忆更久)
		if event.Severity >= 8 {
			memory.ExpiresAt = time.Now().Add(72 * time.Hour) // 重大事件记忆 3 天
		} else if event.Severity >= 5 {
			memory.ExpiresAt = time.Now().Add(24 * time.Hour) // 中等事件记忆 1 天
		} else {
			memory.ExpiresAt = time.Now().Add(6 * time.Hour) // 小事件记忆 6 小时
		}

		// 存储记忆
		re.db.AddAgentMemory(memory)
	}
}

// HasMemoryOfType 检查 Agent 是否有某类记忆 (用于避免重复响应)
func (d *Database) HasMemoryOfType(roleID string, eventType string, hours int) bool {
	d.mu.RLock()
	defer d.mu.RUnlock()

	cutoffTime := time.Now().Add(-time.Duration(hours) * time.Hour)

	var count int
	err := d.db.QueryRow(`
		SELECT COUNT(*) FROM agent_memories
		WHERE role_id = ? AND event_type = ? AND created_at > ?
	`, roleID, eventType, cutoffTime)

	if err != nil {
		return false
	}

	return count > 0
}

// GetAgentSentimentTowards 获取 Agent 对目标国家的情感倾向
func (d *Database) GetAgentSentimentTowards(agentRoleID, targetRoleID string, hours int) float64 {
	d.mu.RLock()
	defer d.mu.RUnlock()

	cutoffTime := time.Now().Add(-time.Duration(hours) * time.Hour)

	var avgSentiment sql.NullFloat64
	err := d.db.QueryRow(`
		SELECT AVG(sentiment) FROM agent_memories
		WHERE role_id = ? AND metadata LIKE ? AND created_at > ?
	`, agentRoleID, `%`+targetRoleID+`%`, cutoffTime)

	if err != nil || !avgSentiment.Valid {
		return 0 // 默认中性
	}

	return avgSentiment.Float64
}
