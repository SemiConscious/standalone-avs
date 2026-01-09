/**
 * Skill Repository Interface
 * Defines the contract for skill data access
 */

import type {
  Skill,
  CreateSkillInput,
  UpdateSkillInput,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';

// =============================================================================
// Skill Query Parameters
// =============================================================================

export interface SkillQueryParams extends QueryParams {
  // Skills don't typically have filters beyond search/pagination
}

// =============================================================================
// Skill Repository Interface
// =============================================================================

export interface ISkillRepository {
  /**
   * Find all skills matching the query parameters
   */
  findAll(params: SkillQueryParams): Promise<PaginatedResult<Skill>>;

  /**
   * Find a single skill by ID
   */
  findById(id: string): Promise<Skill | null>;

  /**
   * Create a new skill
   */
  create(data: CreateSkillInput): Promise<MutationResult<Skill>>;

  /**
   * Update an existing skill
   */
  update(id: string, data: UpdateSkillInput): Promise<MutationResult<Skill>>;

  /**
   * Delete a skill by ID
   */
  delete(id: string): Promise<DeleteResult>;
}
