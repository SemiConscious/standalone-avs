/**
 * Server-Side Pagination Utilities
 * 
 * Provides standardized pagination, sorting, and filtering for list endpoints.
 * Works with Salesforce SOQL queries and in-memory data.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Pagination request parameters from URL
 */
export interface PaginationParams {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
  /** Search query */
  search?: string;
  /** Additional filters as key-value pairs */
  filters: Record<string, string>;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Data items for current page */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNextPage: boolean;
  /** Whether there's a previous page */
  hasPreviousPage: boolean;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'like' | 'in' | 'gt' | 'gte' | 'lt' | 'lte';
  value: string | string[] | number | boolean;
}

// =============================================================================
// URL Parameter Parsing
// =============================================================================

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(
  url: URL,
  defaults: Partial<PaginationParams> = {}
): PaginationParams {
  const searchParams = url.searchParams;
  
  // Parse standard pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(
    100, // Max page size
    Math.max(1, parseInt(searchParams.get('pageSize') || String(defaults.pageSize || 25), 10))
  );
  const sortBy = searchParams.get('sortBy') || defaults.sortBy;
  const sortOrder = (searchParams.get('sortOrder') || defaults.sortOrder || 'asc') as 'asc' | 'desc';
  const search = searchParams.get('search') || searchParams.get('q') || undefined;
  
  // Parse additional filters (all params that aren't standard pagination params)
  const standardParams = ['page', 'pageSize', 'sortBy', 'sortOrder', 'search', 'q'];
  const filters: Record<string, string> = {};
  
  for (const [key, value] of searchParams.entries()) {
    if (!standardParams.includes(key)) {
      filters[key] = value;
    }
  }
  
  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    search,
    filters,
  };
}

/**
 * Build URL search params from pagination config
 */
export function buildPaginationUrl(
  baseUrl: string,
  params: Partial<PaginationParams>
): string {
  const url = new URL(baseUrl);
  
  if (params.page && params.page > 1) {
    url.searchParams.set('page', String(params.page));
  }
  if (params.pageSize && params.pageSize !== 25) {
    url.searchParams.set('pageSize', String(params.pageSize));
  }
  if (params.sortBy) {
    url.searchParams.set('sortBy', params.sortBy);
  }
  if (params.sortOrder && params.sortOrder !== 'asc') {
    url.searchParams.set('sortOrder', params.sortOrder);
  }
  if (params.search) {
    url.searchParams.set('search', params.search);
  }
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }
  
  return url.toString();
}

// =============================================================================
// SOQL Query Building
// =============================================================================

/**
 * Build SOQL ORDER BY clause
 */
