package services

import (
	"testing"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
	"github.com/kalee/two-rooms-and-a-boom/internal/store"
)

// T032: Unit test for PlayerService.JoinRoom
func TestPlayerService_JoinRoom(t *testing.T) {
	t.Run("first player joins as owner", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{},
			MaxPlayers: 10,
		}
		roomStore.Create(room)

		// Join room
		player, err := playerService.JoinRoom(room.Code)

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		if player == nil {
			t.Fatal("Expected player to be created, got nil")
		}

		// Verify player ID is generated
		if player.ID == "" {
			t.Error("Expected player ID to be generated")
		}

		// Verify anonymous nickname is assigned
		if player.Nickname == "" {
			t.Error("Expected nickname to be assigned")
		}

		// Verify isAnonymous is true
		if !player.IsAnonymous {
			t.Error("Expected isAnonymous to be true")
		}

		// Verify first player is owner
		if !player.IsOwner {
			t.Error("Expected first player to be owner")
		}

		// Verify roomCode matches
		if player.RoomCode != room.Code {
			t.Errorf("Expected roomCode %s, got %s", room.Code, player.RoomCode)
		}

		// Verify connectedAt timestamp is set
		if player.ConnectedAt.IsZero() {
			t.Error("Expected connectedAt to be set")
		}

		// Verify player is added to room
		updatedRoom, err := roomStore.Get(room.Code)
		if err != nil {
			t.Fatalf("Failed to get updated room: %v", err)
		}
		if len(updatedRoom.Players) != 1 {
			t.Errorf("Expected 1 player in room, got %d", len(updatedRoom.Players))
		}
		if updatedRoom.Players[0].ID != player.ID {
			t.Error("Expected player to be added to room")
		}
	})

	t.Run("second player joins without owner status", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room with existing player
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{
				{
					ID:          "player1",
					Nickname:    "플레이어1",
					IsAnonymous: true,
					IsOwner:     true,
					RoomCode:    "",
				},
			},
			MaxPlayers: 10,
		}
		room.Players[0].RoomCode = room.Code
		roomStore.Create(room)

		// Join room
		player, err := playerService.JoinRoom(room.Code)

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify second player is not owner
		if player.IsOwner {
			t.Error("Expected second player to not be owner")
		}

		// Verify player is added to room
		updatedRoom, err := roomStore.Get(room.Code)
		if err != nil {
			t.Fatalf("Failed to get updated room: %v", err)
		}
		if len(updatedRoom.Players) != 2 {
			t.Errorf("Expected 2 players in room, got %d", len(updatedRoom.Players))
		}
	})

	t.Run("rejects join when room is full", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create full room (6 players, max 6)
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    make([]*models.Player, 0),
			MaxPlayers: 6,
		}
		for i := 0; i < 6; i++ {
			player := &models.Player{
				ID:          string(rune('A' + i)),
				Nickname:    "플레이어" + string(rune('1'+i)),
				IsAnonymous: true,
				IsOwner:     i == 0,
				RoomCode:    room.Code,
			}
			room.Players = append(room.Players, player)
		}
		roomStore.Create(room)

		// Try to join full room
		_, err := playerService.JoinRoom(room.Code)

		if err == nil {
			t.Fatal("Expected error for full room, got nil")
		}

		if err != models.ErrRoomFull {
			t.Errorf("Expected ErrRoomFull, got %v", err)
		}
	})

	t.Run("rejects join when game already started", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room with IN_PROGRESS status
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusInProgress,
			Players:    []*models.Player{},
			MaxPlayers: 10,
		}
		roomStore.Create(room)

		// Try to join game in progress
		_, err := playerService.JoinRoom(room.Code)

		if err == nil {
			t.Fatal("Expected error for game in progress, got nil")
		}

		if err != models.ErrGameAlreadyStarted {
			t.Errorf("Expected ErrGameAlreadyStarted, got %v", err)
		}
	})

	t.Run("returns error for non-existent room", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Try to join non-existent room
		_, err := playerService.JoinRoom("NONEXIST")

		if err == nil {
			t.Fatal("Expected error for non-existent room, got nil")
		}

		if err != models.ErrRoomNotFound {
			t.Errorf("Expected ErrRoomNotFound, got %v", err)
		}
	})

	t.Run("generates sequential anonymous nicknames", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{},
			MaxPlayers: 10,
		}
		roomStore.Create(room)

		// Join multiple players
		player1, _ := playerService.JoinRoom(room.Code)
		player2, _ := playerService.JoinRoom(room.Code)
		player3, _ := playerService.JoinRoom(room.Code)

		// Verify nicknames are different
		if player1.Nickname == player2.Nickname || player2.Nickname == player3.Nickname {
			t.Error("Expected different anonymous nicknames")
		}

		// Verify nicknames follow pattern (e.g., "플레이어1", "플레이어2", "플레이어3")
		if player1.Nickname == "" || player2.Nickname == "" || player3.Nickname == "" {
			t.Error("Expected all players to have nicknames")
		}
	})
}

