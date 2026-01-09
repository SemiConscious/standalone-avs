/**
 * Salesforce Phone Number Mapper
 */

import type { PhoneNumber, UpdatePhoneNumberInput } from '$lib/domain';
import type { SalesforcePhoneNumberRecord } from '../types';

// =============================================================================
// Salesforce -> Domain Mappers
// =============================================================================

/**
 * Format phone number for display
 */
function formatPhoneNumber(number: string, countryCode?: string, areaCode?: string): string {
  if (!number) return '';
  // If it looks like it might be E.164 format, try to format it nicely
  if (number.startsWith('+')) {
    // Already has country code prefix
    return number;
  }
  // Add + prefix if we have country code
  if (countryCode) {
    return `+${countryCode}${number}`;
  }
  return number;
}

/**
 * Map a Salesforce PhoneNumber__c record to a domain PhoneNumber
 */
export function mapSalesforcePhoneNumber(sf: SalesforcePhoneNumberRecord): PhoneNumber {
  const number = sf.nbavs__Number__c || '';
  
  return {
    id: sf.Id,
    name: sf.Name,
    number: number,
    formattedNumber: formatPhoneNumber(number, sf.nbavs__CountryCode__c, sf.nbavs__AreaCode__c),
    country: sf.nbavs__Country__c || '',
    countryCode: sf.nbavs__CountryCode__c || '',
    area: sf.nbavs__Area__c || '',
    areaCode: sf.nbavs__AreaCode__c || '',
    localNumber: sf.nbavs__LocalNumber__c || '',
    isDDI: sf.nbavs__DDI_Number__c ?? false,
    isGeographic: sf.nbavs__Geographic__c ?? false,
    smsEnabled: sf.nbavs__Capability_SMS__c ?? false,
    mmsEnabled: sf.nbavs__Capability_MMS__c ?? false,
    voiceEnabled: sf.nbavs__Capability_Voice__c ?? true,
    localPresenceEnabled: sf.nbavs__Local_Presence_Enabled__c ?? false,
    lastModified: sf.LastModifiedDate || '',
    userId: sf.nbavs__User__c,
    userName: sf.nbavs__User__r?.Name,
    callFlowId: sf.nbavs__CallFlow__c,
    callFlowName: sf.nbavs__CallFlow__r?.Name,
  };
}

function mapPhoneNumberType(type?: string): PhoneNumberType {
  switch (type?.toLowerCase()) {
    case 'geographic': return 'geographic';
    case 'mobile': return 'mobile';
    case 'tollfree': case 'toll-free': return 'tollfree';
    case 'national': return 'national';
    default: return 'geographic';
  }
}

function mapPhoneNumberStatus(status?: string): PhoneNumberStatus {
  switch (status?.toLowerCase()) {
    case 'active': return 'active';
    case 'inactive': return 'inactive';
    case 'pending': return 'pending';
    default: return 'active';
  }
}

// =============================================================================
// Domain -> Salesforce Mappers
// =============================================================================

export function mapUpdatePhoneNumberToSalesforce(input: UpdatePhoneNumberInput, namespace: string): Record<string, unknown> {
  const ns = namespace;
  const data: Record<string, unknown> = {};

  if (input.displayName !== undefined) data[`${ns}__Description__c`] = input.displayName;
  if (input.routingPolicyId !== undefined) data[`${ns}__CallFlow__c`] = input.routingPolicyId;

  return data;
}
