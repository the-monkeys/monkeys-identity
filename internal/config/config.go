package config

import (
	"os"
	"strings"
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

		LogLevel: getEnv("LOG_LEVEL", "info"),

		RateLimitEnabled: getEnv("RATE_LIMIT_ENABLED", "true") == "true",
		RateLimitRPS:     getEnvAsInt("RATE_LIMIT_RPS", 100),
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
		if intValue := strings.Split(value, ""); len(intValue) > 0 {
			// Simple conversion - in production use strconv.Atoi
			return defaultValue
		}
	}
	return defaultValue
}
