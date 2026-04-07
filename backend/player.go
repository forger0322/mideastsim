package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// PlayerService handles player operations
type PlayerService struct {
	db    *Database
	auth  *AuthService
	store *SessionStore
}

// NewPlayerService creates a new player service
func NewPlayerService(db *Database, auth *AuthService, store *SessionStore) *PlayerService {
	return &PlayerService{
		db:    db,
		auth:  auth,
		store: store,
	}
}

// RegisterRequest represents registration request
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email,omitempty"`
	Password string `json:"password"`
}

// LoginRequest represents login request
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Token      string   `json:"token"`
	Player     *Player  `json:"player"`
	ExpiresIn  int64    `json:"expires_in"`
}

// Player represents a player
type Player struct {
	ID           string       `json:"id"`
	Username     string       `json:"username"`
	Email        sql.NullString `json:"email,omitempty"`
	RoleID       sql.NullString `json:"role_id,omitempty"`
	RoleName     string       `json:"role_name,omitempty"`
	Faction      string       `json:"faction,omitempty"`
	IsOnline     bool         `json:"is_online"`
	LastActive   time.Time    `json:"last_active"`
	CreatedAt    time.Time    `json:"created_at"`
}

// Register registers a new player
func (s *PlayerService) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request format"}", http.StatusBadRequest)
		return
	}

	if req.Username == "" {
		http.Error(w, `{"error":"Username cannot be empty"}`, http.StatusBadRequest)
		return
	}

	if len(req.Password) < 4 {
		http.Error(w, `{"error":"Password must be at least 4 characters"}`, http.StatusBadRequest)
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ Password hashing failed: %v", err)
		http.Error(w, `{"error":"Server error"}`, http.StatusInternalServerError)
		return
	}

	// Generate player ID
	playerID := uuid.New().String()

	// Insert player
	_, err = s.db.db.Exec(`
		INSERT INTO players (id, username, email, password_hash)
		VALUES (?, ?, ?, ?)
	`, playerID, req.Username, req.Email, string(hashedPassword))

	if err != nil {
		http.Error(w, `{"error":"Username already exists"}`, http.StatusConflict)
		return
	}

	// New player doesn't automatically bind a role, player chooses on frontend
	roleID := ""

	// Generate token
	token, err := s.auth.GenerateToken(playerID, req.Username, roleID)
	if err != nil {
		http.Error(w, `{"error":"Failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	player := &Player{
		ID:         playerID,
		Username:   req.Username,
		IsOnline:   true,
		LastActive: time.Now(),
	}

	// Save to session store
	s.store.Set(playerID, token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{
		Token:     token,
		Player:    player,
		ExpiresIn: int64(s.auth.tokenTTL.Seconds()),
	})
}

// Login handles player login
func (s *PlayerService) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request format"}`, http.StatusBadRequest)
		return
	}

	if req.Username == "" {
		http.Error(w, `{"error":"Username cannot be empty"}`, http.StatusBadRequest)
		return
	}

	if req.Password == "" {
		http.Error(w, `{"error":"Password cannot be empty"}`, http.StatusBadRequest)
		return
	}

	// Query player (includes password_hash)
	var player Player
	var roleID, email sql.NullString
	var lastLogin, createdAt sql.NullTime
	var passwordHash sql.NullString
	err := s.db.db.QueryRow(`
		SELECT id, username, email, role_id, last_login, created_at, password_hash
		FROM players WHERE username = ?
	`, req.Username).Scan(
		&player.ID, &player.Username, &email, &roleID,
		&lastLogin, &createdAt, &passwordHash,
	)

	player.Email = email
	if lastLogin.Valid {
		player.LastActive = lastLogin.Time
	} else {
		player.LastActive = time.Now()
	}
	if createdAt.Valid {
		player.CreatedAt = createdAt.Time
	} else {
		player.CreatedAt = time.Now()
	}

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"Invalid username or password"}`, http.StatusUnauthorized)
		return
	}

	if err != nil {
		log.Printf("❌ Query player failed: %v", err)
		http.Error(w, `{"error":"Query failed: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// Verify password
	if passwordHash.Valid {
		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash.String), []byte(req.Password)); err != nil {
			http.Error(w, `{"error":"Invalid username or password"}`, http.StatusUnauthorized)
			return
		}
	} else {
		// Old data has no password, allow login (backward compatibility)
		log.Printf("⚠️ User %s has no password hash, allowing login (old data)", req.Username)
	}

	// If role bound, get role information
	if roleID.Valid {
		player.RoleID = roleID
		role, _ := s.db.GetRoleByID(roleID.String)
		if role != nil {
			player.RoleName = role.Name
			player.Faction = role.Faction
		}
	}

	// Generate token
	token, err := s.auth.GenerateToken(player.ID, player.Username, roleID.String)
	if err != nil {
		http.Error(w, `{"error":"Failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	// Update last active time
	s.db.db.Exec(`UPDATE players SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, player.ID)

	// Save to session store
	s.store.Set(player.ID, token)

	player.IsOnline = true

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{
		Token:     token,
		Player:    &player,
		ExpiresIn: int64(s.auth.tokenTTL.Seconds()),
	})
}

