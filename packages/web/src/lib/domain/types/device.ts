/**
 * Device domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Device Types
// =============================================================================

export type DeviceType = 'SIP' | 'Softphone' | 'Web Phone' | 'Mobile' | 'Unknown';

// =============================================================================
// Device Entity
// =============================================================================

/**
 * Device entity - represents a phone device
 */
export interface Device {
  /** Unique identifier */
  id: string;
  /** External platform ID (e.g., Sapien device ID) */
  platformId?: number;
  /** Device extension */
  extension: string;
  /** Physical location */
  location: string;
  /** Device description */
  description: string;
  /** Device type */
  type: DeviceType;
  /** Device model/make */
  model: string;
  /** MAC address */
  macAddress: string;
  /** Whether the device is enabled */
  enabled: boolean;
  /** Whether the device is currently registered */
  registered: boolean;
  /** Registration expiry time */
  registrationExpiry?: string;
  /** Last modified date */
  lastModified: string;
  /** Assigned user ID */
  assignedUserId?: string;
  /** Assigned user name */
  assignedUserName?: string;
}

// =============================================================================
// Device Mapping Types
// =============================================================================

/**
 * Device mapping - links a device to a user
 */
export interface DeviceMapping {
  /** Mapping ID */
  id: string;
  /** Device ID */
  deviceId: string;
  /** User ID */
  userId: string;
  /** User name */
  userName?: string;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a new device
 */
export interface CreateDeviceInput {
  extension: string;
  location?: string;
  description?: string;
  type?: DeviceType;
  model?: string;
  macAddress?: string;
  enabled?: boolean;
  assignedUserId?: string;
}

/**
 * Input for updating an existing device
 */
export interface UpdateDeviceInput {
  extension?: string;
  location?: string;
  description?: string;
  type?: DeviceType;
  model?: string;
  macAddress?: string;
  enabled?: boolean;
  assignedUserId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a MAC address consistently (XX:XX:XX:XX:XX:XX)
 */
export function formatMacAddress(mac: string | null | undefined): string {
  if (!mac) return '';
  // Remove any existing separators and format as XX:XX:XX:XX:XX:XX
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '');
  if (cleaned.length === 12) {
    return cleaned.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
  }
  return mac;
}

/**
 * Parse device type from string
 */
export function parseDeviceType(typeString: string | undefined): DeviceType {
  const normalized = typeString?.toLowerCase();
  switch (normalized) {
    case 'sip':
      return 'SIP';
    case 'softphone':
      return 'Softphone';
    case 'web phone':
    case 'webphone':
    case 'webrtc':
      return 'Web Phone';
    case 'mobile':
      return 'Mobile';
    default:
      return 'Unknown';
  }
}
