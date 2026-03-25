package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"time"
)

// WorldStateSnapshot 世界状态快照
type WorldStateSnapshot struct {
	Timestamp string            `json:"timestamp"`
	EventID   string            `json:"event_id"`
	EventTitle string           `json:"event_title"`
	Roles     map[string]Role   `json:"roles"`
	Relations map[string]Relation `json:"relations"`
	Wars      []War             `json:"wars"`
}

// HistoryPlaybackRequest 历史回放请求
type HistoryPlaybackRequest struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Interval  int    `json:"interval"` // 秒，默认 60
}

// HistoryEvent 历史事件 (简化版)
type HistoryEvent struct {
	ID          string      `json:"id"`
	Type        string      `json:"type"`
	Title       string      `json:"title"`
	TitleZh     string      `json:"title_zh"`
	Description string      `json:"description"`
	Timestamp   string      `json:"timestamp"`
	ActorID     string      `json:"actor_id"`
	TargetID    string      `json:"target_id,omitempty"`
	Severity    int         `json:"severity"`
	Data        interface{} `json:"data,omitempty"`
}

// handleGetHistory 获取历史事件列表
func handleGetHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limit := 100
	eventType := r.URL.Query().Get("type")
	roleID := r.URL.Query().Get("role_id")
	
	// 获取历史事件
	events, err := db.GetHistoryEvents(limit, eventType, roleID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"events": events,
		"count":  len(events),
	})
}

// handleGetEventDetail 获取单个事件详情
func handleGetEventDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	eventID := r.URL.Query().Get("event_id")
	if eventID == "" {
		http.Error(w, "Missing event_id parameter", http.StatusBadRequest)
		return
	}

	event, err := db.GetEventByID(eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// 获取事件影响的国家
	affectedRoles := []string{event.ActorID}
	if event.TargetID != "" {
		affectedRoles = append(affectedRoles, event.TargetID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"event":  event,
		"affected_roles": affectedRoles,
	})
}

// handlePlaybackSnapshot 获取某个时间点的快照
func handlePlaybackSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	timestamp := r.URL.Query().Get("timestamp")
	if timestamp == "" {
		http.Error(w, "Missing timestamp parameter", http.StatusBadRequest)
		return
	}

	// 解析时间
	t, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		http.Error(w, "Invalid timestamp format", http.StatusBadRequest)
		return
	}

	// 获取该时间点之前的事件
	events, err := db.GetEventsBefore(t)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 重建该时间点的状态
	snapshot := rebuildStateAtTime(events, t)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "ok",
		"snapshot": snapshot,
		"timestamp": timestamp,
	})
}

// handleGetTimeline 获取时间线 (带关键事件标记)
func handleGetTimeline(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	startTime := r.URL.Query().Get("start")
	endTime := r.URL.Query().Get("end")
	
	var start, end time.Time
	var err error
	
	if startTime != "" {
		start, err = time.Parse(time.RFC3339, startTime)
		if err != nil {
			http.Error(w, "Invalid start time", http.StatusBadRequest)
			return
		}
	} else {
		start = time.Now().Add(-24 * time.Hour)
	}
	
	if endTime != "" {
		end, err = time.Parse(time.RFC3339, endTime)
		if err != nil {
			http.Error(w, "Invalid end time", http.StatusBadRequest)
			return
		}
	} else {
		end = time.Now()
	}

	// 获取时间范围内的事件
	events, err := db.GetEventsBetween(start, end)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 构建时间线
	timeline := buildTimeline(events)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"timeline": timeline,
		"start":   start.Format(time.RFC3339),
		"end":     end.Format(time.RFC3339),
	})
}

// GetHistoryEvents 获取历史事件 (Database 方法)
func (d *Database) GetHistoryEvents(limit int, eventType, roleID string) ([]HistoryEvent, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `SELECT id, type, title, title_zh, timestamp, actor_id, target_id, severity, data
			  FROM events WHERE 1=1`
	
	args := []interface{}{}
	
	if eventType != "" {
		query += " AND type = ?"
		args = append(args, eventType)
	}
	
	if roleID != "" {
		query += " AND (actor_id = ? OR target_id = ?)"
		args = append(args, roleID, roleID)
	}
	
	query += " ORDER BY timestamp DESC LIMIT ?"
	args = append(args, limit)

	rows, err := d.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []HistoryEvent
	for rows.Next() {
		var event HistoryEvent
		var dataJSON sql.NullString
		err := rows.Scan(
			&event.ID,
			&event.Type,
			&event.Title,
			&event.TitleZh,
			&event.Timestamp,
			&event.ActorID,
			&event.TargetID,
			&event.Severity,
			&dataJSON,
		)
		if err != nil {
			return nil, err
		}
		
		if dataJSON.Valid {
			json.Unmarshal([]byte(dataJSON.String), &event.Data)
		}
		
		events = append(events, event)
	}

	return events, nil
}

// GetEventByID 根据 ID 获取事件
func (d *Database) GetEventByID(eventID string) (*HistoryEvent, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `SELECT id, type, title, title_zh, timestamp, actor_id, target_id, severity, data
			  FROM events WHERE id = ?`
	
	row := d.db.QueryRow(query, eventID)
	
	var event HistoryEvent
	var titleZh, dataJSON sql.NullString
	err := row.Scan(
		&event.ID,
		&event.Type,
		&event.Title,
		&titleZh,
		&event.Timestamp,
		&event.ActorID,
		&event.TargetID,
		&event.Severity,
		&dataJSON,
	)
	if err != nil {
		return nil, err
	}
	
	if titleZh.Valid {
		event.TitleZh = titleZh.String
	}
	if dataJSON.Valid {
		json.Unmarshal([]byte(dataJSON.String), &event.Data)
	}
	
	return &event, nil
}

