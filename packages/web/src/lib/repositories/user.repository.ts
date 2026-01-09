/**
 * User Repository Interface
 * Defines the contract for user data access
 */

import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  AvailabilityProfile,
  GroupMembership,
  CrmUser,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import type { RepositoryOptions } from './types';

// =============================================================================
// User Query Parameters
// =============================================================================

/**
 * Extended query parameters for user queries
 */
export interface UserQueryParams extends QueryParams {
  filters?: {
    /** Filter by status */
    status?: 'active' | 'inactive' | 'suspended';
    /** Filter by enabled state */
    enabled?: boolean;
    /** Filter by group ID */
    groupId?: string;
    /** Filter by license type */
    licenseType?: string;
    /** Filter by permission level */
    permissionLevel?: string;
  };
}

// =============================================================================
// User Repository Interface
// =============================================================================

/**
 * User Repository Interface
 * Provides data access operations for User entities
 */
export interface IUserRepository {
  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  /**
   * Find all users matching the query parameters
   */
  findAll(params: UserQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<User>>;

  /**
   * Find a single user by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<User | null>;

  /**
   * Find a user by their extension number
   */
  findByExtension(extension: string, options?: RepositoryOptions): Promise<User | null>;

  /**
   * Find a user by their email address
   */
  findByEmail(email: string, options?: RepositoryOptions): Promise<User | null>;

  /**
   * Create a new user
   */
  create(data: CreateUserInput): Promise<MutationResult<User>>;

  /**
   * Update an existing user
   */
  update(id: string, data: UpdateUserInput): Promise<MutationResult<User>>;

  /**
   * Delete a user by ID
   */
  delete(id: string): Promise<DeleteResult>;

  // =========================================================================
  // Related Data
  // =========================================================================

  /**
   * Get group memberships for a user
   */
  getGroupMemberships(userId: string): Promise<GroupMembership[]>;

  /**
   * Get all availability profiles
   */
  getAvailabilityProfiles(): Promise<AvailabilityProfile[]>;

  /**
   * Get CRM users available for linking
   */
  getCrmUsers(): Promise<CrmUser[]>;

  // =========================================================================
  // Validation Helpers
  // =========================================================================

  /**
   * Check if an extension is available (not used by another user or group)
   * @param extension - Extension to check
   * @param excludeUserId - Optional user ID to exclude from check (for updates)
   */
  isExtensionAvailable(extension: string, excludeUserId?: string): Promise<boolean>;

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  /**
   * Toggle enabled state for a user
   */
  toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>>;

  // =========================================================================
  // Profile Operations
  // =========================================================================

  /**
   * Find a user by their linked Salesforce User ID
   * Used for looking up the current user's AVS profile
   */
  findBySalesforceUserId(salesforceUserId: string): Promise<User | null>;

  /**
   * Get detailed profile data for a user including groups, devices, voicemails, etc.
   * Used by the My Profile page
   */
  getProfileData(userId: string): Promise<UserProfileData>;
}

// =============================================================================
// User Profile Data
// =============================================================================

/**
 * Extended profile data returned by getProfileData
 */
export interface UserProfileData {
  homeCountry: string;
  homeCountryCode: string;
  defaultVoice: string;
  groups: Array<{
    id: string;
    name: string;
    extension?: string;
    groupPickup?: string;
    isPrimary: boolean;
    hasPbxOrManager: boolean;
  }>;
  devices: Array<{
    id: string;
    name: string;
    number?: string;
    type?: string;
    isEnabled: boolean;
    isRegistered: boolean;
  }>;
  activeInboundNumbers: Array<{
    number: string;
    enabled: boolean;
  }>;
  voicemails: Array<{
    id: string;
    uuid: string;
    dateTime: string;
    dialledNumber: string;
    duration: number;
    canPlay: boolean;
  }>;
  ddis: string[];
}
