/**
 * Salesforce User Mapper
 * 
 * All Salesforce field knowledge for User entities is contained here.
 * Maps between Salesforce User__c records and domain User entities.
 */

import type { User, UserLicenses, UserStatus, PermissionLevel, CreateUserInput, UpdateUserInput, AvailabilityProfile, CrmUser, GroupMembership } from '$lib/domain';
import type { SalesforceUserRecord, SalesforceUserData, SalesforceAvailabilityProfileRecord, SalesforceSystemUserRecord, SalesforceGroupMemberRecord } from '../types';

// =============================================================================
// Salesforce -> Domain Mappers
// =============================================================================

/**
 * Map a Salesforce User__c record to a domain User
 */
export function mapSalesforceUser(sf: SalesforceUserRecord, groups: string[] = []): User {
  return {
    id: sf.Id,
    platformId: sf.nbavs__Id__c,
    name: sf.Name || getFullName(sf.nbavs__FirstName__c, sf.nbavs__LastName__c),
    firstName: sf.nbavs__FirstName__c || '',
    lastName: sf.nbavs__LastName__c || '',
    email: sf.nbavs__User__r?.Email || sf.nbavs__Username__c || '',
    username: sf.nbavs__Username__c || '',
    extension: sf.nbavs__SipExtension__c || '',
    mobilePhone: sf.nbavs__MobilePhone__c || '',
    status: mapUserStatus(sf.nbavs__Enabled__c, sf.nbavs__Status__c),
    enabled: sf.nbavs__Enabled__c || false,
    licenses: mapUserLicenses(sf),
    permissionLevel: mapPermissionLevel(sf.nbavs__PermissionLevel__c),
    trackOutboundCTIDevice: sf.nbavs__TrackOutboundCTIDevice__c || false,
    availabilityProfile: sf.nbavs__AvailabilityProfile__r?.Name,
    availabilityState: sf.nbavs__AvailabilityProfileState__r?.nbavs__DisplayName__c ||
      sf.nbavs__AvailabilityProfileState__r?.Name,
    linkedCrmUser: sf.nbavs__User__r
      ? { name: sf.nbavs__User__r.Name, email: sf.nbavs__User__r.Email }
      : undefined,
    groups,
  };
}

/**
 * Map user licenses from Salesforce fields
 */
export function mapUserLicenses(sf: SalesforceUserRecord): UserLicenses {
  return {
    cti: sf.nbavs__CTI__c || false,
    pbx: sf.nbavs__PBX__c || false,
    manager: sf.nbavs__Manager__c || false,
    record: sf.nbavs__Record__c || false,
    pci: sf.nbavs__PCI__c || false,
    scv: sf.nbavs__SCV__c || false,
    sms: sf.nbavs__SMS__c || false,
    whatsApp: sf.nbavs__WhatsApp__c || false,
    insights: sf.nbavs__Insights__c || false,
    freedom: sf.nbavs__Freedom__c || false,
  };
}

/**
 * Map user status from Salesforce fields
 */
export function mapUserStatus(enabled?: boolean, status?: string): UserStatus {
  if (!enabled) return 'inactive';
  if (status === 'SUSPENDED') return 'suspended';
  return 'active';
}

/**
 * Map permission level
 */
export function mapPermissionLevel(level?: string): PermissionLevel {
  switch (level) {
    case 'Admin':
      return 'Admin';
    case 'Team Leader':
      return 'Team Leader';
    default:
      return 'Basic';
  }
}

/**
 * Map availability profile
 */
export function mapAvailabilityProfile(sf: SalesforceAvailabilityProfileRecord): AvailabilityProfile {
  return {
    id: sf.Id,
    name: sf.Name,
    sapienId: sf.nbavs__Id__c,
    createdByName: sf.CreatedBy?.Name,
  };
}

/**
 * Map CRM user (standard Salesforce User)
 */
export function mapCrmUser(sf: SalesforceSystemUserRecord): CrmUser {
  return {
    id: sf.Id,
    name: sf.Name,
    email: sf.Email,
  };
}

/**
 * Map group membership
 */
export function mapGroupMembership(sf: SalesforceGroupMemberRecord): GroupMembership {
  return {
    groupId: sf.nbavs__Group__c,
    groupName: sf.nbavs__Group__r?.Name || 'Unknown',
  };
}

// =============================================================================
// Domain -> Salesforce Mappers
// =============================================================================

/**
 * Map CreateUserInput to Salesforce data
 */
