// Package middleware holds cross-cutting HTTP middleware for the API.
package middleware

import (
	"log/slog"
	"net"
	"net/http"
	"sync"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
)

// CORS allows the SPA origin to call the API with credentials (for the refresh cookie).
func CORS(allowOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Vary", "Origin")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RateLimit is a fixed-window, per-client-IP limiter. Used to throttle login
// attempts. Returns 429 with a {message} body when the window's quota is exceeded.
func RateLimit(max int, window time.Duration) func(http.Handler) http.Handler {
	type bucket struct {
		count int
		reset time.Time
	}
	var (
		mu      sync.Mutex
		buckets = make(map[string]*bucket)
	)
	allow := func(ip string) bool {
		mu.Lock()
		defer mu.Unlock()
		now := time.Now()
		b, ok := buckets[ip]
		if !ok || now.After(b.reset) {
			buckets[ip] = &bucket{count: 1, reset: now.Add(window)}
			return true
		}
		b.count++
		return b.count <= max
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}
			if !allow(ip) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"message":"Too many requests, please try again later"}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequestLogger logs method, path, status, and duration for each request.
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		slog.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"bytes", ww.BytesWritten(),
			"duration", time.Since(start).String(),
		)
	})
}
