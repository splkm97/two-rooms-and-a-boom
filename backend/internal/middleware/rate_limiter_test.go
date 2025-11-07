package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimiter_Allow(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Allows requests within limit", func(t *testing.T) {
		limiter := NewRateLimiter(5, 1*time.Minute)

		// Should allow 5 requests
		for i := 0; i < 5; i++ {
			if !limiter.allow("192.168.1.1") {
				t.Errorf("Request %d should be allowed", i+1)
			}
		}
	})

	t.Run("Blocks requests over limit", func(t *testing.T) {
		limiter := NewRateLimiter(3, 1*time.Minute)

		// Allow 3 requests
		for i := 0; i < 3; i++ {
			limiter.allow("192.168.1.2")
		}

		// 4th request should be blocked
		if limiter.allow("192.168.1.2") {
			t.Error("Request should be blocked after exceeding limit")
		}
	})

	t.Run("Different IPs have separate limits", func(t *testing.T) {
		limiter := NewRateLimiter(2, 1*time.Minute)

		// IP 1: Use up its limit
		limiter.allow("192.168.1.3")
		limiter.allow("192.168.1.3")

		// IP 2: Should still be allowed
		if !limiter.allow("192.168.1.4") {
			t.Error("Different IP should have its own limit")
		}
	})

	t.Run("Refills after time window", func(t *testing.T) {
		limiter := NewRateLimiter(2, 100*time.Millisecond)

		// Use up limit
		limiter.allow("192.168.1.5")
		limiter.allow("192.168.1.5")

		// Should be blocked
		if limiter.allow("192.168.1.5") {
			t.Error("Should be blocked before refill")
		}

		// Wait for refill
		time.Sleep(150 * time.Millisecond)

		// Should be allowed again
		if !limiter.allow("192.168.1.5") {
			t.Error("Should be allowed after refill")
		}
	})
}

func TestRateLimiter_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Allows requests within limit", func(t *testing.T) {
		limiter := NewRateLimiter(5, 1*time.Minute)
		router := gin.New()
		router.Use(limiter.Middleware())
		router.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})

		// Make 5 requests
		for i := 0; i < 5; i++ {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test", nil)
			req.RemoteAddr = "192.168.1.10:12345"
			router.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Errorf("Request %d: expected 200, got %d", i+1, w.Code)
			}
		}
	})

	t.Run("Returns 429 when limit exceeded", func(t *testing.T) {
		limiter := NewRateLimiter(2, 1*time.Minute)
		router := gin.New()
		router.Use(limiter.Middleware())
		router.GET("/test", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})

		// Make 2 requests (at limit)
		for i := 0; i < 2; i++ {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/test", nil)
			req.RemoteAddr = "192.168.1.11:12345"
			router.ServeHTTP(w, req)
		}

		// 3rd request should be rate limited
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.11:12345"
		router.ServeHTTP(w, req)

		if w.Code != http.StatusTooManyRequests {
			t.Errorf("Expected 429, got %d", w.Code)
		}

		// Verify Retry-After header
		retryAfter := w.Header().Get("Retry-After")
		if retryAfter != "60" {
			t.Errorf("Expected Retry-After=60, got %s", retryAfter)
		}
	})

	t.Run("Does not call handler when rate limited", func(t *testing.T) {
		limiter := NewRateLimiter(1, 1*time.Minute)
		router := gin.New()
		router.Use(limiter.Middleware())

		handlerCalled := false
		router.GET("/test", func(c *gin.Context) {
			handlerCalled = true
			c.JSON(http.StatusOK, gin.H{"message": "success"})
		})

		// First request (allowed)
		w1 := httptest.NewRecorder()
		req1, _ := http.NewRequest("GET", "/test", nil)
		req1.RemoteAddr = "192.168.1.12:12345"
		router.ServeHTTP(w1, req1)

		if !handlerCalled {
			t.Error("Handler should be called for first request")
		}

		// Second request (blocked)
		handlerCalled = false
		w2 := httptest.NewRecorder()
		req2, _ := http.NewRequest("GET", "/test", nil)
		req2.RemoteAddr = "192.168.1.12:12345"
		router.ServeHTTP(w2, req2)

		if handlerCalled {
			t.Error("Handler should not be called when rate limited")
		}
	})
}

func TestPredefinedRateLimiters(t *testing.T) {
	t.Run("RoomListLimiter exists", func(t *testing.T) {
		if RoomListLimiter == nil {
			t.Error("RoomListLimiter should be initialized")
		}
	})

	t.Run("RoomCreationLimiter exists", func(t *testing.T) {
		if RoomCreationLimiter == nil {
			t.Error("RoomCreationLimiter should be initialized")
		}
	})

	t.Run("RoomJoinLimiter exists", func(t *testing.T) {
		if RoomJoinLimiter == nil {
			t.Error("RoomJoinLimiter should be initialized")
		}
	})
}

func BenchmarkRateLimiter_Allow(b *testing.B) {
	limiter := NewRateLimiter(1000, 1*time.Minute)
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		limiter.allow("192.168.1.100")
	}
}

func BenchmarkRateLimiter_AllowConcurrent(b *testing.B) {
	limiter := NewRateLimiter(10000, 1*time.Minute)
	b.ResetTimer()

	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			// Use different IPs to avoid contention
			ip := "192.168.1." + string(rune(i%256))
			limiter.allow(ip)
			i++
		}
	})
}
