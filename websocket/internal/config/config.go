package config

import (
	"os"
)

// Config holds the application configuration.
type Config struct {
	Port         string
	RedisAddr    string
	AllowedOrigins string
}

// LoadConfig loads configuration from environment variables with fallback defaults.
func LoadConfig() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		RedisAddr:      getEnv("REDIS_ADDR", "localhost:6379"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "*"),
	}
}

func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return defaultVal
}