// ClaimRoleRequest represents select country request
type ClaimRoleRequest struct {
	RoleID string `json:"role_id"`
}

// ClaimRole selects a country (binds player to role)
func (s *PlayerService) ClaimRole(w http.ResponseWriter, r *http.Request) {
	// Get player information from context
	playerID, ok := r.Context().Value("player_id").(string)
	if !ok {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
	return
	}

	currentRoleIDVal := r.Context().Value("role_id")
	currentRoleID := ""
	if currentRoleIDVal != nil {
		currentRoleID, _ = currentRoleIDVal.(string)
	}

	// Check if already bound to a role
	if currentRoleID != "" {
		http.Error(w, `{"error":"Already bound to a country, cannot select again"}`, http.StatusConflict)
		return
	}

	var req ClaimRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Invalid request format"}`, http.StatusBadRequest)
		return
	}

	// Check if role exists and is available
	role, err := s.db.GetRoleByID(req.RoleID)
	if err != nil {
		http.Error(w, `{"error":"Failed to query role"}`, http.StatusInternalServerError)
		return
	}

	if role == nil {
		http.Error(w, `{"error":"Role does not exist"}`, http.StatusNotFound)
		return
	}

	if role.PlayerID.Valid {
		http.Error(w, `{"error":"This country is already selected by another player"}`, http.StatusConflict)
		return
	}

	if !role.IsAlive {
		http.Error(w, `{"error":"This country is already destroyed"}`, http.StatusConflict)
		return
	}

	// Bind player to role
	err = s.db.SetRolePlayer(req.RoleID, playerID)
	if err != nil {
		http.Error(w, `{"error":"Binding failed"}`, http.StatusInternalServerError)
		return
	}

	// Update player's role_id
	_, err = s.db.db.Exec(`
		UPDATE players SET role_id = ? WHERE id = ?
	`, req.RoleID, playerID)

	if err != nil {
		http.Error(w, `{"error":"Failed to update player information"}`, http.StatusInternalServerError)
		return
	}

	// Regenerate token with role_id
	token, err := s.auth.GenerateToken(playerID, r.Context().Value("username").(string), req.RoleID)
	if err != nil {
		http.Error(w, `{"error":"Failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"token":   token,
		"role": map[string]interface{}{
			"id":          role.ID,
			"name":        role.Name,
			"faction":     role.Faction,
			"attributes":  role.Attributes,
		},
	})
}

// ReleaseRole releases a country (player goes offline)
func (s *PlayerService) ReleaseRole(w http.ResponseWriter, r *http.Request) {
	playerID := r.Context().Value("player_id").(string)

	err := s.db.ReleaseRoleByPlayer(playerID)
	if err != nil {
		http.Error(w, `{"error":"Release failed"}`, http.StatusInternalServerError)
		return
	}

	// Update player's role_id
	_, err = s.db.db.Exec(`
		UPDATE players SET role_id = NULL WHERE id = ?
	`, playerID)

	if err != nil {
		http.Error(w, `{"error":"Failed to update player information"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Country released",
	})
}

// GetAvailableRoles gets list of available countries
func (s *PlayerService) GetAvailableRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := s.db.GetAllRoles()
	if err != nil {
		log.Printf("❌ GetAllRoles error: %v", err)
		http.Error(w, `{"error":"Query failed"}`, http.StatusInternalServerError)
		return
	}

	log.Printf("📊 Total roles: %d", len(roles))

	// Filter out available countries
	var available []map[string]interface{}
	for _, role := range roles {
		log.Printf("  - %s (%s): IsAlive=%v, PlayerID.Valid=%v", role.ID, role.Name, role.IsAlive, role.PlayerID.Valid)
		if role.IsAlive && !role.PlayerID.Valid {
			available = append(available, map[string]interface{}{
				"id":          role.ID,
				"name":        role.Name,
				"name_en":     role.NameEn,
				"faction":     role.Faction,
				"attributes":  role.Attributes,
			})
		}
	}

	log.Printf("✅ Available roles: %d", len(available))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"available_roles": available,
		"total":           len(available),
	})
}

// GetPlayerInfo gets player information
func (s *PlayerService) GetPlayerInfo(w http.ResponseWriter, r *http.Request) {
	playerID, ok := r.Context().Value("player_id").(string)
	if !ok {
		http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var player Player
	var roleID sql.NullString
	var lastLogin, createdAt sql.NullTime
	err := s.db.db.QueryRow(`
		SELECT id, username, email, role_id, last_login, created_at
		FROM players WHERE id = ?
	`, playerID).Scan(
		&player.ID, &player.Username, &player.Email, &roleID,
		&lastLogin, &createdAt,
	)

	if lastLogin.Valid {
		player.LastActive = lastLogin.Time
	}
	if createdAt.Valid {
		player.CreatedAt = createdAt.Time
	}

	if err != nil {
		http.Error(w, `{"error":"Query failed"}`, http.StatusInternalServerError)
		return
	}

	// If role bound, get role information
	if roleID.Valid {
		player.RoleID = roleID
		role, _ := s.db.GetRoleByID(roleID.String)
		if role != nil {
			player.RoleName = role.Name
			player.Faction = role.Faction
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"player": player,
	})
}
