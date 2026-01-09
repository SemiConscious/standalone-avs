/**
 * Skill Domain Types
 * Platform-agnostic skill interfaces
 */

// =============================================================================
// Skill Entity
// =============================================================================

/**
 * Skill proficiency levels
 */
export type SkillProficiency = 
  | 'No knowledge'
  | 'Minimal'
  | 'Basic'
  | 'Novice'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  | 'Guru'
  | 'Custom';

/**
 * Skill entity
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  sapienId?: number;
  /** Proficiency level (picklist value) */
  proficiency?: SkillProficiency | string;
  /** Weight/proficiency value (0-100) */
  weight?: number;
  lastModified: string;
}

/**
 * Input for creating a new skill
 */
export interface CreateSkillInput {
  name: string;
  description?: string;
}

/**
 * Input for updating an existing skill
 */
export interface UpdateSkillInput {
  name?: string;
  description?: string;
}
