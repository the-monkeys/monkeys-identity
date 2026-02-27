package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	// Server
	Port           string
	Environment    string
	AllowedOrigins string
	FrontendURL    string

	// Database
	DatabaseURL string
	RedisURL    string

	// Auth
	JWTSecret     string
	JWTExpiration string

	// Logging
	LogLevel string

	// Security
	RateLimitEnabled bool
	RateLimitRPS     int

	// MFA
	MFAIssuer string

	// Email (SMTP)
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string

	// Audit
	AuditRetentionDays int

	// OIDC
	OIDCIssuer    string
	JWTPrivateKey string
	CookieDomain  string
}

func Load() *Config {
	cfg := &Config{
		Port:           getEnv("PORT", "8080"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),
		FrontendURL:    getEnv("FRONTEND_URL", "http://localhost:5173"),

		DatabaseURL: requireEnv("DATABASE_URL"),
		RedisURL:    requireEnv("REDIS_URL"),

		JWTSecret:     requireEnv("JWT_SECRET"),
		JWTExpiration: getEnv("JWT_EXPIRATION", "24h"),

		MFAIssuer: getEnv("MFA_ISSUER", "MonkeysIdentity"),

		SMTPHost:     getEnv("SMTP_HOST", "mailpit"),
		SMTPPort:     getEnvAsInt("SMTP_PORT", 587),
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", "no-reply@monkeys.com"),

		LogLevel:           getEnv("LOG_LEVEL", "info"),
		AuditRetentionDays: getEnvAsInt("AUDIT_RETENTION_DAYS", 90),

		RateLimitEnabled: getEnv("RATE_LIMIT_ENABLED", "true") == "true",
		RateLimitRPS:     getEnvAsInt("RATE_LIMIT_RPS", 100),

		OIDCIssuer:    getEnv("OIDC_ISSUER", "http://localhost:8080"),
		JWTPrivateKey: getEnv("JWT_PRIVATE_KEY", ""),
		CookieDomain:  getEnv("COOKIE_DOMAIN", "localhost"),
	}

	// If JWT_PRIVATE_KEY is empty, try to read from JWT_PRIVATE_KEY_FILE

	if cfg.JWTPrivateKey == "" {
		if keyFile := getEnv("JWT_PRIVATE_KEY_FILE", ""); keyFile != "" {
			data, err := os.ReadFile(keyFile)
			if err == nil {
				cfg.JWTPrivateKey = string(data)
			}
		}
	}

	// Handle escaped newlines in JWT_PRIVATE_KEY (common in .env files)
	if strings.Contains(cfg.JWTPrivateKey, "\\n") {
		cfg.JWTPrivateKey = strings.ReplaceAll(cfg.JWTPrivateKey, "\\n", "\n")
	}

	return cfg
}
// requireEnv reads a mandatory environment variable and panics if unset/empty.
func requireEnv(key string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	panic(fmt.Sprintf("FATAL: required environment variable %s is not set", key))
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}
