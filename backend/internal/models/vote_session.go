package models

import "time"

// VoteType represents the type of vote
type VoteType string

const (
	VoteTypeRemoval  VoteType = "REMOVAL"  // Vote to remove leader
	VoteTypeElection VoteType = "ELECTION" // Vote to elect new leader
)

// VoteChoice represents a player's vote
type VoteChoice string

const (
	VoteYes VoteChoice = "YES" // Vote to remove leader
	VoteNo  VoteChoice = "NO"  // Vote to keep leader
)

// VoteSessionStatus represents the status of a vote session
type VoteSessionStatus string

const (
	VoteStatusActive    VoteSessionStatus = "ACTIVE"    // Vote in progress
	VoteStatusCompleted VoteSessionStatus = "COMPLETED" // Vote finished normally
	VoteStatusTimeout   VoteSessionStatus = "TIMEOUT"   // Vote expired
)

// VoteSession represents a leader removal or election vote
type VoteSession struct {
	VoteID           string                   `json:"voteId"`           // Unique vote session ID
	VoteType         VoteType                 `json:"voteType"`         // Type of vote (REMOVAL or ELECTION)
	GameSessionID    string                   `json:"gameSessionId"`    // Associated game session
	RoomColor        RoomColor                `json:"roomColor"`        // Room where vote is happening
	TargetLeaderID   string                   `json:"targetLeaderId"`   // Leader being voted on (for REMOVAL)
	TargetLeaderName string                   `json:"targetLeaderName"` // Leader's nickname (for REMOVAL)
	InitiatorID      string                   `json:"initiatorId"`      // Player who started vote
	InitiatorName    string                   `json:"initiatorName"`    // Initiator's nickname
	Candidates       []string                 `json:"candidates"`       // Candidate player IDs (for ELECTION)
	StartedAt        time.Time                `json:"startedAt"`        // Vote start time
	ExpiresAt        time.Time                `json:"expiresAt"`        // Vote expiry time (30s)
	TimeoutSeconds   int                      `json:"timeoutSeconds"`   // Timeout duration (30)
	TotalVoters      int                      `json:"totalVoters"`      // Number of eligible voters
	Votes            map[string]string        `json:"votes"`            // playerID -> vote choice (YES/NO or candidateID)
	Status           VoteSessionStatus        `json:"status"`           // Current vote status
}

// VoteResult represents the outcome of a vote
type VoteResult struct {
	VoteID        string `json:"voteId"`                  // Vote session ID
	Result        string `json:"result"`                  // PASSED, FAILED, or TIMEOUT
	YesVotes      int    `json:"yesVotes"`                // Number of YES votes
	NoVotes       int    `json:"noVotes"`                 // Number of NO votes
	TotalVoters   int    `json:"totalVoters"`             // Total eligible voters
	NewLeaderID   string `json:"newLeaderId,omitempty"`   // New leader if vote passed
	NewLeaderName string `json:"newLeaderName,omitempty"` // New leader's nickname
}

// Vote result constants
const (
	VoteResultPassed  = "PASSED"
	VoteResultFailed  = "FAILED"
	VoteResultTimeout = "TIMEOUT"
)

// LeadershipChangeReason represents why leadership changed
type LeadershipChangeReason string

const (
	ReasonVoluntaryTransfer LeadershipChangeReason = "VOLUNTARY_TRANSFER" // Leader voluntarily transferred
	ReasonDisconnection     LeadershipChangeReason = "DISCONNECTION"      // Leader disconnected
	ReasonVoteRemoval       LeadershipChangeReason = "VOTE_REMOVAL"       // Removed by vote
)
