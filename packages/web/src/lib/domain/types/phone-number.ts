/**
 * Phone Number domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Phone Number Types
// =============================================================================

export type PhoneNumberType = 'geographic' | 'mobile' | 'tollfree' | 'national';

export type PhoneNumberStatus = 'active' | 'inactive' | 'pending';

export type AssignmentType = 'user' | 'group' | 'policy' | 'none';

// =============================================================================
// Phone Number Entity
// =============================================================================

/**
 * Phone Number entity
 * Fields match what the UI components expect
 */
export interface PhoneNumber {
  /** Unique identifier */
  id: string;
  /** Display name/label */
  name: string;
  /** E.164 formatted phone number */
  number: string;
  /** Formatted number for display */
  formattedNumber: string;
  /** Country name */
  country: string;
  /** Country code (e.g., '44', '1') */
  countryCode: string;
  /** Area/region name */
  area: string;
  /** Area code */
  areaCode: string;
  /** Local number portion */
  localNumber: string;
  /** Is this a DDI (Direct Dial In) number */
  isDDI: boolean;
  /** Is this a geographic number */
  isGeographic: boolean;
  /** SMS capability enabled */
  smsEnabled: boolean;
  /** MMS capability enabled */
  mmsEnabled: boolean;
  /** Voice capability enabled */
  voiceEnabled: boolean;
  /** Local presence enabled */
  localPresenceEnabled: boolean;
  /** Last modified timestamp */
  lastModified: string;
  /** Assigned user ID */
  userId?: string;
  /** Assigned user name */
  userName?: string;
  /** Assigned call flow/routing policy ID */
  callFlowId?: string;
  /** Assigned call flow/routing policy name */
  callFlowName?: string;
}

/**
 * Phone number capabilities (for future use)
 */
export interface PhoneNumberCapabilities {
  voice: boolean;
  sms: boolean;
  mms: boolean;
  fax: boolean;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a phone number assignment
 */
export interface AssignPhoneNumberInput {
  phoneNumberId: string;
  assignedTo: string;
  assignedType: AssignmentType;
  routingPolicyId?: string;
}

/**
 * Input for updating a phone number
 */
export interface UpdatePhoneNumberInput {
  displayName?: string;
  routingPolicyId?: string | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format phone number for display
 */
export function formatPhoneNumber(number: string): string {
  // Simple formatting - could be enhanced with libphonenumber
  if (!number) return '';
  // If already formatted, return as-is
  if (number.includes(' ')) return number;
  // Basic E.164 to readable format
  if (number.startsWith('+44')) {
    // UK number
    const digits = number.slice(3);
    if (digits.length === 10) {
      return `+44 ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
    }
  }
  return number;
}

/**
 * Get country code from E.164 number
 */
export function getCountryFromNumber(number: string): { country: string; code: string } {
  if (number.startsWith('+44')) return { country: 'United Kingdom', code: 'GB' };
  if (number.startsWith('+1')) return { country: 'United States', code: 'US' };
  if (number.startsWith('+353')) return { country: 'Ireland', code: 'IE' };
  if (number.startsWith('+49')) return { country: 'Germany', code: 'DE' };
  if (number.startsWith('+33')) return { country: 'France', code: 'FR' };
  return { country: 'Unknown', code: '' };
}

/**
 * Create default capabilities
 */
export function createDefaultCapabilities(): PhoneNumberCapabilities {
  return {
    voice: true,
    sms: false,
    mms: false,
    fax: false,
  };
}
