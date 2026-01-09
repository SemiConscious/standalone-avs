/**
 * Group Repository Interface
 * Defines the contract for group data access
 */

import type {
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  GroupMember,
  AddGroupMemberInput,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import type { RepositoryOptions } from './types';

// =============================================================================
// Group Query Parameters
// =============================================================================

/**
 * Extended query parameters for group queries
 */
export interface GroupQueryParams extends QueryParams {
  filters?: {
    /** Filter by PBX enabled */
    pbx?: boolean;
    /** Filter by Manager enabled */
    manager?: boolean;
    /** Filter by Record enabled */
    record?: boolean;
  };
}

// =============================================================================
// Group Repository Interface
// =============================================================================

/**
 * Group Repository Interface
 * Provides data access operations for Group entities
 */
export interface IGroupRepository {
  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  /**
   * Find all groups matching the query parameters
   */
  findAll(params: GroupQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<Group>>;

  /**
   * Find a single group by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<Group | null>;

  /**
   * Find a group by extension
   */
  findByExtension(extension: string, options?: RepositoryOptions): Promise<Group | null>;

  /**
   * Create a new group
   */
  create(data: CreateGroupInput): Promise<MutationResult<Group>>;

  /**
   * Update an existing group
   */
  update(id: string, data: UpdateGroupInput): Promise<MutationResult<Group>>;

  /**
   * Delete a group by ID
   */
  delete(id: string): Promise<DeleteResult>;

  // =========================================================================
  // Member Management
  // =========================================================================

  /**
   * Get all members of a group
   */
  getMembers(groupId: string): Promise<GroupMember[]>;

  /**
   * Add a member to a group
   */
  addMember(input: AddGroupMemberInput): Promise<MutationResult<GroupMember>>;

  /**
   * Remove a member from a group
   */
  removeMember(groupId: string, userId: string): Promise<DeleteResult>;

  /**
   * Update member order/priority
   */
  updateMemberOrder(groupId: string, userId: string, ringOrder: number): Promise<MutationResult<GroupMember>>;

  // =========================================================================
  // Aggregations
  // =========================================================================

  /**
   * Get member counts for multiple groups
   * @returns Map of groupId -> memberCount
   */
  getMemberCounts(groupIds: string[]): Promise<Map<string, number>>;

  // =========================================================================
  // Validation Helpers
  // =========================================================================

  /**
   * Check if an extension is available
   */
  isExtensionAvailable(extension: string, excludeGroupId?: string): Promise<boolean>;

  // =========================================================================
  // Extended Operations (for detail pages)
  // =========================================================================

  /**
   * Remove a member by membership record ID
   * (Alternative to removeMember when you have the membership ID directly)
   */
  removeMemberById(membershipId: string): Promise<DeleteResult>;

  /**
   * Bulk update member priorities
   */
  bulkUpdateMemberPriorities(
    updates: { membershipId: string; priority: number }[]
  ): Promise<MutationResult<void>>;

  /**
   * Get users available to be added to a group
   * Returns enabled users not already in the specified group
   */
  getAvailableUsersForGroup(
    groupId: string,
    options?: { limit?: number }
  ): Promise<{ id: string; name: string; username: string; extension: string }[]>;

  // =========================================================================
  // Admin/Permission Operations
  // =========================================================================

  /**
   * Get groups that a user has admin permissions on
   * Used for call status and supervisor features
   */
  getAdminGroupsForUser(userId: string): Promise<AdminGroupPermission[]>;
}

/**
 * Admin permission record for a group
 */
export interface AdminGroupPermission {
  groupId: string;
  groupName: string;
  liveCallStatus: boolean;
  listenIn: boolean;
  agentState: boolean;
}
