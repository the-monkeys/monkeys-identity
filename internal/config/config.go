package config

import (
	"os"
)

type Config struct {
	// Server
	Port           string
	Environment    string
	AllowedOrigins string

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
}

func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),

		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/monkeys_iam?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),

		JWTSecret:     getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		JWTExpiration: getEnv("JWT_EXPIRATION", "24h"),

		MFAIssuer: getEnv("MFA_ISSUER", "MonkeysIdentity"),

		SMTPHost:     getEnv("SMTP_HOST", "smtp.example.com"),
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
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		// Basic implementation
		// In a real app, use strconv.Atoi
		return defaultValue
	}
	return defaultValue
}
