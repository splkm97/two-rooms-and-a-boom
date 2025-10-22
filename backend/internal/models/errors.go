package models

import "errors"

// Error definitions
var (
	ErrRoomNotFound       = errors.New("room not found")
	ErrRoomCodeExists     = errors.New("room code already exists")
	ErrInvalidNickname    = errors.New("invalid nickname")
	ErrMinimumPlayers     = errors.New("minimum 6 players required")
	ErrPlayerNotFound     = errors.New("player not found")
	ErrNotRoomOwner       = errors.New("only room owner can start game")
	ErrGameAlreadyStarted = errors.New("game already started")
	ErrRoomFull           = errors.New("room is full")
	ErrInvalidRoomCode    = errors.New("invalid room code format")
)
