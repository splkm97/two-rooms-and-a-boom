package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/handlers"
	"github.com/kalee/two-rooms-and-a-boom/internal/services"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
	"github.com/kalee/two-rooms-and-a-boom/internal/websocket"
)

func main() {
	r := gin.Default()

	// CORS middleware for development
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
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
	playerService := services.NewPlayerService(roomStore)
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
		v1.POST("/rooms", roomHandler.CreateRoom)
		v1.GET("/rooms/:roomCode", roomHandler.GetRoom)

		// Player routes
		v1.POST("/rooms/:roomCode/players", playerHandler.JoinRoom)
		v1.PATCH("/rooms/:roomCode/players/:playerId/nickname", playerHandler.UpdateNickname)

		// Game routes (US2, US3)
		v1.POST("/rooms/:roomCode/game/start", gameHandler.StartGame)
		v1.POST("/rooms/:roomCode/game/reset", gameHandler.ResetGame)
	}

	// WebSocket route
	r.GET("/ws/:roomCode", wsHandler.HandleWebSocket)

	// T104: Implement graceful shutdown
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		log.Println("[INFO] Server starting on :8080")
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