export function mapCreateUserToSalesforce(input: CreateUserInput, namespace: string): SalesforceUserData {
  const ns = namespace;
  const data: SalesforceUserData = {
    [`${ns}__FirstName__c`]: input.firstName,
    [`${ns}__LastName__c`]: input.lastName,
    [`${ns}__Username__c`]: input.username || input.email,
    [`${ns}__Enabled__c`]: input.enabled ?? true,
    [`${ns}__PermissionLevel__c`]: input.permissionLevel || 'Basic',
  };

  if (input.extension) {
    data[`${ns}__SipExtension__c`] = input.extension;
  }

  if (input.mobilePhone) {
    data[`${ns}__MobilePhone__c`] = input.mobilePhone;
  }

  if (input.availabilityProfileId) {
    data[`${ns}__AvailabilityProfile__c`] = input.availabilityProfileId;
  }

  if (input.linkedCrmUserId) {
    data[`${ns}__User__c`] = input.linkedCrmUserId;
  }

  // Map licenses if provided
  if (input.licenses) {
    if (input.licenses.cti !== undefined) data[`${ns}__CTI__c`] = input.licenses.cti;
    if (input.licenses.pbx !== undefined) data[`${ns}__PBX__c`] = input.licenses.pbx;
    if (input.licenses.manager !== undefined) data[`${ns}__Manager__c`] = input.licenses.manager;
    if (input.licenses.record !== undefined) data[`${ns}__Record__c`] = input.licenses.record;
    if (input.licenses.pci !== undefined) data[`${ns}__PCI__c`] = input.licenses.pci;
    if (input.licenses.scv !== undefined) data[`${ns}__SCV__c`] = input.licenses.scv;
    if (input.licenses.sms !== undefined) data[`${ns}__SMS__c`] = input.licenses.sms;
    if (input.licenses.whatsApp !== undefined) data[`${ns}__WhatsApp__c`] = input.licenses.whatsApp;
    if (input.licenses.insights !== undefined) data[`${ns}__Insights__c`] = input.licenses.insights;
    if (input.licenses.freedom !== undefined) data[`${ns}__Freedom__c`] = input.licenses.freedom;
  }

  return data;
}

/**
 * Map UpdateUserInput to Salesforce data
 */
export function mapUpdateUserToSalesforce(input: UpdateUserInput, namespace: string): SalesforceUserData {
  const ns = namespace;
  const data: SalesforceUserData = {};

  if (input.firstName !== undefined) data[`${ns}__FirstName__c`] = input.firstName;
  if (input.lastName !== undefined) data[`${ns}__LastName__c`] = input.lastName;
  if (input.extension !== undefined) data[`${ns}__SipExtension__c`] = input.extension;
  if (input.mobilePhone !== undefined) data[`${ns}__MobilePhone__c`] = input.mobilePhone;
  if (input.enabled !== undefined) data[`${ns}__Enabled__c`] = input.enabled;
  if (input.permissionLevel !== undefined) data[`${ns}__PermissionLevel__c`] = input.permissionLevel;
  if (input.trackOutboundCTIDevice !== undefined) data[`${ns}__TrackOutboundCTIDevice__c`] = input.trackOutboundCTIDevice;
  if (input.availabilityProfileId !== undefined) data[`${ns}__AvailabilityProfile__c`] = input.availabilityProfileId;
  if (input.linkedCrmUserId !== undefined) data[`${ns}__User__c`] = input.linkedCrmUserId;

  // Map licenses if provided
  if (input.licenses) {
    if (input.licenses.cti !== undefined) data[`${ns}__CTI__c`] = input.licenses.cti;
    if (input.licenses.pbx !== undefined) data[`${ns}__PBX__c`] = input.licenses.pbx;
    if (input.licenses.manager !== undefined) data[`${ns}__Manager__c`] = input.licenses.manager;
    if (input.licenses.record !== undefined) data[`${ns}__Record__c`] = input.licenses.record;
    if (input.licenses.pci !== undefined) data[`${ns}__PCI__c`] = input.licenses.pci;
    if (input.licenses.scv !== undefined) data[`${ns}__SCV__c`] = input.licenses.scv;
    if (input.licenses.sms !== undefined) data[`${ns}__SMS__c`] = input.licenses.sms;
    if (input.licenses.whatsApp !== undefined) data[`${ns}__WhatsApp__c`] = input.licenses.whatsApp;
    if (input.licenses.insights !== undefined) data[`${ns}__Insights__c`] = input.licenses.insights;
    if (input.licenses.freedom !== undefined) data[`${ns}__Freedom__c`] = input.licenses.freedom;
  }

  return data;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get full name from first and last name
 */
function getFullName(firstName?: string, lastName?: string): string {
  return `${firstName || ''} ${lastName || ''}`.trim();
}
