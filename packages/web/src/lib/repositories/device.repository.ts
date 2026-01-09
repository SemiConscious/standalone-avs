/**
 * Device Repository Interface
 * Defines the contract for device data access
 */

import type {
  Device,
  CreateDeviceInput,
  UpdateDeviceInput,
  DeviceMapping,
  DeviceType,
  QueryParams,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import type { RepositoryOptions } from './types';

// =============================================================================
// Device Query Parameters
// =============================================================================

/**
 * Extended query parameters for device queries
 */
export interface DeviceQueryParams extends QueryParams {
  filters?: {
    /** Filter by device type */
    type?: DeviceType;
    /** Filter by enabled state */
    enabled?: boolean;
    /** Filter by registration status */
    registered?: boolean;
    /** Filter by assigned user ID */
    assignedUserId?: string;
  };
}

// =============================================================================
// Device Repository Interface
// =============================================================================

/**
 * Device Repository Interface
 * Provides data access operations for Device entities
 */
export interface IDeviceRepository {
  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  /**
   * Find all devices matching the query parameters
   */
  findAll(params: DeviceQueryParams, options?: RepositoryOptions): Promise<PaginatedResult<Device>>;

  /**
   * Find a single device by ID
   */
  findById(id: string, options?: RepositoryOptions): Promise<Device | null>;

  /**
   * Find a device by extension
   */
  findByExtension(extension: string, options?: RepositoryOptions): Promise<Device | null>;

  /**
   * Find a device by MAC address
   */
  findByMacAddress(macAddress: string, options?: RepositoryOptions): Promise<Device | null>;

  /**
   * Create a new device
   */
  create(data: CreateDeviceInput): Promise<MutationResult<Device>>;

  /**
   * Update an existing device
   */
  update(id: string, data: UpdateDeviceInput): Promise<MutationResult<Device>>;

  /**
   * Delete a device by ID
   */
  delete(id: string): Promise<DeleteResult>;

  // =========================================================================
  // Device Mappings
  // =========================================================================

  /**
   * Get device mappings for a device
   */
  getMappings(deviceId: string): Promise<DeviceMapping[]>;

  /**
   * Assign a device to a user
   */
  assignToUser(deviceId: string, userId: string): Promise<MutationResult<DeviceMapping>>;

  /**
   * Unassign a device from a user
   */
  unassignFromUser(deviceId: string, userId: string): Promise<DeleteResult>;

  /**
   * Get all devices assigned to a user
   */
  getDevicesForUser(userId: string): Promise<Device[]>;

  // =========================================================================
  // Status Operations
  // =========================================================================

  /**
   * Sync device registration status from external system
   */
  syncRegistrationStatus(deviceId: string): Promise<MutationResult<Device>>;

  /**
   * Toggle device enabled state
   */
  toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>>;

  /**
   * Check if an extension is available (not used by another device, user, or group)
   * @param extension - Extension to check
   * @param excludeDeviceId - Optional device ID to exclude from check (for updates)
   */
  isExtensionAvailable(extension: string, excludeDeviceId?: string): Promise<boolean>;
}
