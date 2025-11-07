package websocket

import (
	"encoding/json"

	"github.com/kalee/two-rooms-and-a-boom/internal/models"
)

// MessageType represents WebSocket message types
type MessageType string

const (
	MessagePlayerJoined       MessageType = "PLAYER_JOINED"
	MessagePlayerLeft         MessageType = "PLAYER_LEFT"
	MessagePlayerDisconnected MessageType = "PLAYER_DISCONNECTED"
	MessageNicknameChanged    MessageType = "NICKNAME_CHANGED"
	MessageOwnerChanged       MessageType = "OWNER_CHANGED"
	MessageRoomClosed         MessageType = "ROOM_CLOSED"
	MessageGameStarted        MessageType = "GAME_STARTED"
	MessageRoleAssigned       MessageType = "ROLE_ASSIGNED"
	MessageGameReset          MessageType = "GAME_RESET"
)

// Message represents a WebSocket message
type Message struct {
	Type    MessageType     `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// PlayerJoinedPayload for PLAYER_JOINED event
type PlayerJoinedPayload struct {
	Player *models.Player `json:"player"`
}

// PlayerLeftPayload for PLAYER_LEFT event
type PlayerLeftPayload struct {
	PlayerID string `json:"playerId"`
}

// PlayerDisconnectedPayload for PLAYER_DISCONNECTED event
type PlayerDisconnectedPayload struct {
	PlayerID string `json:"playerId"`
}

// NicknameChangedPayload for NICKNAME_CHANGED event
type NicknameChangedPayload struct {
	PlayerID    string `json:"playerId"`
	NewNickname string `json:"newNickname"`
}

// OwnerChangedPayload for OWNER_CHANGED event
type OwnerChangedPayload struct {
	NewOwner *models.Player `json:"newOwner"`
}

// RoomClosedPayload for ROOM_CLOSED event
type RoomClosedPayload struct {
	Reason string `json:"reason"`
}

// GameStartedPayload for GAME_STARTED event
type GameStartedPayload struct {
	GameSession *models.GameSession `json:"gameSession"`
}

// RoleAssignedPayload for ROLE_ASSIGNED event (unicast)
type RoleAssignedPayload struct {
	Role        *models.Role      `json:"role"`
	Team        models.TeamColor  `json:"team"`
	CurrentRoom models.RoomColor  `json:"currentRoom"`
}

// GameResetPayload for GAME_RESET event
type GameResetPayload struct {
	Room *models.Room `json:"room"`
}

// NewMessage creates a new WebSocket message
func NewMessage(msgType MessageType, payload interface{}) (*Message, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return &Message{
		Type:    msgType,
		Payload: data,
	}, nil
}

// Marshal converts a message to JSON bytes
func (m *Message) Marshal() ([]byte, error) {
	return json.Marshal(m)
}

// UnmarshalPayload unmarshals the payload into the provided interface
func (m *Message) UnmarshalPayload(v interface{}) error {
	return json.Unmarshal(m.Payload, v)
}

// GetPayloadAsMap returns the payload as a map for testing purposes
func (m *Message) GetPayloadAsMap() (map[string]interface{}, error) {
	var result map[string]interface{}
	err := json.Unmarshal(m.Payload, &result)
	return result, err
}
