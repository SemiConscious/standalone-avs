/**
 * Dashboard Repository Interface
 * Defines operations for fetching dashboard/admin data
 */

import type {
  DashboardInventory,
  DashboardMonitoring,
  ScheduledJob,
  OrganizationInfo,
} from '$lib/domain';

/**
 * Repository for dashboard data operations
 */
export interface IDashboardRepository {
  /**
   * Get inventory counts for core entities
   */
  getInventoryCounts(): Promise<DashboardInventory>;

  /**
   * Get monitoring counts (event logs, error logs, etc.)
   */
  getMonitoringCounts(): Promise<DashboardMonitoring>;

  /**
   * Get all scheduled jobs with their current status
   */
  getScheduledJobs(): Promise<ScheduledJob[]>;

  /**
   * Get organization information
   */
  getOrganizationInfo(): Promise<OrganizationInfo>;

  /**
   * Start a scheduled job
   * @param jobId - The job identifier
   */
  startJob(jobId: string): Promise<void>;

  /**
   * Stop a scheduled job
   * @param jobId - The job identifier
   */
  stopJob(jobId: string): Promise<void>;
}
