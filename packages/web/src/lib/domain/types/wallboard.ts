/**
 * Wallboard Domain Types
 * Platform-agnostic wallboard interfaces
 */

// =============================================================================
// Wallboard Entity
// =============================================================================

/**
 * Wallboard entity
 */
export interface Wallboard {
  id: string;
  name: string;
  description: string;
  type: 'queue' | 'agent' | 'custom';
  enabled: boolean;
  configuration?: string;
  lastModified: string;
}

/**
 * Input for creating a new wallboard
 */
export interface CreateWallboardInput {
  name: string;
  description?: string;
  type?: 'queue' | 'agent' | 'custom';
  enabled?: boolean;
  configuration?: string;
}

/**
 * Input for updating an existing wallboard
 */
export interface UpdateWallboardInput {
  name?: string;
  description?: string;
  type?: 'queue' | 'agent' | 'custom';
  enabled?: boolean;
  configuration?: string;
}
