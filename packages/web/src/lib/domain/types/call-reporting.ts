/**
 * Call Reporting Domain Types
 * Platform-agnostic types for call reports and analytics
 */

import type { ISODateTimeString } from './common';

// =============================================================================
// Call Report Types
// =============================================================================

/**
 * Direction of a call
 */
export type CallDirection = 'inbound' | 'outbound' | 'internal';

/**
 * Result/disposition of a call
 */
export type CallResult = 
  | 'answered'
  | 'missed'
  | 'voicemail'
  | 'busy'
  | 'failed'
  | 'abandoned'
  | 'transferred'
  | 'other';

/**
 * A call report entry
 */
export interface CallReport {
  /** Unique identifier */
  id: string;
  /** Call direction */
  direction: CallDirection;
  /** Call result/disposition */
  result: CallResult;
  /** When the call occurred */
  dateTime: ISODateTimeString;
  /** Phone number involved */
  number: string;
  /** Duration in seconds - time talking */
  timeTalking: number;
  /** Duration in seconds - time ringing */
  timeRinging: number;
  /** Duration in seconds - time in queue */
  timeInQueue: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** User ID who handled the call */
  userId?: string;
  /** User name who handled the call */
  userName?: string;
  /** Group ID if call was to a group */
  groupId?: string;
  /** Group name if call was to a group */
  groupName?: string;
  /** Recording URL if available */
  recordingUrl?: string;
  /** Whether the call has a recording */
  hasRecording: boolean;
  /** Caller ID */
  callerId?: string;
  /** Skills involved in routing */
  skills?: string[];
}

// =============================================================================
// Statistics Types
// =============================================================================

/**
 * Call statistics for a period
 */
export interface CallReportStats {
  /** Total number of calls */
  totalCalls: number;
  /** Number of answered calls */
  answeredCalls: number;
  /** Number of missed calls */
  missedCalls: number;
  /** Average talk time in seconds */
  avgTalkTime: number;
  /** Average wait time in seconds */
  avgWaitTime: number;
  /** Answer rate percentage */
  answerRate: number;
  /** Calls by direction */
  byDirection: {
    inbound: number;
    outbound: number;
    internal: number;
  };
  /** Calls by result */
  byResult: Record<CallResult, number>;
  /** Calls by hour of day */
  byHour?: number[];
  /** Calls by day of week */
  byDayOfWeek?: number[];
}

/**
 * Call statistics grouped by a dimension
 */
export interface GroupedCallStats {
  /** The grouping key (user ID, group ID, etc.) */
  key: string;
  /** Display label */
  label: string;
  /** Statistics for this group */
  stats: CallReportStats;
}

// =============================================================================
// Query Parameters
// =============================================================================

/**
 * Parameters for querying call reports
 */
export interface CallReportQueryParams {
  /** Start date for the query */
  startDate?: ISODateTimeString;
  /** End date for the query */
  endDate?: ISODateTimeString;
  /** Filter by direction */
  direction?: CallDirection[];
  /** Filter by result */
  result?: CallResult[];
  /** Filter by user ID */
  userId?: string;
  /** Filter by group ID */
  groupId?: string;
  /** Filter by phone number */
  number?: string;
  /** Minimum duration in seconds */
  minDuration?: number;
  /** Maximum duration in seconds */
  maxDuration?: number;
  /** Only include calls with recordings */
  hasRecording?: boolean;
  /** Search term */
  search?: string;
  /** Page number */
  page?: number;
  /** Page size */
  pageSize?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Parameters for exporting call reports
 */
export interface CallReportExportParams extends CallReportQueryParams {
  /** Export format */
  format: 'csv' | 'xlsx' | 'json';
  /** Fields to include in export */
  fields?: string[];
}
