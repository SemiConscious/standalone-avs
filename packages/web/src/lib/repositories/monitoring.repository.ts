/**
 * Monitoring Repository Interface
 * Defines operations for event logs, error logs, and system monitoring
 */

import type {
  EventLog,
  ErrorLog,
  MonitoringStats,
  MonitoringQueryParams,
  ServiceInfo,
  PaginatedResult,
} from '$lib/domain';

/**
 * Repository for monitoring data operations
 */
export interface IMonitoringRepository {
  /**
   * Get paginated event logs
   * @param params - Query parameters
   */
  getEventLogs(params?: MonitoringQueryParams): Promise<PaginatedResult<EventLog>>;

  /**
   * Get a single event log by ID
   * @param id - Event log ID
   */
  getEventLogById(id: string): Promise<EventLog | null>;

  /**
   * Get paginated error logs
   * @param params - Query parameters
   */
  getErrorLogs(params?: MonitoringQueryParams): Promise<PaginatedResult<ErrorLog>>;

  /**
   * Get a single error log by ID
   * @param id - Error log ID
   */
  getErrorLogById(id: string): Promise<ErrorLog | null>;

  /**
   * Get monitoring statistics
   */
  getStats(): Promise<MonitoringStats>;

  /**
   * Get status of all monitored services
   */
  getServices(): Promise<ServiceInfo[]>;

  /**
   * Get status of a specific service
   * @param serviceId - Service identifier
   */
  getServiceStatus(serviceId: string): Promise<ServiceInfo | null>;

  /**
   * Get admin-level monitoring counts
   * @returns Counts for event logs, error logs, recording access
   */
  getAdminCounts(): Promise<AdminMonitoringCounts>;

  /**
   * Get scheduled job status
   * @returns List of scheduled jobs and their running status
   */
  getScheduledJobs(): Promise<ScheduledJobInfo[]>;
}

/**
 * Admin monitoring counts for dashboard
 */
export interface AdminMonitoringCounts {
  eventLogsToday: number;
  errorLogsToday: number;
  recordingAccessCount: number;
}

/**
 * Scheduled job information
 */
export interface ScheduledJobInfo {
  id: string;
  name: string;
  isRunning: boolean;
  canStart: boolean;
  canStop: boolean;
}
