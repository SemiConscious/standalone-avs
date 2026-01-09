/**
 * Call Log domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Call Log Types
// =============================================================================

export type CallDirection = 'Inbound' | 'Outbound' | 'Internal';

// =============================================================================
// Call Log Entity
// =============================================================================

/**
 * Call Log entity - represents a completed call
 */
export interface CallLog {
  /** Unique identifier */
  id: string;
  /** Date and time of the call */
  dateTime: string;
  /** Calling party number */
  fromNumber: string;
  /** Called party number */
  toNumber: string;
  /** Call direction */
  direction: CallDirection;
  /** Duration of talking time in seconds */
  duration: number;
  /** Time spent ringing in seconds */
  ringingTime: number;
  /** Time spent in hunt group hunting in seconds */
  huntingTime: number;
  /** Whether a recording exists for this call */
  hasRecording: boolean;
  /** Recording ID (if recording exists) */
  recordingId?: string;
  /** Calling user ID */
  fromUserId?: string;
  /** Calling user name */
  fromUserName?: string;
  /** Called user ID */
  toUserId?: string;
  /** Called user name */
  toUserName?: string;
}

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Filters for call log queries
 */
export interface CallLogFilters {
  /** Start date for date range filter */
  fromDate?: string;
  /** End date for date range filter */
  toDate?: string;
  /** Filter by user ID (either from or to) */
  userId?: string;
  /** Filter by phone number (partial match) */
  phoneNumber?: string;
  /** Filter by call direction */
  direction?: CallDirection;
  /** Only show calls with recordings */
  hasRecording?: boolean;
}

// =============================================================================
// Summary Types
// =============================================================================

/**
 * Summary statistics for a user's calls
 */
export interface UserCallSummary {
  userId: string;
  userName: string;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  internalCalls: number;
  totalDuration: number;
  averageDuration: number;
  recordedCalls: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Parse call direction from string
 */
export function parseCallDirection(directionString: string | undefined): CallDirection {
  switch (directionString?.toLowerCase()) {
    case 'inbound':
      return 'Inbound';
    case 'outbound':
      return 'Outbound';
    case 'internal':
      return 'Internal';
    default:
      return 'Inbound';
  }
}

/**
 * Calculate total duration from call logs
 */
export function calculateTotalDuration(callLogs: CallLog[]): number {
  return callLogs.reduce((sum, log) => sum + log.duration, 0);
}

/**
 * Get default date range (last 7 days)
 */
export function getDefaultDateRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    fromDate: sevenDaysAgo.toISOString().split('T')[0],
    toDate: now.toISOString().split('T')[0],
  };
}
