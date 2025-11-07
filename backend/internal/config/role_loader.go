package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// RoleConfigLoader handles loading and caching role configurations
type RoleConfigLoader struct {
	configs    map[string]*RoleConfig // id -> config
	configsDir string
}

// NewRoleConfigLoader creates a new loader
func NewRoleConfigLoader(configsDir string) *RoleConfigLoader {
	return &RoleConfigLoader{
		configs:    make(map[string]*RoleConfig),
		configsDir: configsDir,
	}
}

// LoadAll loads all role configurations from the directory
func (l *RoleConfigLoader) LoadAll() error {
	// Check if directory exists
	if _, err := os.Stat(l.configsDir); os.IsNotExist(err) {
		return fmt.Errorf("config directory not found: %s", l.configsDir)
	}

	// Read all JSON files
	files, err := filepath.Glob(filepath.Join(l.configsDir, "*.json"))
	if err != nil {
		return fmt.Errorf("failed to list config files: %w", err)
	}

	if len(files) == 0 {
		return fmt.Errorf("no role configuration files found in %s", l.configsDir)
	}

	// Load each file
	for _, file := range files {
		config, err := l.loadFile(file)
		if err != nil {
			return fmt.Errorf("failed to load %s: %w", file, err)
		}

		// Store by ID
		l.configs[config.ID] = config
	}

	return nil
}

// loadFile loads a single configuration file
func (l *RoleConfigLoader) loadFile(path string) (*RoleConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config RoleConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	// Validate
	if err := validateRoleConfig(&config); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	return &config, nil
}

// Get returns a configuration by ID
func (l *RoleConfigLoader) Get(id string) (*RoleConfig, error) {
	config, ok := l.configs[id]
	if !ok {
		return nil, fmt.Errorf("configuration not found: %s", id)
	}
	return config, nil
}

// GetAll returns all loaded configurations
func (l *RoleConfigLoader) GetAll() map[string]*RoleConfig {
	return l.configs
}

// GetList returns a list of configuration metadata
func (l *RoleConfigLoader) GetList() []RoleConfigMeta {
	list := make([]RoleConfigMeta, 0, len(l.configs))
	for _, config := range l.configs {
		list = append(list, config.ToMeta())
	}
	return list
}
