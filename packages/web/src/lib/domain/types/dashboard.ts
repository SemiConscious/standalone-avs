/**
 * Dashboard Domain Types
 * Platform-agnostic types for admin dashboard data
 */

// =============================================================================
// Inventory Types
// =============================================================================

/**
 * Counts of core entities in the system
 */
export interface DashboardInventory {
  users: number;
  phoneNumbers: number;
  devices: number;
  groups: number;
  routingPolicies: number;
}

/**
 * Monitoring statistics for the dashboard
 */
export interface DashboardMonitoring {
  recordingAccessCount: number;
  eventLogsToday: number;
  errorLogsToday: number;
}

// =============================================================================
// Scheduled Job Types
// =============================================================================

/**
 * A scheduled background job
 */
export interface ScheduledJob {
  /** Unique identifier for the job */
  id: string;
  /** Display name of the job */
  name: string;
  /** Whether the job is currently running */
  isRunning: boolean;
  /** Whether the job can be started */
  canStart: boolean;
  /** Whether the job can be stopped */
  canStop: boolean;
  /** Optional description of the job */
  description?: string;
  /** Last run time */
  lastRunTime?: string;
  /** Next scheduled run time */
  nextRunTime?: string;
}

// =============================================================================
// Organization Types
// =============================================================================

/**
 * Organization information
 */
export interface OrganizationInfo {
  /** Organization ID */
  id: string;
  /** Instance URL */
  instanceUrl: string;
  /** Organization name */
  name?: string;
}

// =============================================================================
// Complete Dashboard Data
// =============================================================================

/**
 * Complete dashboard data returned by the repository
 */
export interface DashboardData {
  inventory: DashboardInventory;
  monitoring: DashboardMonitoring;
  scheduledJobs: ScheduledJob[];
  jobsRunning: number;
  organization: OrganizationInfo;
}
