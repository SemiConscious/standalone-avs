/**
 * Settings Domain Types
 * Platform-agnostic settings interfaces
 */

// =============================================================================
// Insights Settings
// =============================================================================

/**
 * AI/Insights settings configuration
 */
export interface InsightsSettings {
  /** Transcription language for insights (e.g., 'en-GB', 'en-US') */
  language: string;
  /** Transcription provider */
  provider: string;
  /** Whether insights feature is enabled */
  enabled: boolean;
  /** Whether call summarization is enabled */
  summarizationEnabled: boolean;
  /** Whether to use recording access rules to control insights access */
  accessByRecordingAccess: boolean;
  /** Whether end users can access their own call insights */
  endUserAccess: boolean;
}

// =============================================================================
// Org Settings
// =============================================================================

/**
 * Organization-level settings
 */
export interface OrgSettings {
  /** Default timezone */
  timeZone?: string;
  /** Default TTS voice */
  voice?: string;
  /** Default country code */
  countryCode?: string;
  /** External caller ID number */
  externalCallerIdNumber?: string;
  /** Whether to present caller ID */
  presentCallerId?: boolean;
  /** Home region */
  homeRegion?: string;
  /** Insights settings */
  insights: InsightsSettings;
}