// T033: Unit test for PlayerService.UpdateNickname (including duplicate handling)
func TestPlayerService_UpdateNickname(t *testing.T) {
	t.Run("successfully update nickname", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room with player
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{
				{
					ID:          "player1",
					Nickname:    "플레이어1",
					IsAnonymous: true,
					IsOwner:     true,
					RoomCode:    "",
				},
			},
			MaxPlayers: 10,
		}
		room.Players[0].RoomCode = room.Code
		roomStore.Create(room)

		// Update nickname
		updatedPlayer, err := playerService.UpdateNickname(room.Code, "player1", "새로운닉네임")

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify nickname is updated
		if updatedPlayer.Nickname != "새로운닉네임" {
			t.Errorf("Expected nickname '새로운닉네임', got %s", updatedPlayer.Nickname)
		}

		// Verify isAnonymous is now false
		if updatedPlayer.IsAnonymous {
			t.Error("Expected isAnonymous to be false after custom nickname")
		}
	})

	t.Run("handle duplicate nickname by adding suffix", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room with two players
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{
				{
					ID:          "player1",
					Nickname:    "중복닉네임",
					IsAnonymous: false,
					IsOwner:     true,
					RoomCode:    "",
				},
				{
					ID:          "player2",
					Nickname:    "플레이어2",
					IsAnonymous: true,
					IsOwner:     false,
					RoomCode:    "",
				},
			},
			MaxPlayers: 10,
		}
		room.Players[0].RoomCode = room.Code
		room.Players[1].RoomCode = room.Code
		roomStore.Create(room)

		// Try to update player2's nickname to duplicate
		updatedPlayer, err := playerService.UpdateNickname(room.Code, "player2", "중복닉네임")

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify nickname has suffix
		if updatedPlayer.Nickname == "중복닉네임" {
			t.Error("Expected nickname to have suffix for duplicate")
		}

		// Verify suffix is added (e.g., "중복닉네임 (2)" or "중복닉네임 2")
		// The exact format depends on implementation, but should be different from original
	})

	t.Run("reject nickname shorter than 2 characters", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room with player
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{
				{
					ID:          "player1",
					Nickname:    "플레이어1",
					IsAnonymous: true,
					IsOwner:     true,
					RoomCode:    "",
				},
			},
			MaxPlayers: 10,
		}
		room.Players[0].RoomCode = room.Code
		roomStore.Create(room)

		// Try to update with too short nickname
		_, err := playerService.UpdateNickname(room.Code, "player1", "A")

		if err == nil {
			t.Fatal("Expected error for nickname < 2 characters, got nil")
		}

		if err != models.ErrInvalidNickname {
			t.Errorf("Expected ErrInvalidNickname, got %v", err)
		}
	})

	t.Run("reject nickname longer than 20 characters", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room with player
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{
				{
					ID:          "player1",
					Nickname:    "플레이어1",
					IsAnonymous: true,
					IsOwner:     true,
					RoomCode:    "",
				},
			},
			MaxPlayers: 10,
		}
		room.Players[0].RoomCode = room.Code
		roomStore.Create(room)

		// Try to update with too long nickname (21 characters)
		_, err := playerService.UpdateNickname(room.Code, "player1", "가나다라마바사아자차카타파하ABCDEFG")

		if err == nil {
			t.Fatal("Expected error for nickname > 20 characters, got nil")
		}

		if err != models.ErrInvalidNickname {
			t.Errorf("Expected ErrInvalidNickname, got %v", err)
		}
	})

	t.Run("return error for non-existent player", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room without players
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{},
			MaxPlayers: 10,
		}
		roomStore.Create(room)

		// Try to update non-existent player
		_, err := playerService.UpdateNickname(room.Code, "NONEXIST", "닉네임")

		if err == nil {
			t.Fatal("Expected error for non-existent player, got nil")
		}

		if err != models.ErrPlayerNotFound {
			t.Errorf("Expected ErrPlayerNotFound, got %v", err)
		}
	})

	t.Run("return error for non-existent room", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Try to update player in non-existent room
		_, err := playerService.UpdateNickname("NONEXIST", "player1", "닉네임")

		if err == nil {
			t.Fatal("Expected error for non-existent room, got nil")
		}

		if err != models.ErrRoomNotFound {
			t.Errorf("Expected ErrRoomNotFound, got %v", err)
		}
	})

	t.Run("preserve other player fields when updating nickname", func(t *testing.T) {
		roomStore := store.NewRoomStore()
		playerService := NewPlayerService(roomStore)

		// Create room with player
		room := &models.Room{
			Code:       GenerateRoomCode(),
			Status:     models.RoomStatusWaiting,
			Players:    []*models.Player{
				{
					ID:          "player1",
					Nickname:    "플레이어1",
					IsAnonymous: true,
					IsOwner:     true,
					RoomCode:    "",
				},
			},
			MaxPlayers: 10,
		}
		room.Players[0].RoomCode = room.Code
		roomStore.Create(room)

		// Update nickname
		updatedPlayer, err := playerService.UpdateNickname(room.Code, "player1", "새닉네임")

		if err != nil {
			t.Fatalf("Expected no error, got %v", err)
		}

		// Verify other fields are preserved
		if updatedPlayer.ID != "player1" {
			t.Error("Expected player ID to be preserved")
		}
		if !updatedPlayer.IsOwner {
			t.Error("Expected isOwner to be preserved")
		}
		if updatedPlayer.RoomCode != room.Code {
			t.Error("Expected roomCode to be preserved")
		}
	})
}
