/**
 * Salesforce Call Log Mapper
 * 
 * All Salesforce field knowledge for CallLog entities is contained here.
 */

import type { CallLog, CallDirection } from '$lib/domain';
import type { SalesforceCallLogRecord } from '../types';

// =============================================================================
// Salesforce -> Domain Mappers
// =============================================================================

/**
 * Map a Salesforce CallLog__c record to a domain CallLog
 */
export function mapSalesforceCallLog(sf: SalesforceCallLogRecord): CallLog {
  return {
    id: sf.Id,
    dateTime: sf.nbavs__DateTime__c,
    fromNumber: sf.nbavs__FromNumber__c || '',
    toNumber: sf.nbavs__ToNumber__c || '',
    direction: mapCallDirection(sf.nbavs__Direction__c),
    duration: sf.nbavs__TimeTalking__c || 0,
    ringingTime: sf.nbavs__TimeRinging__c || 0,
    huntingTime: sf.nbavs__TimeHunting__c || 0,
    hasRecording: sf.nbavs__Recorded_A__c || sf.nbavs__Recorded_B__c || false,
    recordingId: sf.nbavs__aUUId__c || sf.nbavs__bUUId__c,
    fromUserId: sf.nbavs__FromUser__r?.Id,
    fromUserName: sf.nbavs__FromUser__r?.Name,
    toUserId: sf.nbavs__ToUser__r?.Id,
    toUserName: sf.nbavs__ToUser__r?.Name,
  };
}

/**
 * Map call direction string to CallDirection type
 */
function mapCallDirection(direction?: string): CallDirection {
  switch (direction?.toLowerCase()) {
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
