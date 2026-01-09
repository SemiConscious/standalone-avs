/**
 * Routing Policy Repository Interface
 * Defines the contract for routing policy data access
 */

import type {
  RoutingPolicy,
  CreateRoutingPolicyInput,
  UpdateRoutingPolicyInput,
  PolicyBody,
  PolicyType,
  PolicyStatus,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import type { RepositoryOptions } from './types';

// =============================================================================
// Routing Policy Query Parameters
// =============================================================================

/**
 * Extended query parameters for routing policy queries
 */
export interface RoutingPolicyQueryParams extends QueryParams {
  filters?: {
    /** Filter by policy type */
    type?: PolicyType;
    /** Filter by status */
    status?: PolicyStatus;
    /** Filter by source (Inbound/Outbound) */
    source?: 'Inbound' | 'Outbound';
    /** Filter by creator user ID */
    createdById?: string;
  };
}

// =============================================================================
// Routing Policy Repository Interface
// =============================================================================

/**
 * Routing Policy Repository Interface
 * Provides data access operations for RoutingPolicy entities
 */
export interface IRoutingPolicyRepository {
  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  /**
   * Find all routing policies matching the query parameters
   */
  findAll(params: RoutingPolicyQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<RoutingPolicy>>;

  /**
   * Find a single routing policy by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<RoutingPolicy | null>;

  /**
   * Find a routing policy by name
   */
  findByName(name: string, options?: RepositoryOptions): Promise<RoutingPolicy | null>;

  /**
   * Create a new routing policy
   */
  create(data: CreateRoutingPolicyInput): Promise<MutationResult<RoutingPolicy>>;

  /**
   * Update an existing routing policy
   */
  update(id: string, data: UpdateRoutingPolicyInput): Promise<MutationResult<RoutingPolicy>>;

  /**
   * Delete a routing policy by ID
   */
  delete(id: string): Promise<DeleteResult>;

  // =========================================================================
  // Policy Body Operations
  // =========================================================================

  /**
   * Get the policy body (visual flow) for a policy
   */
  getPolicyBody(id: string): Promise<PolicyBody | null>;

  /**
   * Update the policy body (visual flow)
   */
  updatePolicyBody(id: string, body: PolicyBody): Promise<MutationResult<RoutingPolicy>>;

  /**
   * Get the policy JSON (execution configuration)
   */
  getPolicyJson(id: string): Promise<string | null>;

  /**
   * Update the policy JSON (execution configuration)
   */
  updatePolicyJson(id: string, policyJson: string): Promise<MutationResult<RoutingPolicy>>;

  // =========================================================================
  // Status Operations
  // =========================================================================

  /**
   * Enable a routing policy
   */
  enable(id: string): Promise<MutationResult<RoutingPolicy>>;

  /**
   * Disable a routing policy
   */
  disable(id: string): Promise<MutationResult<RoutingPolicy>>;

  /**
   * Toggle policy status
   */
  toggleStatus(id: string): Promise<MutationResult<RoutingPolicy>>;

  // =========================================================================
  // Phone Number Assignments
  // =========================================================================

  /**
   * Get phone number assignments for policies
   * @returns Map of policyId -> phone numbers
   */
  getPhoneNumberAssignments(policyIds: string[]): Promise<Map<string, string[]>>;
}
