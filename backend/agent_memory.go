package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// AgentMemory represents an Agent memory entry
type AgentMemory struct {
	ID          string    `json:"id"`
	RoleID      string    `json:"role_id"`      // Country ID (e.g., USA, IRN)
	EventType   string    `json:"event_type"`   // Event type (war, sanction, peace, etc.)
	EventID     string    `json:"event_id"`     // Associated event ID
	Title       string    `json:"title"`        // Memory title
	TitleZh     string    `json:"title_zh"`     // Chinese title
	Description string    `json:"description"`  // Memory description
	Impact      int       `json:"impact"`       // Impact level (1-10)
	Sentiment   float64   `json:"sentiment"`    // Sentiment (-1.0 hostile ~ 1.0 friendly)
	Metadata    string    `json:"metadata"`     // JSON metadata
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`   // Expiration time (optional)
}

// CreateAgentMemoryTable creates the Agent memory table
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
		log.Printf("⚠️ Failed to create agent_memories table: %v", err)
		return err
	}

	log.Println("✅ Agent memory table created successfully")
	return nil
}

// AddAgentMemory adds an Agent memory
func (d *Database) AddAgentMemory(memory *AgentMemory) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	memory.ID = fmt.Sprintf("mem_%d", time.Now().UnixNano())
	memory.CreatedAt = time.Now()

	_, err := d.db.Exec(`
		INSERT INTO agent_memories (id, role_id, event_type, event_id, title, title_zh, description, impact, sentiment, metadata, created_at, expires_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, memory.ID, memory.RoleID, memory.EventType, memory.EventID, memory.Title, memory.TitleZh,
		memory.Description, memory.Impact, memory.Sentiment, memory.Metadata, memory.CreatedAt, memory.ExpiresAt)

	if err != nil {
		log.Printf("⚠️ Failed to add Agent memory: %v", err)
		return err
	}

	log.Printf("🧠 Agent %s added memory: %s (impact=%d)", memory.RoleID, memory.Title, memory.Impact)
	return nil
}

// GetAgentMemories gets Agent memories (supports filtering)
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
		var expiresAt sql.NullTime
		err := rows.Scan(
			&m.ID, &m.RoleID, &m.EventType, &m.EventID, &m.Title, &m.TitleZh, &m.Description,
			&m.Impact, &m.Sentiment, &m.Metadata, &m.CreatedAt, &expiresAt,
		)
		if err != nil {
			return nil, err
		}
		if expiresAt.Valid {
			m.ExpiresAt = expiresAt.Time
		}
		memories = append(memories, m)
	}

	return memories, rows.Err()
}

// DeleteExpiredMemories deletes expired memory entries
func (d *Database) DeleteExpiredMemories() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	result, err := d.db.Exec(`
		DELETE FROM agent_memories
		WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
	`)
	if err != nil {
		return err
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("🧹 Cleaned up %d expired Agent memories", rowsAffected)
	}

	return nil
}

// ClearAgentMemories clears all memories for a specific role
func (d *Database) ClearAgentMemories(roleID string) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	_, err := d.db.Exec(`DELETE FROM agent_memories WHERE role_id = ?`, roleID)
	if err != nil {
		return err
	}

	log.Printf("🧹 Cleared all memories for Agent %s", roleID)
	return nil
}
