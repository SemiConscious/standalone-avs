/**
 * User domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// User Status & Permission Types
// =============================================================================

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type PermissionLevel = 'Basic' | 'Team Leader' | 'Admin';

// =============================================================================
// License Types
// =============================================================================

export interface UserLicenses {
  /** CTI (Computer Telephony Integration) license */
  cti: boolean;
  /** PBX (Private Branch Exchange) license */
  pbx: boolean;
  /** Manager/Supervisor license */
  manager: boolean;
  /** Call Recording license */
  record: boolean;
  /** PCI Compliance license */
  pci: boolean;
  /** Service Cloud Voice license */
  scv: boolean;
  /** SMS messaging license */
  sms: boolean;
  /** WhatsApp messaging license */
  whatsApp: boolean;
  /** AI Insights/Advisor license */
  insights: boolean;
  /** Freedom (remote work) license */
  freedom: boolean;
}

export type LicenseType = keyof UserLicenses;

/**
 * All license types
 */
export const LICENSE_TYPES: LicenseType[] = [
  'cti', 'pbx', 'manager', 'record', 'pci', 'scv', 'sms', 'whatsApp', 'insights', 'freedom'
];

/**
 * Create default licenses (all false)
 */
export function createDefaultLicenses(): UserLicenses {
  return {
    cti: false,
    pbx: false,
    manager: false,
    record: false,
    pci: false,
    scv: false,
    sms: false,
    whatsApp: false,
    insights: false,
    freedom: false,
  };
}

// =============================================================================
// User Entity
// =============================================================================

/**
 * User entity - represents a Natterbox user
 */
export interface User {
  /** Unique identifier (platform-specific) */
  id: string;
  /** External platform ID (e.g., Sapien user ID) */
  platformId?: number;
  /** Full display name */
  name: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Email address */
  email: string;
  /** Username (often same as email) */
  username: string;
  /** SIP extension number */
  extension: string;
  /** Mobile phone number */
  mobilePhone: string;
  /** User status */
  status: UserStatus;
  /** Whether the user is enabled */
  enabled: boolean;
  /** Assigned licenses */
  licenses: UserLicenses;
  /** Permission level */
  permissionLevel: PermissionLevel;
  /** Whether to track outbound CTI device */
  trackOutboundCTIDevice: boolean;
  /** Availability profile name */
  availabilityProfile?: string;
  /** Current availability state */
  availabilityState?: string;
  /** Linked CRM user info */
  linkedCrmUser?: LinkedCrmUser;
  /** Group names the user belongs to */
  groups: string[];
}

/**
 * Linked CRM user (e.g., Salesforce User)
 */
export interface LinkedCrmUser {
  /** Display name */
  name: string;
  /** Email address */
  email: string;
}

// =============================================================================
// Availability Types
// =============================================================================

/**
 * Availability profile
 */
export interface AvailabilityProfile {
  /** Unique identifier */
  id: string;
  /** Profile name */
  name: string;
  /** Sapien platform ID */
  sapienId?: number;
  /** Creator name */
  createdByName?: string;
}

/**
 * Group membership info for a user
 */
export interface GroupMembership {
  /** Group ID */
  groupId: string;
  /** Group name */
  groupName: string;
}

// =============================================================================
// CRM User (for linking)
// =============================================================================

/**
 * CRM system user for linking to Natterbox user
 */
export interface CrmUser {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Email address */
  email: string;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  extension?: string;
  mobilePhone?: string;
  enabled?: boolean;
  licenses?: Partial<UserLicenses>;
  permissionLevel?: PermissionLevel;
  availabilityProfileId?: string;
  linkedCrmUserId?: string;
}

/**
 * Input for updating an existing user
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  extension?: string;
  mobilePhone?: string;
  enabled?: boolean;
  licenses?: Partial<UserLicenses>;
  permissionLevel?: PermissionLevel;
  trackOutboundCTIDevice?: boolean;
  availabilityProfileId?: string;
  linkedCrmUserId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get user's full name from first and last name
 */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * Determine user status from enabled flag and status string
 */
export function determineUserStatus(enabled: boolean, statusString?: string): UserStatus {
  if (!enabled) return 'inactive';
  if (statusString === 'SUSPENDED') return 'suspended';
  return 'active';
}
