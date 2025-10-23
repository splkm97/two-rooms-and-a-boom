package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// ValidationMiddleware returns a middleware for consistent validation error handling
func ValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check if validation errors were set in context
		if err, exists := c.Get("validationError"); exists {
			c.AbortWithStatusJSON(http.StatusBadRequest, err)
		}
	}
}

// HandleValidationError formats validation errors consistently
func HandleValidationError(c *gin.Context, err error) {
	var errorMessage string
	var details string

	// Extract validator errors if possible
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		// Get first validation error for simplicity
		if len(validationErrors) > 0 {
			fieldError := validationErrors[0]
			field := fieldError.Field()
			tag := fieldError.Tag()

			switch tag {
			case "required":
				errorMessage = field + " is required"
			case "min":
				errorMessage = field + " must be at least " + fieldError.Param()
			case "max":
				errorMessage = field + " must be at most " + fieldError.Param()
			default:
				errorMessage = field + " validation failed on " + tag
			}
			details = err.Error()
		}
	} else {
		errorMessage = err.Error()
	}

	c.JSON(http.StatusBadRequest, ErrorResponse{
		Code:    "INVALID_REQUEST",
		Message: errorMessage,
		Details: details,
	})
}

// ValidateRoomCode validates room code format
func ValidateRoomCode(roomCode string) error {
	if len(roomCode) != 6 {
		return &validator.ValidationErrors{}
	}
	return nil
}

// ValidatePlayerID validates player ID format
func ValidatePlayerID(playerID string) error {
	if playerID == "" {
		return &validator.ValidationErrors{}
	}
	return nil
}
