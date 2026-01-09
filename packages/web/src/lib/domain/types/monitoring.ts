/**
 * Monitoring Domain Types
 * Platform-agnostic types for event logs, error logs, and system monitoring
 */

import type { ISODateTimeString } from './common';

// =============================================================================
// Event Log Types
// =============================================================================

/**
 * Severity level for logs
 */
export type LogSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * An event log entry
 */
export interface EventLog {
  /** Unique identifier */
  id: string;
  /** Event type/category */
  type: string;
  /** Event message */
  message: string;
  /** Severity level */
  severity: LogSeverity;
  /** When the event occurred */
  timestamp: ISODateTimeString;
  /** Source service or component */
  source?: string;
  /** Related user ID */
  userId?: string;
  /** Related user name */
  userName?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * An error log entry
 */
export interface ErrorLog {
  /** Unique identifier */
  id: string;
  /** Error type/category */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace if available */
  stackTrace?: string;
  /** When the error occurred */
  timestamp: ISODateTimeString;
  /** Source service or component */
  source?: string;
  /** Related user ID */
  userId?: string;
  /** Related user name */
  userName?: string;
  /** Number of occurrences */
  count?: number;
  /** Whether the error has been resolved */
  resolved?: boolean;
}

// =============================================================================
// Service Status Types
// =============================================================================

/**
 * Status of a service
 */
export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

/**
 * A monitored service
 */
export interface ServiceInfo {
  /** Service identifier */
  id: string;
  /** Service name */
  name: string;
  /** Current status */
  status: ServiceStatus;
  /** Last check time */
  lastChecked?: ISODateTimeString;
  /** Response time in ms */
  responseTime?: number;
  /** Recent events for this service */
  recentEvents?: EventLog[];
}

// =============================================================================
// Statistics Types
// =============================================================================

/**
 * Monitoring statistics
 */
export interface MonitoringStats {
  /** Total event count for the period */
  totalEvents: number;
  /** Total error count for the period */
  totalErrors: number;
  /** Total warning count for the period */
  totalWarnings: number;
  /** Events in the last 24 hours */
  eventsLast24h: number;
  /** Errors in the last 24 hours */
  errorsLast24h: number;
  /** Warnings in the last 24 hours */
  warningsLast24h: number;
  /** Services being monitored */
  services: ServiceInfo[];
}

// =============================================================================
// Query Parameters
// =============================================================================

/**
 * Parameters for querying monitoring data
 */
export interface MonitoringQueryParams {
  /** Start date for the query */
  startDate?: ISODateTimeString;
  /** End date for the query */
  endDate?: ISODateTimeString;
  /** Filter by severity */
  severity?: LogSeverity[];
  /** Filter by source/service */
  source?: string;
  /** Filter by type */
  type?: string;
  /** Search term */
  search?: string;
  /** Page number */
  page?: number;
  /** Page size */
  pageSize?: number;
}
