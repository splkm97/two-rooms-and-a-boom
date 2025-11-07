package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a token bucket rate limiter per IP address
type RateLimiter struct {
	buckets map[string]*bucket
	mu      sync.RWMutex
	rate    int           // requests per window
	window  time.Duration // time window
}

type bucket struct {
	tokens     int
	lastRefill time.Time
	mu         sync.Mutex
}

// NewRateLimiter creates a new rate limiter
// rate: maximum number of requests
// window: time window (e.g., 1 minute)
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	limiter := &RateLimiter{
		buckets: make(map[string]*bucket),
		rate:    rate,
		window:  window,
	}

	// Clean up old buckets every 10 minutes
	go limiter.cleanup()

	return limiter
}

// Middleware returns a Gin middleware handler
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !rl.allow(ip) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"code":    "RATE_LIMIT_EXCEEDED",
				"message": "Too many requests, please try again later",
			})
			c.Header("Retry-After", "60") // Retry after 60 seconds
			c.Abort()
			return
		}

		c.Next()
	}
}

// allow checks if a request from the given IP is allowed
func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.RLock()
	b, exists := rl.buckets[ip]
	rl.mu.RUnlock()

	if !exists {
		rl.mu.Lock()
		// Double-check after acquiring write lock
		b, exists = rl.buckets[ip]
		if !exists {
			b = &bucket{
				tokens:     rl.rate,
				lastRefill: time.Now(),
			}
			rl.buckets[ip] = b
		}
		rl.mu.Unlock()
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	// Refill tokens based on elapsed time
	now := time.Now()
	elapsed := now.Sub(b.lastRefill)

	if elapsed >= rl.window {
		// Refill the bucket
		b.tokens = rl.rate
		b.lastRefill = now
	}

	// Check if tokens available
	if b.tokens > 0 {
		b.tokens--
		return true
	}

	return false
}

// cleanup removes old buckets that haven't been used recently
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, b := range rl.buckets {
			b.mu.Lock()
			// Remove if not used in the last hour
			if now.Sub(b.lastRefill) > time.Hour {
				delete(rl.buckets, ip)
			}
			b.mu.Unlock()
		}
		rl.mu.Unlock()
	}
}

// Predefined rate limiters for common use cases
var (
	// RoomListLimiter: 100 requests per minute per IP
	RoomListLimiter = NewRateLimiter(100, 1*time.Minute)

	// RoomCreationLimiter: 10 requests per minute per IP
	RoomCreationLimiter = NewRateLimiter(10, 1*time.Minute)

	// RoomJoinLimiter: 10 requests per minute per IP
	RoomJoinLimiter = NewRateLimiter(10, 1*time.Minute)
)
