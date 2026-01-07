/**
 * Query filter operators
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';

/**
 * Single query filter condition
 */
export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Query options for pagination, sorting, and field selection
 */
export interface QueryOptions {
  /** Fields to select (defaults to all) */
  fields?: string[];
  /** Sort by field(s) */
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Include related entities */
  include?: string[];
}

/**
 * Paginated query result
 */
export interface QueryResult<T> {
  records: T[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  success: boolean;
  id?: string;
  record?: T;
  errors?: Array<{ message: string; field?: string }>;
}

/**
 * Data store interface - abstraction for platform data operations
 */
export interface IDataStore {
  /**
   * Query records with filters
   */
  query<T>(entity: string, filters: QueryFilter[], options?: QueryOptions): Promise<QueryResult<T>>;

  /**
   * Get a single record by ID
   */
  get<T>(entity: string, id: string, fields?: string[]): Promise<T | null>;

  /**
   * Create a new record
   */
  create<T>(entity: string, data: Partial<T>): Promise<T>;

  /**
   * Update an existing record
   */
  update<T>(entity: string, id: string, data: Partial<T>): Promise<T>;

  /**
   * Delete a record
   */
  delete(entity: string, id: string): Promise<void>;

  /**
   * Upsert (insert or update) a record based on external ID
   */
  upsert<T>(entity: string, externalIdField: string, data: Partial<T>): Promise<T>;

  /**
   * Execute multiple operations in a batch
   */
  batch<T>(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      entity: string;
      id?: string;
      data?: Partial<T>;
    }>
  ): Promise<BatchResult<T>[]>;

  /**
   * Execute a raw query (platform-specific, e.g., SOQL for Salesforce)
   */
  rawQuery<T>(query: string): Promise<T[]>;
}

