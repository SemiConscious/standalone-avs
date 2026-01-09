/**
 * Common domain types used across all entities
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Pagination Types
// =============================================================================

/**
 * Parameters for querying paginated data
 */
export interface QueryParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Search term for text search */
  search?: string;
  /** Additional filters as key-value pairs */
  filters?: Record<string, string | boolean | number | undefined>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  /** Items for the current page */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of a create or update operation
 */
export interface MutationResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The created or updated entity */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** Validation errors keyed by field name */
  fieldErrors?: Record<string, string>;
}

/**
 * Result of a delete operation
 */
export interface DeleteResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Makes specified properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specified properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract the input type for creating an entity (id is optional/auto-generated)
 */
export type CreateInput<T> = Omit<T, 'id'> & { id?: string };

/**
 * Extract the input type for updating an entity (all fields optional except id)
 */
export type UpdateInput<T> = Partial<Omit<T, 'id'>> & { id: string };

// =============================================================================
// Date/Time Types
// =============================================================================

/**
 * ISO 8601 date string (YYYY-MM-DD)
 */
export type ISODateString = string;

/**
 * ISO 8601 datetime string (YYYY-MM-DDTHH:mm:ssZ)
 */
export type ISODateTimeString = string;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create pagination metadata from query results
 */
export function createPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

/**
 * Create default query params with optional overrides
 */
export function createQueryParams(overrides?: Partial<QueryParams>): QueryParams {
  return {
    page: 1,
    pageSize: 25,
    sortOrder: 'asc',
    ...overrides,
  };
}
