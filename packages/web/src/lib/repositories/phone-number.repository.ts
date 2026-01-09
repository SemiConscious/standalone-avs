/**
 * Phone Number Repository Interface
 * Defines the contract for phone number data access
 */

import type {
  PhoneNumber,
  AssignPhoneNumberInput,
  UpdatePhoneNumberInput,
  PhoneNumberType,
  PhoneNumberStatus,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import type { RepositoryOptions } from './types';

// =============================================================================
// Phone Number Query Parameters
// =============================================================================

/**
 * Extended query parameters for phone number queries
 */
export interface PhoneNumberQueryParams extends QueryParams {
  filters?: {
    /** Filter by number type */
    type?: PhoneNumberType;
    /** Filter by status */
    status?: PhoneNumberStatus;
    /** Filter by country code */
    countryCode?: string;
    /** Filter by assignment status */
    assigned?: boolean;
    /** Filter by routing policy ID */
    routingPolicyId?: string;
  };
}

// =============================================================================
// Phone Number Repository Interface
// =============================================================================

/**
 * Phone Number Repository Interface
 * Provides data access operations for PhoneNumber entities
 */
export interface IPhoneNumberRepository {
  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  /**
   * Find all phone numbers matching the query parameters
   */
  findAll(params: PhoneNumberQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<PhoneNumber>>;

  /**
   * Find a single phone number by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<PhoneNumber | null>;

  /**
   * Find a phone number by E.164 number
   */
  findByNumber(number: string, options?: RepositoryOptions): Promise<PhoneNumber | null>;

  /**
   * Update a phone number
   */
  update(id: string, data: UpdatePhoneNumberInput): Promise<MutationResult<PhoneNumber>>;

  // =========================================================================
  // Assignment Operations
  // =========================================================================

  /**
   * Assign a phone number to a user, group, or policy
   */
  assign(input: AssignPhoneNumberInput): Promise<MutationResult<PhoneNumber>>;

  /**
   * Unassign a phone number
   */
  unassign(id: string): Promise<MutationResult<PhoneNumber>>;

  /**
   * Get phone numbers assigned to a routing policy
   */
  getByRoutingPolicy(policyId: string): Promise<PhoneNumber[]>;

  /**
   * Get unassigned phone numbers
   */
  getUnassigned(): Promise<PhoneNumber[]>;

  // =========================================================================
  // Aggregations
  // =========================================================================

  /**
   * Get phone numbers grouped by country
   */
  getCountryBreakdown(): Promise<Map<string, number>>;

  /**
   * Get phone numbers grouped by type
   */
  getTypeBreakdown(): Promise<Map<PhoneNumberType, number>>;
}
