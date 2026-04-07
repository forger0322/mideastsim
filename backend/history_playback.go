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

// WorldStateSnapshot represents a world state snapshot
type WorldStateSnapshot struct {
	Timestamp string            `json:"timestamp"`
	EventID   string            `json:"event_id"`
	EventTitle string           `json:"event_title"`
	Roles     map[string]Role   `json:"roles"`
	Relations map[string]Relation `json:"relations"`
	Wars      []War             `json:"wars"`
}

// HistoryPlaybackRequest represents history playback request
type HistoryPlaybackRequest struct {
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
	Interval  int    `json:"interval"` // Seconds, default 60
}

// HistoryEvent represents a historical event (simplified version)
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

// handleGetHistory gets historical event list
func handleGetHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	limit := 100
	eventType := r.URL.Query().Get("type")
	roleID := r.URL.Query().Get("role_id")

	// Get historical events
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

// handleGetEventDetail gets single event detail
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

	// Get countries affected by the event
	affectedRoles := []string{event.ActorID}
	if event.TargetID != "" {
		affectedRoles = append(affectedRoles, event.TargetID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":         "ok",
		"event":          event,
		"affected_roles": affectedRoles,
	})
}

// handlePlaybackSnapshot gets snapshot at a specific point in time
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

	// Parse timestamp
	t, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		http.Error(w, "Invalid timestamp format", http.StatusBadRequest)
		return
	}

	// Get events before this point in time
	events, err := db.GetEventsBefore(t)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Rebuild state at this point in time
	snapshot := rebuildStateAtTime(events, t)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ok",
		"snapshot":  snapshot,
		"timestamp": timestamp,
	})
}

// handleGetTimeline gets timeline (with key event markers)
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

	// Get events within time range
	events, err := db.GetEventsBetween(start, end)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Build timeline
	timeline := buildTimeline(events)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"timeline": timeline,
		"start":   start.Format(time.RFC3339),
		"end":     end.Format(time.RFC3339),
	})
}

// GetHistoryEvents gets historical events (Database method)
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

// GetEventByID gets event by ID
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

// GetEventsBefore gets all events before a specific point in time
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

// GetEventsBetween gets events within a time range
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

// rebuildStateAtTime rebuilds state at a specific point in time
func rebuildStateAtTime(events []HistoryEvent, targetTime time.Time) *WorldStateSnapshot {
	// Get all countries
	allRoles, _ := db.GetAllRoles()

	// Create role map
	rolesMap := make(map[string]Role)
	for _, role := range allRoles {
		rolesMap[role.ID] = role
	}

	// Apply event impact (simplified version, actual needs more complex state rebuilding)
	for _, event := range events {
		eventTime, _ := time.Parse(time.RFC3339, event.Timestamp)
		if eventTime.After(targetTime) {
			break
		}

		// Adjust state based on event type
		applyEventToState(event, rolesMap)
	}

	// Get relations
	allRelations, _ := db.GetAllRelations()
	relationsMap := make(map[string]Relation)
	for _, rel := range allRelations {
		key := fmt.Sprintf("%s_%s", rel.ActorID, rel.TargetID)
		relationsMap[key] = rel
	}

	// Get war status (using existing method from database.go)
	// wars, _ := db.GetActiveWars()

	return &WorldStateSnapshot{
		Timestamp: targetTime.Format(time.RFC3339),
		Roles:     rolesMap,
		Relations: relationsMap,
		Wars:      []War{}, // Simplified implementation
	}
}

// applyEventToState applies event to state (simplified)
func applyEventToState(event HistoryEvent, roles map[string]Role) {
	// Here should adjust country attributes based on event type
	// Simplified implementation: only log event, don't actually modify state
	log.Printf("[DEBUG] Applied historical event: %s - %s", event.ID, event.Title)
}

// buildTimeline builds timeline
func buildTimeline(events []HistoryEvent) []map[string]interface{} {
	timeline := make([]map[string]interface{}, 0)

	// Categorize by severity
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

	// Sort
	sort.Slice(criticalEvents, func(i, j int) bool {
		return criticalEvents[i].Timestamp < criticalEvents[j].Timestamp
	})
	sort.Slice(majorEvents, func(i, j int) bool {
		return majorEvents[i].Timestamp < majorEvents[j].Timestamp
	})

	// Build timeline index
	timeline = append(timeline, map[string]interface{}{
		"label":    "Critical Events",
		"severity": "critical",
		"count":    len(criticalEvents),
		"events":   criticalEvents,
	})

	timeline = append(timeline, map[string]interface{}{
		"label":    "Major Events",
		"severity": "major",
		"count":    len(majorEvents),
		"events":   majorEvents,
	})

	timeline = append(timeline, map[string]interface{}{
		"label":    "Minor Events",
		"severity": "minor",
		"count":    len(minorEvents),
		"events":   minorEvents,
	})

	return timeline
}
