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

	// Round management events
	MessageRoundStarted       MessageType = "ROUND_STARTED"
	MessageTimerTick          MessageType = "TIMER_TICK"
	MessageRoundEnded         MessageType = "ROUND_ENDED"

	// Leader management events
	MessageLeaderAssigned     MessageType = "LEADER_ASSIGNED"
	MessageLeaderTransferred  MessageType = "LEADER_TRANSFERRED"
	MessageLeadershipChanged  MessageType = "LEADERSHIP_CHANGED"

	// Voting events
	MessageVoteRemoveLeaderStarted MessageType = "VOTE_REMOVE_LEADER_STARTED"
	MessageVoteSessionStarted      MessageType = "VOTE_SESSION_STARTED"
	MessageVoteCast                MessageType = "VOTE_CAST"
	MessageVoteProgress            MessageType = "VOTE_PROGRESS"
	MessageVoteCompleted           MessageType = "VOTE_COMPLETED"

	// Hostage exchange events
	MessageHostagesSelected          MessageType = "HOSTAGES_SELECTED"
	MessageLeaderAnnouncedHostages   MessageType = "LEADER_ANNOUNCED_HOSTAGES"
	MessageExchangeReady             MessageType = "EXCHANGE_READY"
	MessageExchangeComplete          MessageType = "EXCHANGE_COMPLETE"
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

// LeaderInfo represents leader information
type LeaderInfo struct {
	ID       string `json:"id"`
	Nickname string `json:"nickname"`
}

// RoundStartedPayload for ROUND_STARTED event
type RoundStartedPayload struct {
	RoundNumber   int         `json:"roundNumber"`
	Duration      int         `json:"duration"`
	TimeRemaining int         `json:"timeRemaining"`
	RedLeader     *LeaderInfo `json:"redLeader"`
	BlueLeader    *LeaderInfo `json:"blueLeader"`
	HostageCount  int         `json:"hostageCount"`
}

// TimerTickPayload for TIMER_TICK event
type TimerTickPayload struct {
	RoundNumber   int `json:"roundNumber"`
	TimeRemaining int `json:"timeRemaining"`
}

// RoundEndedPayload for ROUND_ENDED event
type RoundEndedPayload struct {
	RoundNumber int    `json:"roundNumber"`
	FinalRound  bool   `json:"finalRound"`
	NextPhase   string `json:"nextPhase"` // ROUND_SETUP or REVEALING
}

// LeadershipChangedPayload for LEADERSHIP_CHANGED event
type LeadershipChangedPayload struct {
	RoomColor models.RoomColor                `json:"roomColor"`
	OldLeader *LeaderInfo                     `json:"oldLeader"`
	NewLeader *LeaderInfo                     `json:"newLeader"`
	Reason    models.LeadershipChangeReason   `json:"reason"`
	Timestamp string                          `json:"timestamp"`
}

// VoteSessionStartedPayload for VOTE_SESSION_STARTED event
type VoteSessionStartedPayload struct {
	VoteID         string           `json:"voteId"`
	RoomColor      models.RoomColor `json:"roomColor"`
	TargetLeader   *LeaderInfo      `json:"targetLeader"`
	Initiator      *LeaderInfo      `json:"initiator"`
	Candidates     []string         `json:"candidates,omitempty"` // For election votes
	TotalVoters    int              `json:"totalVoters"`
	TimeoutSeconds int              `json:"timeoutSeconds"`
	StartedAt      string           `json:"startedAt"`
}

// VoteProgressPayload for VOTE_PROGRESS event
type VoteProgressPayload struct {
	VoteID        string `json:"voteId"`
	VotedCount    int    `json:"votedCount"`
	TotalVoters   int    `json:"totalVoters"`
	TimeRemaining int    `json:"timeRemaining"`
}

// VoteCompletedPayload for VOTE_COMPLETED event
type VoteCompletedPayload struct {
	VoteID       string      `json:"voteId"`
	Result       string      `json:"result"` // PASSED, FAILED, TIMEOUT
	YesVotes     int         `json:"yesVotes"`
	NoVotes      int         `json:"noVotes"`
	TargetLeader *LeaderInfo `json:"targetLeader"`
	NewLeader    *LeaderInfo `json:"newLeader,omitempty"`
	Reason       string      `json:"reason,omitempty"`
}

// HostagesSelectedPayload for HOSTAGES_SELECTED event (client -> server)
type HostagesSelectedPayload struct {
	RoomColor  models.RoomColor `json:"roomColor"`
	HostageIDs []string         `json:"hostageIDs"`
}

// LeaderAnnouncedHostagesPayload for LEADER_ANNOUNCED_HOSTAGES event (server -> room)
type LeaderAnnouncedHostagesPayload struct {
	RoomColor            models.RoomColor   `json:"roomColor"`
	Hostages             []*models.Player   `json:"hostages"`
	WaitingForOtherLeader bool              `json:"waitingForOtherLeader"`
}

// ExchangeReadyPayload for EXCHANGE_READY event
type ExchangeReadyPayload struct {
	RedHostages  []*models.Player `json:"redHostages"`
	BlueHostages []*models.Player `json:"blueHostages"`
	Countdown    int              `json:"countdown"`
}

// ExchangeRecord represents a single player exchange
type ExchangeRecord struct {
	PlayerID   string           `json:"playerId"`
	Nickname   string           `json:"nickname"`
	FromRoom   models.RoomColor `json:"fromRoom"`
	ToRoom     models.RoomColor `json:"toRoom"`
}

// ExchangeCompletePayload for EXCHANGE_COMPLETE event
type ExchangeCompletePayload struct {
	RoundNumber int               `json:"roundNumber"`
	Exchanges   []ExchangeRecord  `json:"exchanges"`
	NextRound   int               `json:"nextRound,omitempty"`
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
