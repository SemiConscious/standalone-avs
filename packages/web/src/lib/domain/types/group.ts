/**
 * Group domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Group Entity
// =============================================================================

/**
 * Group entity - represents a Natterbox group (hunt group, call queue, etc.)
 */
export interface Group {
  /** Unique identifier */
  id: string;
  /** External platform ID (e.g., Sapien group ID) */
  platformId?: number;
  /** Group name */
  name: string;
  /** Group description */
  description: string;
  /** Group email address */
  email: string;
  /** Group extension number */
  extension: string;
  /** Group pickup code (e.g., *61) */
  groupPickup: string;
  /** Whether PBX is enabled for this group */
  pbx: boolean;
  /** Whether Manager features are enabled */
  manager: boolean;
  /** Whether call recording is enabled */
  record: boolean;
  /** Last modified date */
  lastModified: string;
  /** Number of members in the group */
  memberCount?: number;
}

// =============================================================================
// Group Member Types
// =============================================================================

/**
 * Group member - represents a user's membership in a group
 */
export interface GroupMember {
  /** Membership ID */
  id: string;
  /** Group ID */
  groupId: string;
  /** Group name */
  groupName: string;
  /** User ID */
  userId: string;
  /** User name */
  userName: string;
  /** Ring order/priority (if applicable) */
  ringOrder?: number;
}

/**
 * Summary of group license requirements
 */
export interface GroupLicenseRequirements {
  pbx: boolean;
  manager: boolean;
  record: boolean;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a new group
 */
export interface CreateGroupInput {
  name: string;
  description?: string;
  email?: string;
  extension?: string;
  groupPickup?: string;
  pbx?: boolean;
  manager?: boolean;
  record?: boolean;
}

/**
 * Input for updating an existing group
 */
export interface UpdateGroupInput {
  name?: string;
  description?: string;
  email?: string;
  extension?: string;
  groupPickup?: string;
  pbx?: boolean;
  manager?: boolean;
  record?: boolean;
}

/**
 * Input for adding a member to a group
 */
export interface AddGroupMemberInput {
  groupId: string;
  userId: string;
  ringOrder?: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get license requirements for a group
 */
export function getGroupLicenseRequirements(group: Group): GroupLicenseRequirements {
  return {
    pbx: group.pbx,
    manager: group.manager,
    record: group.record,
  };
}
