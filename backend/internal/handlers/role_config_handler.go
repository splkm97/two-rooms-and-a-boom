package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kalee/two-rooms-and-a-boom/internal/config"
)

// RoleConfigHandler handles role configuration-related HTTP requests
type RoleConfigHandler struct {
	roleLoader *config.RoleConfigLoader
}

// NewRoleConfigHandler creates a new RoleConfigHandler instance
func NewRoleConfigHandler(roleLoader *config.RoleConfigLoader) *RoleConfigHandler {
	return &RoleConfigHandler{
		roleLoader: roleLoader,
	}
}

// ListRoleConfigs handles GET /api/v1/role-configs
// Returns a list of available role configurations
func (h *RoleConfigHandler) ListRoleConfigs(c *gin.Context) {
	configs := h.roleLoader.GetList()
	c.JSON(http.StatusOK, gin.H{
		"configs": configs,
	})
}

// GetRoleConfig handles GET /api/v1/role-configs/:id
// Returns a specific role configuration with full details including roles
func (h *RoleConfigHandler) GetRoleConfig(c *gin.Context) {
	configID := c.Param("id")

	config, err := h.roleLoader.Get(configID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"code":    "ROLE_CONFIG_NOT_FOUND",
			"message": "Role configuration not found",
		})
		return
	}

	c.JSON(http.StatusOK, config)
}
