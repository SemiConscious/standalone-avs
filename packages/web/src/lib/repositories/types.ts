/**
 * Common Repository Types
 * Shared types used across all repository interfaces
 */

import type {
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';

// Re-export common types for convenience
export type { QueryParams, PaginatedResult, MutationResult, DeleteResult };

// =============================================================================
// Repository Context
// =============================================================================

/**
 * Context provided to repository implementations
 * Contains platform-specific authentication/connection info
 */
export interface RepositoryContext {
  /** Current platform ('salesforce' | 'demo' | 'hubspot' | etc.) */
  platform: string;
  /** Platform-specific context data */
  platformContext: unknown;
}

// =============================================================================
// Repository Options
// =============================================================================

/**
 * Options for repository operations
 */
export interface RepositoryOptions {
  /** Skip cache and fetch fresh data */
  skipCache?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

// =============================================================================
// Repository Base Interface
// =============================================================================

/**
 * Base repository interface with common CRUD operations
 */
export interface IBaseRepository<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TQueryParams extends QueryParams = QueryParams
> {
  /**
   * Find all entities matching the query parameters
   */
  findAll(params: TQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<TEntity>>;

  /**
   * Find a single entity by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<TEntity | null>;

  /**
   * Create a new entity
   */
  create(data: TCreateInput): Promise<MutationResult<TEntity>>;

  /**
   * Update an existing entity
   */
  update(id: string, data: TUpdateInput): Promise<MutationResult<TEntity>>;

  /**
   * Delete an entity by ID
   */
  delete(id: string): Promise<DeleteResult>;
}
