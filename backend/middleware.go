package main

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"
)

// ============================================
// CORS Middleware
// ============================================

// CORSMiddleware is CORS middleware
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow all origins (should be restricted in production)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		// Private Network Access (RFC 1918) - allow accessing local resources from public network
		w.Header().Set("Access-Control-Allow-Private-Network", "true")

		// Handle preflight request
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

// NewSessionStore creates a new session store
func NewSessionStore() *SessionStore {
	store := &SessionStore{
		sessions: make(map[string]string),
	}

	// Periodically clean up expired sessions
	go func() {
		for range time.Tick(10 * time.Minute) {
			store.mu.Lock()
			// Expiration logic can be added here
			store.mu.Unlock()
		}
	}()

	return store
}

// Set saves a session
func (s *SessionStore) Set(playerID, token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[playerID] = token
}

// Get gets a session
func (s *SessionStore) Get(playerID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	token, ok := s.sessions[playerID]
	return token, ok
}

// Delete deletes a session
func (s *SessionStore) Delete(playerID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.sessions, playerID)
}

// Count gets number of online players
func (s *SessionStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.sessions)
}

// ============================================
// JWT Middleware
// ============================================

// JWTMiddleware is JWT authentication middleware (supports Agent X-Agent-ID header)
func JWTMiddleware(auth *AuthService, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check Agent header first (allows Agent to bypass JWT auth)
		agentID := r.Header.Get("X-Agent-ID")
		if agentID != "" {
			logger.Printf("[AUTH] Agent authentication: %s", agentID)
			ctx := context.WithValue(r.Context(), "player_id", agentID)
			ctx = context.WithValue(ctx, "username", agentID)
			ctx = context.WithValue(ctx, "is_agent", true)

			// Auto bind Agent to corresponding role (if mapping exists)
			if roleID, ok := AgentToRoleID[agentID]; ok {
				ctx = context.WithValue(ctx, "agent_role_id", roleID)
				logger.Printf("[AUTH] Agent %s bound to role %s", agentID, roleID)
			}

			next(w, r.WithContext(ctx))
			return
		}

		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"Missing authentication"}`, http.StatusUnauthorized)
			return
		}

		// Extract token (Bearer <token>)
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"error":"Invalid authentication format"}`, http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// Verify token
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			http.Error(w, `{"error":"token invalid or expired"}`, http.StatusUnauthorized)
			return
		}

		// Inject player information into context
		ctx := context.WithValue(r.Context(), "player_id", claims.PlayerID)
		ctx = context.WithValue(ctx, "username", claims.Username)
		if claims.RoleID != "" {
			ctx = context.WithValue(ctx, "role_id", claims.RoleID)
		}

		next(w, r.WithContext(ctx))
	}
}

// OptionalJWT is optional JWT authentication (verify token if present, allow without token)
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
