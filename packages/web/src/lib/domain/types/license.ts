/**
 * License Domain Types
 * Platform-agnostic types for license/subscription data
 */

// =============================================================================
// Subscription Types
// =============================================================================

/**
 * A single subscription/feature
 */
export interface Subscription {
  /** Feature name */
  name: string;
  /** Whether the feature is enabled */
  enabled: boolean;
  /** Count/quantity for this feature (e.g., number of seats) */
  count: number;
  /** Icon identifier for UI display */
  icon: string;
  /** Color identifier for UI display */
  color: string;
}

// =============================================================================
// License Types
// =============================================================================

/**
 * Complete license information
 */
export interface License {
  /** List of subscriptions/features */
  subscriptions: Subscription[];
  /** When the license data was last updated */
  updatedAt?: string;
  /** Whether the license is valid */
  isValid: boolean;
  /** Organization ID this license belongs to */
  organizationId?: string;
}

/**
 * Raw license feature flags and counts
 * Used internally by adapters
 */
export interface LicenseFeatures {
  // Voice features
  voice: boolean;
  voiceCount: number;
  
  // Contact center features
  contactCentre: boolean;
  contactCentreCount: number;
  
  // Recording features
  record: boolean;
  recordCount: number;
  
  // CTI features
  cti: boolean;
  ctiCount: number;
  
  // PCI compliance
  pci: boolean;
  pciCount: number;
  
  // Insights/Analytics
  insights: boolean;
  insightsCount: number;
  
  // Freedom/Mobile
  freedom: boolean;
  freedomCount: number;
  
  // Service Cloud Voice
  serviceCloudVoice: boolean;
  serviceCloudVoiceCount: number;
  
  // SMS
  sms: boolean;
  smsCount: number;
  
  // WhatsApp
  whatsApp: boolean;
  whatsAppCount: number;
  
  // AI Advisor
  aiAdvisor: boolean;
  aiAdvisorCount: number;
  
  // AI Agents
  aiAgents: number;
  aiAgentsCallAllowance: number;
  aiAgentsDigitalMessageAllowance: number;
  
  // AI Assistants
  aiAssistants: number;
  aiAssistantsCallAllowance: number;
  aiAssistantsDigitalMessageAllowance: number;
  
  // Manager license
  manager: boolean;
}
