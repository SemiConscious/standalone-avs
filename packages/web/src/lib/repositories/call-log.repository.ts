/**
 * Call Log Repository Interface
 * Defines the contract for call log data access
 */

import type {
  CallLog,
  CallLogFilters,
  CallDirection,
  UserCallSummary,
  QueryParams,
  PaginatedResult,
} from '$lib/domain';
import type { RepositoryOptions } from './types';

// =============================================================================
// Call Log Query Parameters
// =============================================================================

/**
 * Extended query parameters for call log queries
 */
export interface CallLogQueryParams extends QueryParams {
  filters?: CallLogFilters;
}

// =============================================================================
// Call Log Repository Interface
// =============================================================================

/**
 * Call Log Repository Interface
 * Provides data access operations for CallLog entities
 * 
 * Note: Call logs are typically read-only - they are created by the telephony system
 */
export interface ICallLogRepository {
  // =========================================================================
  // Query Operations
  // =========================================================================

  /**
   * Find all call logs matching the query parameters
   */
  findAll(params: CallLogQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<CallLog>>;

  /**
   * Find a single call log by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<CallLog | null>;

  /**
   * Find call logs for a specific user
   */
  findByUser(userId: string, params: CallLogQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<CallLog>>;

  /**
   * Find call logs for a specific phone number
   */
  findByPhoneNumber(phoneNumber: string, params: CallLogQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<CallLog>>;

  // =========================================================================
  // Aggregations
  // =========================================================================

  /**
   * Get call summary for a user
   */
  getUserSummary(userId: string, fromDate: string, toDate: string): Promise<UserCallSummary>;

  /**
   * Get total call count for a date range
   */
  getTotalCount(fromDate: string, toDate: string): Promise<number>;

  /**
   * Get call count by direction
   */
  getCountByDirection(fromDate: string, toDate: string): Promise<Map<CallDirection, number>>;

  /**
   * Get total duration for a date range
   */
  getTotalDuration(fromDate: string, toDate: string): Promise<number>;

  // =========================================================================
  // Recording Access
  // =========================================================================

  /**
   * Check if a recording exists for a call
   */
  hasRecording(callLogId: string): Promise<boolean>;

  /**
   * Get recording URL for a call
   */
  getRecordingUrl(callLogId: string): Promise<string | null>;
}
