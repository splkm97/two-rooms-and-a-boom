package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/kalee/two-rooms-and-a-boom/internal/handlers"
	"github.com/kalee/two-rooms-and-a-boom/internal/middleware"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	"github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

func main() {
	// Load .env file if it exists (optional in production)
	if err := godotenv.Load(); err != nil {
		log.Println("[INFO] No .env file found, using environment variables")
	}

	// Get configuration from environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	r := gin.Default()

	// CORS middleware - use environment variable for frontend URL
	r.Use(func(c *gin.Context) {
		// Allow requests from configured frontend URL or all origins in development
		origin := c.GetHeader("Origin")
		if origin == frontendURL || ginMode == "debug" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Initialize dependencies
	roomStore := store.NewRoomStore()
	hub := websocket.NewHub()

	// Start WebSocket hub
	go hub.Run()

	// Initialize services
	roomService := services.NewRoomService(roomStore)
	playerService := services.NewPlayerService(roomStore, hub)
	gameService := services.NewGameService(roomStore)
	gameService.SetHub(hub)

	// Initialize handlers
	roomHandler := handlers.NewRoomHandler(roomService)
	playerHandler := handlers.NewPlayerHandler(playerService)
	gameHandler := handlers.NewGameHandler(gameService)
	wsHandler := handlers.NewWebSocketHandler(hub, roomService, playerService)

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
		})
	})

	// T046: Wire all US1 routes to Gin router
	// T076: Wire US2 routes to Gin router
	// T092: Wire US3 routes to Gin router
	v1 := r.Group("/api/v1")
	{
		// Room routes
		v1.GET("/rooms", middleware.RoomListLimiter.Middleware(), roomHandler.ListRooms)
		v1.POST("/rooms", middleware.RoomCreationLimiter.Middleware(), roomHandler.CreateRoom)
		v1.GET("/rooms/:roomCode", roomHandler.GetRoom)
		v1.PATCH("/rooms/:roomCode/visibility", roomHandler.UpdateRoomVisibility)

		// Player routes
		v1.POST("/rooms/:roomCode/players", middleware.RoomJoinLimiter.Middleware(), playerHandler.JoinRoom)
		v1.PATCH("/rooms/:roomCode/players/:playerId/nickname", playerHandler.UpdateNickname)
		v1.DELETE("/rooms/:roomCode/players/:playerId", playerHandler.LeaveRoom)

		// Game routes (US2, US3)
		v1.POST("/rooms/:roomCode/game/start", gameHandler.StartGame)
		v1.POST("/rooms/:roomCode/game/reset", gameHandler.ResetGame)
	}

	// WebSocket route
	r.GET("/ws/:roomCode", wsHandler.HandleWebSocket)

	// Serve frontend static files (for production deployment)
	// This allows serving both frontend and backend from a single container
	r.Static("/assets", "./frontend/dist/assets")
	r.StaticFile("/vite.svg", "./frontend/dist/vite.svg")

	// Serve index.html for all non-API routes (SPA routing)
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// Don't serve index.html for API routes or WebSocket
		if len(path) >= 4 && path[:4] == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}
		if len(path) >= 3 && path[:3] == "/ws" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}
		c.File("./frontend/dist/index.html")
	})

	// T104: Implement graceful shutdown
	serverAddr := fmt.Sprintf(":%s", port)
	srv := &http.Server{
		Addr:    serverAddr,
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("[INFO] Server starting on %s", serverAddr)
		log.Printf("[INFO] Frontend URL: %s", frontendURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] Server failed to start: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[INFO] Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[FATAL] Server forced to shutdown: %v", err)
	}

	log.Println("[INFO] Server exited")
}
