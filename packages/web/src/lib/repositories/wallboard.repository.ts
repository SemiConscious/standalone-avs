/**
 * Wallboard Repository Interface
 * Defines the contract for wallboard data access
 */

import type {
  Wallboard,
  CreateWallboardInput,
  UpdateWallboardInput,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';

// =============================================================================
// Wallboard Query Parameters
// =============================================================================

export interface WallboardQueryParams extends QueryParams {
  filters?: {
    enabled?: boolean;
    type?: 'queue' | 'agent' | 'custom';
  };
}

// =============================================================================
// Wallboard Repository Interface
// =============================================================================

export interface IWallboardRepository {
  /**
   * Find all wallboards matching the query parameters
   */
  findAll(params: WallboardQueryParams): Promise<PaginatedResult<Wallboard>>;

  /**
   * Find a single wallboard by ID
   */
  findById(id: string): Promise<Wallboard | null>;

  /**
   * Create a new wallboard
   */
  create(data: CreateWallboardInput): Promise<MutationResult<Wallboard>>;

  /**
   * Update an existing wallboard
   */
  update(id: string, data: UpdateWallboardInput): Promise<MutationResult<Wallboard>>;

  /**
   * Delete a wallboard by ID
   */
  delete(id: string): Promise<DeleteResult>;

  /**
   * Toggle wallboard enabled state
   */
  toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>>;
}
