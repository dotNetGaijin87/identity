package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	Env             string
	Port            string
	DatabaseURL     string
	CORSAllowOrigin string
	OIDCBaseURL     string
	SessionTTL      time.Duration
}

func Load() (Config, error) {
	c := Config{
		Env:             getenv("APP_ENV", "development"),
		Port:            getenv("PORT", "8080"),
		DatabaseURL:     getenv("DATABASE_URL", "postgres://idp:idp@localhost:5432/idp?sslmode=disable"),
		CORSAllowOrigin: getenv("CORS_ALLOW_ORIGIN", "http://localhost:5173"),
		OIDCBaseURL:     getenv("OIDC_BASE_URL", "http://localhost:8080"),
		SessionTTL:      7 * 24 * time.Hour,
	}
	if c.DatabaseURL == "" {
		return c, fmt.Errorf("DATABASE_URL is required")
	}
	return c, nil
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
