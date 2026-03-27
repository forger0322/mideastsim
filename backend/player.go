package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// PlayerService 玩家服务
type PlayerService struct {
	db    *Database
	auth  *AuthService
	store *SessionStore
}

// NewPlayerService 创建玩家服务
func NewPlayerService(db *Database, auth *AuthService, store *SessionStore) *PlayerService {
	return &PlayerService{
		db:    db,
		auth:  auth,
		store: store,
	}
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email,omitempty"`
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username"`
}

// AuthResponse 认证响应
type AuthResponse struct {
	Token      string   `json:"token"`
	Player     *Player  `json:"player"`
	ExpiresIn  int64    `json:"expires_in"`
}

// Player 玩家
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

// Register 注册新玩家
func (s *PlayerService) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"无效的请求格式"}`, http.StatusBadRequest)
		return
	}

	if req.Username == "" {
		http.Error(w, `{"error":"用户名不能为空"}`, http.StatusBadRequest)
		return
	}

	// 生成玩家 ID
	playerID := uuid.New().String()

	// 插入玩家
	_, err := s.db.db.Exec(`
		INSERT INTO players (id, username, email)
		VALUES (?, ?, ?)
	`, playerID, req.Username, req.Email)

	if err != nil {
		http.Error(w, `{"error":"用户名已存在"}`, http.StatusConflict)
		return
	}

	// 新玩家不自动绑定角色，由玩家在前端自主选择
	roleID := ""

	// 生成 token
	token, err := s.auth.GenerateToken(playerID, req.Username, roleID)
	if err != nil {
		http.Error(w, `{"error":"生成 token 失败"}`, http.StatusInternalServerError)
		return
	}

	player := &Player{
		ID:         playerID,
		Username:   req.Username,
		IsOnline:   true,
		LastActive: time.Now(),
	}

	// 保存到 session store
	s.store.Set(playerID, token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{
		Token:     token,
		Player:    player,
		ExpiresIn: int64(s.auth.tokenTTL.Seconds()),
	})
}

// Login 登录
func (s *PlayerService) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"无效的请求格式"}`, http.StatusBadRequest)
		return
	}

	if req.Username == "" {
		http.Error(w, `{"error":"用户名不能为空"}`, http.StatusBadRequest)
		return
	}

	// 查询玩家
	var player Player
	var roleID, email sql.NullString
	var lastLogin, createdAt sql.NullTime
	err := s.db.db.QueryRow(`
		SELECT id, username, email, role_id, last_login, created_at
		FROM players WHERE username = ?
	`, req.Username).Scan(
		&player.ID, &player.Username, &email, &roleID,
		&lastLogin, &createdAt,
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
		// 自动注册
		player.ID = uuid.New().String()
		player.Username = req.Username
		player.LastActive = time.Now()
		player.CreatedAt = time.Now()

		_, err := s.db.db.Exec(`
			INSERT INTO players (id, username)
			VALUES (?, ?)
		`, player.ID, player.Username)

		if err != nil {
			log.Printf("❌ 创建玩家失败：%v", err)
			http.Error(w, `{"error":"创建玩家失败"}`, http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		log.Printf("❌ 查询玩家失败：%v", err)
		http.Error(w, `{"error":"查询失败：`+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// 如果有绑定的角色，获取角色信息
	if roleID.Valid {
		player.RoleID = roleID
		role, _ := s.db.GetRoleByID(roleID.String)
		if role != nil {
			player.RoleName = role.Name
			player.Faction = role.Faction
		}
	}

	// 生成 token
	token, err := s.auth.GenerateToken(player.ID, player.Username, roleID.String)
	if err != nil {
		http.Error(w, `{"error":"生成 token 失败"}`, http.StatusInternalServerError)
		return
	}

	// 更新最后活跃时间
	s.db.db.Exec(`UPDATE players SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, player.ID)

	// 保存到 session store
	s.store.Set(player.ID, token)

	player.IsOnline = true

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{
		Token:     token,
		Player:    &player,
		ExpiresIn: int64(s.auth.tokenTTL.Seconds()),
	})
}

// ClaimRoleRequest 选择国家请求
type ClaimRoleRequest struct {
	RoleID string `json:"role_id"`
}

// ClaimRole 选择国家（绑定玩家到角色）
func (s *PlayerService) ClaimRole(w http.ResponseWriter, r *http.Request) {
	// 从 context 获取玩家信息
	playerID, ok := r.Context().Value("player_id").(string)
	if !ok {
		http.Error(w, `{"error":"未认证"}`, http.StatusUnauthorized)
		return
	}
	
	currentRoleIDVal := r.Context().Value("role_id")
	currentRoleID := ""
	if currentRoleIDVal != nil {
		currentRoleID, _ = currentRoleIDVal.(string)
	}

	// 检查是否已经绑定角色
	if currentRoleID != "" {
		http.Error(w, `{"error":"已绑定国家，无法重复选择"}`, http.StatusConflict)
		return
	}

	var req ClaimRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"无效的请求格式"}`, http.StatusBadRequest)
		return
	}

	// 检查角色是否存在且可用
	role, err := s.db.GetRoleByID(req.RoleID)
	if err != nil {
		http.Error(w, `{"error":"查询角色失败"}`, http.StatusInternalServerError)
		return
	}

	if role == nil {
		http.Error(w, `{"error":"角色不存在"}`, http.StatusNotFound)
		return
	}

	if role.PlayerID.Valid {
		http.Error(w, `{"error":"该国家已被其他玩家选择"}`, http.StatusConflict)
		return
	}

	if !role.IsAlive {
		http.Error(w, `{"error":"该国家已灭亡"}`, http.StatusConflict)
		return
	}

	// 绑定玩家到角色
	err = s.db.SetRolePlayer(req.RoleID, playerID)
	if err != nil {
		http.Error(w, `{"error":"绑定失败"}`, http.StatusInternalServerError)
		return
	}

	// 更新玩家的 role_id
	_, err = s.db.db.Exec(`
		UPDATE players SET role_id = ? WHERE id = ?
	`, req.RoleID, playerID)

	if err != nil {
		http.Error(w, `{"error":"更新玩家信息失败"}`, http.StatusInternalServerError)
		return
	}

	// 重新生成包含 role_id 的 token
	token, err := s.auth.GenerateToken(playerID, r.Context().Value("username").(string), req.RoleID)
	if err != nil {
		http.Error(w, `{"error":"生成 token 失败"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"token":   token,
		"role": map[string]interface{}{
			"id":       role.ID,
			"name":     role.Name,
			"faction":  role.Faction,
			"attributes": role.Attributes,
		},
	})
}

// ReleaseRole 释放国家（玩家离线）
func (s *PlayerService) ReleaseRole(w http.ResponseWriter, r *http.Request) {
	playerID := r.Context().Value("player_id").(string)

	err := s.db.ReleaseRoleByPlayer(playerID)
	if err != nil {
		http.Error(w, `{"error":"释放失败"}`, http.StatusInternalServerError)
		return
	}

	// 更新玩家的 role_id
	_, err = s.db.db.Exec(`
		UPDATE players SET role_id = NULL WHERE id = ?
	`, playerID)

	if err != nil {
		http.Error(w, `{"error":"更新玩家信息失败"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "已释放国家",
	})
}

// GetAvailableRoles 获取可选国家列表
func (s *PlayerService) GetAvailableRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := s.db.GetAllRoles()
	if err != nil {
		log.Printf("❌ GetAllRoles error: %v", err)
		http.Error(w, `{"error":"查询失败"}`, http.StatusInternalServerError)
		return
	}

	log.Printf("📊 总角色数：%d", len(roles))

	// 过滤出可用的国家
	var available []map[string]interface{}
	for _, role := range roles {
		log.Printf("  - %s (%s): IsAlive=%v, PlayerID.Valid=%v", role.ID, role.Name, role.IsAlive, role.PlayerID.Valid)
		if role.IsAlive && !role.PlayerID.Valid {
			available = append(available, map[string]interface{}{
				"id":         role.ID,
				"name":       role.Name,
				"name_en":    role.NameEn,
				"faction":    role.Faction,
				"attributes": role.Attributes,
			})
		}
	}

	log.Printf("✅ 可用角色数：%d", len(available))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"available_roles": available,
		"total":           len(available),
	})
}

// GetPlayerInfo 获取玩家信息
func (s *PlayerService) GetPlayerInfo(w http.ResponseWriter, r *http.Request) {
	playerID, ok := r.Context().Value("player_id").(string)
	if !ok {
		http.Error(w, `{"error":"未认证"}`, http.StatusUnauthorized)
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
		http.Error(w, `{"error":"查询失败"}`, http.StatusInternalServerError)
		return
	}

	// 如果有绑定的角色，获取角色信息
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
