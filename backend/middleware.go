package main

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"
)

// ============================================
// CORS 中间件
// ============================================

// CORSMiddleware 跨域资源共享中间件
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 允许所有来源（生产环境应该限制）
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		
		// Private Network Access (RFC 1918) - 允许从公网访问本地资源
		w.Header().Set("Access-Control-Allow-Private-Network", "true")

		// 处理 preflight 请求
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// ============================================
// Session Store
// ============================================
type SessionStore struct {
	sessions map[string]string // playerID -> token
	mu       sync.RWMutex
}

// NewSessionStore 创建 session store
func NewSessionStore() *SessionStore {
	store := &SessionStore{
		sessions: make(map[string]string),
	}

	// 定期清理过期 session
	go func() {
		for range time.Tick(10 * time.Minute) {
			store.mu.Lock()
			// 这里可以添加过期逻辑
			store.mu.Unlock()
		}
	}()

	return store
}

// Set 保存 session
func (s *SessionStore) Set(playerID, token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[playerID] = token
}

// Get 获取 session
func (s *SessionStore) Get(playerID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	token, ok := s.sessions[playerID]
	return token, ok
}

// Delete 删除 session
func (s *SessionStore) Delete(playerID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, playerID)
}

// Count 获取在线玩家数
func (s *SessionStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.sessions)
}

// ============================================
// JWT 中间件
// ============================================

// JWTMiddleware JWT 认证中间件（支持 Agent X-Agent-ID header）
func JWTMiddleware(auth *AuthService, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 优先检查 Agent header（允许 Agent 绕过 JWT 认证）
		agentID := r.Header.Get("X-Agent-ID")
		if agentID != "" {
			logger.Printf("[AUTH] Agent 认证：%s", agentID)
			ctx := context.WithValue(r.Context(), "player_id", agentID)
			ctx = context.WithValue(ctx, "username", agentID)
			ctx = context.WithValue(ctx, "is_agent", true)
			
			// 自动绑定 Agent 到对应角色（如果存在映射）
			if roleID, ok := AgentToRoleID[agentID]; ok {
				ctx = context.WithValue(ctx, "agent_role_id", roleID)
				logger.Printf("[AUTH] Agent %s 绑定到角色 %s", agentID, roleID)
			}
			
			next(w, r.WithContext(ctx))
			return
		}

		// 从 Authorization header 获取 token
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"缺少认证信息"}`, http.StatusUnauthorized)
			return
		}

		// 提取 token (Bearer <token>)
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"error":"无效的认证格式"}`, http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// 验证 token
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, `{"error":"token 无效或已过期"}`, http.StatusUnauthorized)
			return
		}

		// 将玩家信息注入 context
		ctx := context.WithValue(r.Context(), "player_id", claims.PlayerID)
		ctx = context.WithValue(ctx, "username", claims.Username)
		if claims.RoleID != "" {
			ctx = context.WithValue(ctx, "role_id", claims.RoleID)
		}

		next(w, r.WithContext(ctx))
	}
}

// OptionalJWT 可选的 JWT 认证（有 token 则验证，没有也允许）
func OptionalJWT(auth *AuthService, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				claims, err := auth.ValidateToken(parts[1])
				if err == nil {
					ctx = context.WithValue(ctx, "player_id", claims.PlayerID)
					ctx = context.WithValue(ctx, "username", claims.Username)
					if claims.RoleID != "" {
						ctx = context.WithValue(ctx, "role_id", claims.RoleID)
					}
				}
			}
		}

		next(w, r.WithContext(ctx))
	}
}
