/**
 * Salesforce Group Mapper
 * 
 * All Salesforce field knowledge for Group entities is contained here.
 */

import type { Group, GroupMember, CreateGroupInput, UpdateGroupInput } from '$lib/domain';
import type { SalesforceGroupRecord, SalesforceGroupMemberRecord } from '../types';

// =============================================================================
// Salesforce -> Domain Mappers
// =============================================================================

/**
 * Map a Salesforce Group__c record to a domain Group
 */
export function mapSalesforceGroup(sf: SalesforceGroupRecord, memberCount?: number): Group {
  return {
    id: sf.Id,
    platformId: sf.nbavs__Id__c,
    name: sf.Name,
    description: sf.nbavs__Description__c || '',
    email: sf.nbavs__Email__c || '',
    extension: sf.nbavs__Extension__c || '',
    groupPickup: sf.nbavs__GroupPickup__c || '',
    pbx: sf.nbavs__PBX__c || false,
    manager: sf.nbavs__Manager__c || false,
    record: sf.nbavs__Record__c || false,
    lastModified: sf.LastModifiedDate || '',
    memberCount,
  };
}

/**
 * Map a Salesforce GroupMember__c record to a domain GroupMember
 */
export function mapSalesforceGroupMember(sf: SalesforceGroupMemberRecord): GroupMember {
  return {
    id: sf.Id,
    groupId: sf.nbavs__Group__c,
    groupName: sf.nbavs__Group__r?.Name || '',
    userId: sf.nbavs__User__c,
    userName: sf.nbavs__User__r?.Name || '',
    ringOrder: sf.nbavs__RingOrder__c,
  };
}

// =============================================================================
// Domain -> Salesforce Mappers
// =============================================================================

/**
 * Map CreateGroupInput to Salesforce data
 */
export function mapCreateGroupToSalesforce(input: CreateGroupInput, namespace: string): Record<string, unknown> {
  const ns = namespace;
  return {
    Name: input.name,
    [`${ns}__Description__c`]: input.description || '',
    [`${ns}__Email__c`]: input.email || '',
    [`${ns}__Extension__c`]: input.extension || '',
    [`${ns}__GroupPickup__c`]: input.groupPickup || '',
    [`${ns}__PBX__c`]: input.pbx ?? false,
    [`${ns}__Manager__c`]: input.manager ?? false,
    [`${ns}__Record__c`]: input.record ?? false,
  };
}

/**
 * Map UpdateGroupInput to Salesforce data
 */
export function mapUpdateGroupToSalesforce(input: UpdateGroupInput, namespace: string): Record<string, unknown> {
  const ns = namespace;
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.Name = input.name;
  if (input.description !== undefined) data[`${ns}__Description__c`] = input.description;
  if (input.email !== undefined) data[`${ns}__Email__c`] = input.email;
  if (input.extension !== undefined) data[`${ns}__Extension__c`] = input.extension;
  if (input.groupPickup !== undefined) data[`${ns}__GroupPickup__c`] = input.groupPickup;
  if (input.pbx !== undefined) data[`${ns}__PBX__c`] = input.pbx;
  if (input.manager !== undefined) data[`${ns}__Manager__c`] = input.manager;
  if (input.record !== undefined) data[`${ns}__Record__c`] = input.record;

  return data;
}