// GetEventsBefore 获取某个时间点之前的所有事件
func (d *Database) GetEventsBefore(t time.Time) ([]HistoryEvent, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `SELECT id, type, title, title_zh, timestamp, actor_id, target_id, severity, data
			  FROM events WHERE timestamp <= ? ORDER BY timestamp ASC`
	
	rows, err := d.db.Query(query, t.Format(time.RFC3339))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []HistoryEvent
	for rows.Next() {
		var event HistoryEvent
		var dataJSON sql.NullString
		err := rows.Scan(
			&event.ID,
			&event.Type,
			&event.Title,
			&event.TitleZh,
			&event.Timestamp,
			&event.ActorID,
			&event.TargetID,
			&event.Severity,
			&dataJSON,
		)
		if err != nil {
			return nil, err
		}
		
		if dataJSON.Valid {
			json.Unmarshal([]byte(dataJSON.String), &event.Data)
		}
		
		events = append(events, event)
	}

	return events, nil
}

// GetEventsBetween 获取时间范围内的事件
func (d *Database) GetEventsBetween(start, end time.Time) ([]HistoryEvent, error) {
	d.mu.RLock()
	defer d.mu.RUnlock()

	query := `SELECT id, type, title, title_zh, timestamp, actor_id, target_id, severity, data
			  FROM events WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC`
	
	rows, err := d.db.Query(query, start.Format(time.RFC3339), end.Format(time.RFC3339))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []HistoryEvent
	for rows.Next() {
		var event HistoryEvent
		var dataJSON sql.NullString
		err := rows.Scan(
			&event.ID,
			&event.Type,
			&event.Title,
			&event.TitleZh,
			&event.Timestamp,
			&event.ActorID,
			&event.TargetID,
			&event.Severity,
			&dataJSON,
		)
		if err != nil {
			return nil, err
		}
		
		if dataJSON.Valid {
			json.Unmarshal([]byte(dataJSON.String), &event.Data)
		}
		
		events = append(events, event)
	}

	return events, nil
}

// rebuildStateAtTime 重建某个时间点的状态
func rebuildStateAtTime(events []HistoryEvent, targetTime time.Time) *WorldStateSnapshot {
	// 获取所有国家
	allRoles, _ := db.GetAllRoles()
	
	// 创建角色映射
	rolesMap := make(map[string]Role)
	for _, role := range allRoles {
		rolesMap[role.ID] = role
	}
	
	// 应用事件影响 (简化版，实际需要更复杂的状态重建)
	for _, event := range events {
		eventTime, _ := time.Parse(time.RFC3339, event.Timestamp)
		if eventTime.After(targetTime) {
			break
		}
		
		// 根据事件类型调整状态
		applyEventToState(event, rolesMap)
	}
	
	// 获取关系
	allRelations, _ := db.GetAllRelations()
	relationsMap := make(map[string]Relation)
	for _, rel := range allRelations {
		key := fmt.Sprintf("%s_%s", rel.ActorID, rel.TargetID)
		relationsMap[key] = rel
	}
	
	// 获取战争状态 (使用 database.go 中已有的方法)
	// wars, _ := db.GetActiveWars()
	
	return &WorldStateSnapshot{
		Timestamp: targetTime.Format(time.RFC3339),
		Roles:     rolesMap,
		Relations: relationsMap,
		Wars:      []War{}, // 简化实现
	}
}

// applyEventToState 应用事件到状态 (简化)
func applyEventToState(event HistoryEvent, roles map[string]Role) {
	// 这里应该根据事件类型调整国家属性
	// 简化实现：只记录事件，不实际修改状态
	log.Printf("[DEBUG] 应用历史事件：%s - %s", event.ID, event.Title)
}

// buildTimeline 构建时间线
func buildTimeline(events []HistoryEvent) []map[string]interface{} {
	timeline := make([]map[string]interface{}, 0)
	
	// 按严重程度分类
	criticalEvents := []HistoryEvent{}
	majorEvents := []HistoryEvent{}
	minorEvents := []HistoryEvent{}
	
	for _, event := range events {
		if event.Severity >= 8 {
			criticalEvents = append(criticalEvents, event)
		} else if event.Severity >= 5 {
			majorEvents = append(majorEvents, event)
		} else {
			minorEvents = append(minorEvents, event)
		}
	}
	
	// 排序
	sort.Slice(criticalEvents, func(i, j int) bool {
		return criticalEvents[i].Timestamp < criticalEvents[j].Timestamp
	})
	sort.Slice(majorEvents, func(i, j int) bool {
		return majorEvents[i].Timestamp < majorEvents[j].Timestamp
	})
	
	// 构建时间线索引
	timeline = append(timeline, map[string]interface{}{
		"label": "关键事件",
		"severity": "critical",
		"count": len(criticalEvents),
		"events": criticalEvents,
	})
	
	timeline = append(timeline, map[string]interface{}{
		"label": "重大事件",
		"severity": "major",
		"count": len(majorEvents),
		"events": majorEvents,
	})
	
	timeline = append(timeline, map[string]interface{}{
		"label": "普通事件",
		"severity": "minor",
		"count": len(minorEvents),
		"events": minorEvents,
	})
	
	return timeline
}


