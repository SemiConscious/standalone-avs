/**
 * Call Reporting Repository Interface
 * Defines the contract for call log/reporting data access
 */

// =============================================================================
// Types
// =============================================================================

export interface CallLogExportOptions {
  startDate?: string;
  endDate?: string;
  direction?: string;
  fields: string[];
  limit: number;
}

export interface CallLogSummary {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  avgWaitTime: number;
  answerRate: number;
}

export interface CallLogByDirection {
  direction: string;
  count: number;
  percentage: number;
}

export interface CallLogByResult {
  result: string;
  count: number;
  percentage: number;
}

export interface CallLogByAgent {
  agentId: string;
  agentName: string;
  totalCalls: number;
  answered: number;
  avgDuration: number;
  answerRate: number;
}

export interface CallLogByGroup {
  groupId: string;
  groupName: string;
  totalCalls: number;
  answered: number;
  avgWaitTime: number;
  answerRate: number;
}

export interface CallReportData {
  summary: CallLogSummary;
  byDirection?: CallLogByDirection[];
  byResult?: CallLogByResult[];
  byAgent?: CallLogByAgent[];
  byGroup?: CallLogByGroup[];
  byHour?: { hour: number; count: number }[];
  trend?: { date: string; calls: number; answered: number }[];
}

// =============================================================================
// Call Reporting Repository Interface
// =============================================================================

export interface ICallReportingRepository {
  /**
   * Export call logs with specified fields and filters
   */
  exportCallLogs(options: CallLogExportOptions): Promise<Record<string, string | number>[]>;

  /**
   * Get report data for a specific report type
   */
  getReportData(
    reportType: string,
    dateRange: { start: string; end: string }
  ): Promise<CallReportData>;

  /**
   * Get summary statistics for a date range
   */
  getSummary(dateRange: { start: string; end: string }): Promise<CallLogSummary>;
}
