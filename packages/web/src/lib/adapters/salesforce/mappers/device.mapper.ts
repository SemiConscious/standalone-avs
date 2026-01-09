/**
 * Salesforce Device Mapper
 */

import type { Device, DeviceMapping, DeviceType, CreateDeviceInput, UpdateDeviceInput } from '$lib/domain';
import { formatMacAddress, parseDeviceType } from '$lib/domain';
import type { SalesforceDeviceRecord, SalesforceDeviceMappingRecord } from '../types';

// =============================================================================
// Salesforce -> Domain Mappers
// =============================================================================

/**
 * Map a Salesforce Device__c record to a domain Device
 */
export function mapSalesforceDevice(sf: SalesforceDeviceRecord): Device {
  const mapping = sf.nbavs__DeviceMappings__r?.records?.[0];
  
  return {
    id: sf.Id,
    platformId: sf.nbavs__Id__c,
    extension: sf.nbavs__Extension__c || '',
    location: sf.nbavs__Location__c || '',
    description: sf.nbavs__Description__c || '',
    type: parseDeviceType(sf.nbavs__Type__c),
    model: sf.nbavs__Model__c || '',
    macAddress: formatMacAddress(sf.nbavs__MAC__c),
    enabled: sf.nbavs__Enabled__c || false,
    registered: sf.nbavs__Registered__c || false,
    registrationExpiry: sf.nbavs__RegistrationExpiry__c,
    lastModified: sf.LastModifiedDate || '',
    assignedUserId: mapping?.nbavs__User__r?.Id,
    assignedUserName: mapping?.nbavs__User__r?.Name,
  };
}

/**
 * Map a Salesforce DeviceMapping__c record
 */
export function mapSalesforceDeviceMapping(sf: SalesforceDeviceMappingRecord): DeviceMapping {
  return {
    id: sf.Id,
    deviceId: sf.nbavs__Device__c || '',
    userId: sf.nbavs__User__c,
    userName: sf.nbavs__User__r?.Name,
  };
}

// =============================================================================
// Domain -> Salesforce Mappers
// =============================================================================

/**
 * Map CreateDeviceInput to Salesforce data
 */
export function mapCreateDeviceToSalesforce(input: CreateDeviceInput, namespace: string): Record<string, unknown> {
  const ns = namespace;
  return {
    [`${ns}__Extension__c`]: input.extension,
    [`${ns}__Location__c`]: input.location || '',
    [`${ns}__Description__c`]: input.description || '',
    [`${ns}__Type__c`]: input.type || 'SIP',
    [`${ns}__Model__c`]: input.model || '',
    [`${ns}__MAC__c`]: input.macAddress || '',
    [`${ns}__Enabled__c`]: input.enabled ?? true,
  };
}

/**
 * Map UpdateDeviceInput to Salesforce data
 */
export function mapUpdateDeviceToSalesforce(input: UpdateDeviceInput, namespace: string): Record<string, unknown> {
  const ns = namespace;
  const data: Record<string, unknown> = {};

  if (input.extension !== undefined) data[`${ns}__Extension__c`] = input.extension;
  if (input.location !== undefined) data[`${ns}__Location__c`] = input.location;
  if (input.description !== undefined) data[`${ns}__Description__c`] = input.description;
  if (input.type !== undefined) data[`${ns}__Type__c`] = input.type;
  if (input.model !== undefined) data[`${ns}__Model__c`] = input.model;
  if (input.macAddress !== undefined) data[`${ns}__MAC__c`] = input.macAddress;
  if (input.enabled !== undefined) data[`${ns}__Enabled__c`] = input.enabled;

  return data;
}
