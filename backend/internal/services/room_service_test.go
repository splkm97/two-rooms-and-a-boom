package services

import (
	"testing"
)

func TestGenerateRoomCode(t *testing.T) {
	t.Run("generates 6-character code", func(t *testing.T) {
		code := GenerateRoomCode()
		if len(code) != 6 {
			t.Errorf("Expected code length 6, got %d", len(code))
		}
	})

	t.Run("generates alphanumeric uppercase code", func(t *testing.T) {
		code := GenerateRoomCode()
		for _, char := range code {
			if !((char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
				t.Errorf("Code contains invalid character: %c", char)
			}
		}
	})

	t.Run("generates unique codes", func(t *testing.T) {
		codes := make(map[string]bool)
		for i := 0; i < 100; i++ {
			code := GenerateRoomCode()
			if codes[code] {
				t.Errorf("Generated duplicate code: %s", code)
			}
			codes[code] = true
		}
	})
}
