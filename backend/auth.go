package main

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims represents JWT Claims
type Claims struct {
	PlayerID string `json:"player_id"`
	Username string `json:"username"`
	RoleID   string `json:"role_id,omitempty"`
	jwt.RegisteredClaims
}

// AuthService handles authentication
type AuthService struct {
	secret   []byte
	tokenTTL time.Duration
}

// NewAuthService creates a new authentication service
func NewAuthService(secret []byte, ttl time.Duration) *AuthService {
	return &AuthService{
		secret:   secret,
		tokenTTL: ttl,
	}
}

// GenerateToken generates a JWT Token
func (s *AuthService) GenerateToken(playerID, username, roleID string) (string, error) {
	claims := Claims{
		PlayerID: playerID,
		Username: username,
		RoleID:   roleID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.tokenTTL)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// ValidateToken validates a JWT Token
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return s.secret, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, nil
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, nil
	}

	return claims, nil
}
