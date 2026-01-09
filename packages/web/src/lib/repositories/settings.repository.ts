/**
 * Settings Repository Interface
 * Defines the contract for settings data access
 */

import type { InsightsSettings, OrgSettings } from '$lib/domain';

// =============================================================================
// Settings Types
// =============================================================================

/**
 * Messaging settings
 */
export interface MessagingSettings {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappConfigured: boolean;
  whatsappBusinessId?: string;
}

/**
 * Autocomplete configuration
 */
export interface AutocompleteConfig {
  id: string;
  developerName: string;
  label: string;
  objectName: string;
  type: string;
  product: string;
  active: boolean;
}

// =============================================================================
// Settings Repository Interface
// =============================================================================

/**
 * Settings Repository Interface
 * Provides data access operations for organization settings
 */
export interface ISettingsRepository {
  /**
   * Get insights/AI settings
   */
  getInsightsSettings(): Promise<InsightsSettings>;

  /**
   * Get full organization settings
   */
  getOrgSettings(): Promise<OrgSettings>;

  /**
   * Update insights settings
   */
  updateInsightsSettings(settings: Partial<InsightsSettings>): Promise<void>;

  /**
   * Get messaging settings (SMS, WhatsApp)
   */
  getMessagingSettings(): Promise<MessagingSettings>;

/**
 * Get autocomplete configurations
 */
getAutocompleteConfigs(): Promise<AutocompleteConfig[]>;

/**
 * Get account-level settings (telephony, presentation, etc.)
 */
getAccountSettings(): Promise<AccountSettingsData>;

/**
 * Get preset options for dropdowns
 */
getPresets(): Promise<PresetsData>;
}

/**
 * Account settings data
 */
export interface AccountSettingsData {
  holdMusic?: string;
  holdMusicShoutcast?: string;
  countryCode?: string;
  countryCodeLabel?: string;
  timeZone?: string;
  voice?: string;
  voiceLabel?: string;
  presentCallerId?: boolean;
  externalCallerIdNumber?: string;
  controlByRecordingAccess?: boolean;
  enableEndUserAccessAllInsights?: boolean;
  newUsersTrackCTIDevice?: boolean;
  permissionsLevelManagementViaSF?: boolean;
  reportingInterval?: number;
}

/**
 * Preset dropdown options
 */
export interface PresetsData {
  countryCode?: { value: string; label: string }[];
  timeZone?: { value: string; label: string }[];
  voice?: { value: string; label: string }[];
}