export function buildSoqlOrderBy(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'asc',
  defaultSort?: string
): string {
  const field = sortBy || defaultSort;
  if (!field) return '';
  
  const direction = sortOrder === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${field} ${direction} NULLS LAST`;
}

/**
 * Build SOQL LIMIT and OFFSET clauses
 */
export function buildSoqlPagination(page: number, pageSize: number): string {
  const offset = (page - 1) * pageSize;
  return `LIMIT ${pageSize} OFFSET ${offset}`;
}

/**
 * Build SOQL WHERE clause for search across multiple fields
 */
export function buildSoqlSearch(
  searchTerm: string | undefined,
  searchFields: string[]
): string {
  if (!searchTerm || searchTerm.trim() === '' || searchFields.length === 0) {
    return '';
  }
  
  // Escape special characters for SOQL LIKE
  const escaped = searchTerm
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  
  const conditions = searchFields.map(
    field => `${field} LIKE '%${escaped}%'`
  );
  
  return `(${conditions.join(' OR ')})`;
}

/**
 * Build SOQL WHERE clause for filters
 */
export function buildSoqlFilters(
  filters: FilterConfig[]
): string {
  if (filters.length === 0) return '';
  
  const conditions = filters.map(filter => {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'eq':
        if (typeof value === 'boolean') {
          return `${field} = ${value}`;
        }
        if (typeof value === 'number') {
          return `${field} = ${value}`;
        }
        return `${field} = '${escapeForSoql(String(value))}'`;
        
      case 'neq':
        if (typeof value === 'boolean') {
          return `${field} != ${value}`;
        }
        if (typeof value === 'number') {
          return `${field} != ${value}`;
        }
        return `${field} != '${escapeForSoql(String(value))}'`;
        
      case 'like':
        return `${field} LIKE '%${escapeForSoql(String(value))}%'`;
        
      case 'in':
        if (Array.isArray(value)) {
          const escaped = value.map(v => `'${escapeForSoql(String(v))}'`).join(',');
          return `${field} IN (${escaped})`;
        }
        return `${field} = '${escapeForSoql(String(value))}'`;
        
      case 'gt':
        return `${field} > ${value}`;
        
      case 'gte':
        return `${field} >= ${value}`;
        
      case 'lt':
        return `${field} < ${value}`;
        
      case 'lte':
        return `${field} <= ${value}`;
        
      default:
        return '';
    }
  }).filter(Boolean);
  
  return conditions.join(' AND ');
}

/**
 * Escape string for use in SOQL
 */
function escapeForSoql(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

/**
 * Combine multiple WHERE conditions
 */
export function combineSoqlConditions(conditions: string[]): string {
  const filtered = conditions.filter(c => c.trim() !== '');
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return `WHERE ${filtered[0]}`;
  return `WHERE ${filtered.join(' AND ')}`;
}

// =============================================================================
// In-Memory Pagination
// =============================================================================

/**
 * Apply pagination to an in-memory array
 */
export function paginateArray<T>(
  items: T[],
  params: PaginationParams,
  options?: {
    searchFn?: (item: T, search: string) => boolean;
    sortFn?: (a: T, b: T, field: string, order: 'asc' | 'desc') => number;
    filterFn?: (item: T, filters: Record<string, string>) => boolean;
  }
): PaginatedResponse<T> {
  let filtered = [...items];
  
  // Apply search
  if (params.search && options?.searchFn) {
    filtered = filtered.filter(item => options.searchFn!(item, params.search!));
  }
  
  // Apply filters
  if (Object.keys(params.filters).length > 0 && options?.filterFn) {
    filtered = filtered.filter(item => options.filterFn!(item, params.filters));
  }
  
  // Apply sort
  if (params.sortBy && options?.sortFn) {
    filtered.sort((a, b) => options.sortFn!(a, b, params.sortBy!, params.sortOrder));
  }
  
  // Calculate pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize));
  const page = Math.min(params.page, totalPages);
  const offset = (page - 1) * params.pageSize;
  
  // Slice for current page
  const pageItems = filtered.slice(offset, offset + params.pageSize);
  
  return {
    items: pageItems,
    pagination: {
      page,
      pageSize: params.pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Generic search function for objects
 */
export function createSearchFn<T>(
  searchFields: (keyof T)[]
): (item: T, search: string) => boolean {
  return (item: T, search: string) => {
    const searchLower = search.toLowerCase();
    return searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchLower);
      }
      if (typeof value === 'number') {
        return String(value).includes(search);
      }
      return false;
    });
  };
}

/**
 * Generic sort function for objects
 */
export function createSortFn<T>(): (
  a: T,
  b: T,
  field: string,
  order: 'asc' | 'desc'
) => number {
  return (a: T, b: T, field: string, order: 'asc' | 'desc') => {
    const aVal = (a as Record<string, unknown>)[field];
    const bVal = (b as Record<string, unknown>)[field];
    
    let comparison = 0;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return order === 'desc' ? -comparison : comparison;
  };
}

/**
 * Generic filter function for objects
 */
export function createFilterFn<T>(
  filterFields: (keyof T)[]
): (item: T, filters: Record<string, string>) => boolean {
  return (item: T, filters: Record<string, string>) => {
    for (const [key, value] of Object.entries(filters)) {
      if (!filterFields.includes(key as keyof T)) continue;
      
      const itemValue = item[key as keyof T];
      
      // Handle boolean filters
      if (value === 'true' || value === 'false') {
        if (Boolean(itemValue) !== (value === 'true')) {
          return false;
        }
        continue;
      }
      
      // Handle string/equality filters
      if (String(itemValue) !== value) {
        return false;
      }
    }
    
    return true;
  };
}

// =============================================================================
// Response Building
// =============================================================================

/**
 * Build pagination metadata from query results
 */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  
  return {
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

/**
 * Build a paginated response
 */
export function buildPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  totalItems: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: buildPaginationMeta(page, pageSize, totalItems),
  };
}

