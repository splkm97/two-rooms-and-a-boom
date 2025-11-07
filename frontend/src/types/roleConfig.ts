// Role configuration metadata for API responses
export interface RoleConfigMeta {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  version?: string;
}

// API response for fetching role configurations
export interface RoleConfigsResponse {
  configs: RoleConfigMeta[];
}

// Full role definition
export interface RoleDefinition {
  id: string;
  name: string;
  nameKo: string;
  team: 'RED' | 'BLUE' | 'GREY';
  type: 'leader' | 'spy' | 'support' | 'standard';
  description?: string;
  descriptionKo?: string;
  count: number | Record<string, number>;
  minPlayers: number;
  priority: number;
  color?: string;
  icon?: string;
}

// Full role configuration with all roles
export interface RoleConfig extends RoleConfigMeta {
  roles: RoleDefinition[];
}
