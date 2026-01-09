/**
 * Salesforce User Repository Implementation
 * 
 * Implements IUserRepository using Salesforce as the data source.
 */

import type { IUserRepository, UserQueryParams } from '$lib/repositories';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  AvailabilityProfile,
  GroupMembership,
  CrmUser,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta, EntityNotFoundError, ValidationError } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';
import type {
  SalesforceUserRecord,
  SalesforceGroupMemberRecord,
  SalesforceAvailabilityProfileRecord,
  SalesforceSystemUserRecord,
} from '../types';
import {
  mapSalesforceUser,
  mapAvailabilityProfile,
  mapCrmUser,
  mapGroupMembership,
  mapCreateUserToSalesforce,
  mapUpdateUserToSalesforce,
} from '../mappers/user.mapper';
import {
  buildUserListQuery,
  buildUserCountQuery,
  buildUserByIdQuery,
  buildUserByExtensionQuery,
  buildUserByEmailQuery,
  buildGroupMembershipsQuery,
  buildAvailabilityProfilesQuery,
  buildCrmUsersQuery,
  buildExtensionCheckQuery,
  buildGroupExtensionCheckQuery,
  buildGroupMembershipsForUsersQuery,
} from '../queries/user.queries';

// =============================================================================
// Salesforce User Repository
// =============================================================================

export class SalesforceUserRepository implements IUserRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  async findAll(params: UserQueryParams): Promise<PaginatedResult<User>> {
    // Get total count
    const countSoql = buildUserCountQuery(this.ns, params);
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);
    const totalCount = countResult.totalSize;

    // Get users
    const listSoql = buildUserListQuery(this.ns, params);
    const listResult = await this.client.query<SalesforceUserRecord>(listSoql);

    // Get group memberships for fetched users
    const userIds = listResult.records.map(u => u.Id);
    const groupMemberships = await this.getGroupMembershipsForUsers(userIds);

    // Map to domain users
    const users = listResult.records.map(sf => {
      const groups = groupMemberships.get(sf.Id) || [];
      return mapSalesforceUser(sf, groups);
    });

    return {
      items: users,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<User | null> {
    const soql = buildUserByIdQuery(this.ns, id);
    const result = await this.client.query<SalesforceUserRecord>(soql);

    if (result.records.length === 0) {
      return null;
    }

    // Get groups for this user
    const groups = await this.getGroupNames(id);
    return mapSalesforceUser(result.records[0], groups);
  }

  async findByExtension(extension: string): Promise<User | null> {
    const soql = buildUserByExtensionQuery(this.ns, extension);
    const result = await this.client.query<SalesforceUserRecord>(soql);

    if (result.records.length === 0) {
      return null;
    }

    const groups = await this.getGroupNames(result.records[0].Id);
    return mapSalesforceUser(result.records[0], groups);
  }

  async findByEmail(email: string): Promise<User | null> {
    const soql = buildUserByEmailQuery(this.ns, email);
    const result = await this.client.query<SalesforceUserRecord>(soql);

    if (result.records.length === 0) {
      return null;
    }

    const groups = await this.getGroupNames(result.records[0].Id);
    return mapSalesforceUser(result.records[0], groups);
  }

  async create(data: CreateUserInput): Promise<MutationResult<User>> {
    try {
      const sfData = mapCreateUserToSalesforce(data, this.ns);
      const result = await this.client.create('User__c', sfData);

      if (!result.success) {
        return {
          success: false,
          error: result.errors?.map(e => e.message).join('; ') || 'Failed to create user',
        };
      }

      const user = await this.findById(result.id);
      return {
        success: true,
        data: user!,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
    }
  }

  async update(id: string, data: UpdateUserInput): Promise<MutationResult<User>> {
    try {
      const sfData = mapUpdateUserToSalesforce(data, this.ns);
      await this.client.update('User__c', id, sfData);

      const user = await this.findById(id);
      if (!user) {
        return {
          success: false,
          error: 'User not found after update',
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
      };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('User__c', id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      };
    }
  }

  // =========================================================================
  // Related Data
  // =========================================================================

  async getGroupMemberships(userId: string): Promise<GroupMembership[]> {
    const soql = buildGroupMembershipsQuery(this.ns, userId);
    const result = await this.client.query<SalesforceGroupMemberRecord>(soql);
    return result.records.map(mapGroupMembership);
  }

  async getAvailabilityProfiles(): Promise<AvailabilityProfile[]> {
    const soql = buildAvailabilityProfilesQuery(this.ns);
    const result = await this.client.query<SalesforceAvailabilityProfileRecord>(soql);
    return result.records.map(mapAvailabilityProfile);
  }

  async getCrmUsers(): Promise<CrmUser[]> {
    const soql = buildCrmUsersQuery();
    const result = await this.client.query<SalesforceSystemUserRecord>(soql);
    return result.records.map(mapCrmUser);
  }

  // =========================================================================
  // Validation Helpers
  // =========================================================================

  async isExtensionAvailable(extension: string, excludeUserId?: string): Promise<boolean> {
    // Check users
    const userCheckSoql = buildExtensionCheckQuery(this.ns, extension, excludeUserId);
    const userResult = await this.client.query<{ Id: string }>(userCheckSoql);
    if (userResult.records.length > 0) {
      return false;
    }

    // Check groups
    const groupCheckSoql = buildGroupExtensionCheckQuery(this.ns, extension);
    const groupResult = await this.client.query<{ Id: string }>(groupCheckSoql);
    return groupResult.records.length === 0;
  }

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  async toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>> {
    try {
      // Get current state
      const soql = `SELECT ${this.ns}__Enabled__c FROM ${this.ns}__User__c WHERE Id = '${id}'`;
      const result = await this.client.query<{ Id: string; nbavs__Enabled__c: boolean }>(soql);

      if (result.records.length === 0) {
        throw new EntityNotFoundError('User', id);
      }

      const currentEnabled = result.records[0].nbavs__Enabled__c;
      const newEnabled = !currentEnabled;

      // Update
      await this.client.update('User__c', id, {
        [`${this.ns}__Enabled__c`]: newEnabled,
      });

      return {
        success: true,
        data: { enabled: newEnabled },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle enabled state',
      };
    }
  }

  // =========================================================================
  // Profile Operations
  // =========================================================================

  async findBySalesforceUserId(salesforceUserId: string): Promise<User | null> {
    const soql = `
      SELECT Id, Name, 
             ${this.ns}__Id__c, 
             ${this.ns}__SipExtension__c, 
             ${this.ns}__MobilePhone__c,
             ${this.ns}__CTI__c, 
             ${this.ns}__PBX__c, 
             ${this.ns}__Manager__c, 
             ${this.ns}__Record__c, 
             ${this.ns}__PCI__c, 
             ${this.ns}__Insights__c,
             ${this.ns}__Enabled__c
      FROM ${this.ns}__User__c 
      WHERE ${this.ns}__User__c = '${salesforceUserId}' 
      LIMIT 1
    `;
    
    const result = await this.client.query<SalesforceUserRecord>(soql);
    
    if (result.records.length === 0) {
      return null;
    }
    
    const groups = await this.getGroupNames(result.records[0].Id);
    return mapSalesforceUser(result.records[0], groups);
  }

  async getProfileData(userId: string): Promise<import('$lib/repositories').UserProfileData> {
    // Fetch all profile data in parallel
    const [settingsResult, groupsResult, devicesResult, registeredNumbersResult, voicemailsResult, phoneNumbersResult, userPolicyResult] = await Promise.all([
      // User Settings
      this.client.query<{
        Id: string;
        nbavs__CountryCode__c: string;
        nbavs__CountryCodeLabel__c: string;
        nbavs__Voice__c: string;
        nbavs__VoiceLabel__c: string;
      }>(`
        SELECT Id, ${this.ns}__CountryCode__c, ${this.ns}__CountryCodeLabel__c, 
               ${this.ns}__Voice__c, ${this.ns}__VoiceLabel__c
        FROM ${this.ns}__UserSettings__c 
        WHERE ${this.ns}__User__c = '${userId}'
        LIMIT 1
      `).catch(() => ({ records: [], totalSize: 0, done: true })),

      // Groups with details
      this.client.query<{
        Id: string;
        nbavs__Primary__c: boolean;
        nbavs__Group__r: {
          Id: string;
          Name: string;
          nbavs__Extension__c: string;
          nbavs__GroupPickup__c: string;
          nbavs__PBX__c: boolean;
          nbavs__Manager__c: boolean;
        };
      }>(`
        SELECT Id, ${this.ns}__Primary__c, 
               ${this.ns}__Group__r.Id, ${this.ns}__Group__r.Name, 
               ${this.ns}__Group__r.${this.ns}__Extension__c, ${this.ns}__Group__r.${this.ns}__GroupPickup__c,
               ${this.ns}__Group__r.${this.ns}__PBX__c, ${this.ns}__Group__r.${this.ns}__Manager__c
        FROM ${this.ns}__GroupMember__c 
        WHERE ${this.ns}__User__c = '${userId}'
        ORDER BY ${this.ns}__Primary__c DESC
      `).catch(() => ({ records: [], totalSize: 0, done: true })),

      // Devices
      this.client.query<{
        Id: string;
        Name: string;
        nbavs__Number__c: string;
        nbavs__Type__c: string;
        nbavs__Enabled__c: boolean;
        nbavs__Registered__c: boolean;
      }>(`
        SELECT Id, Name, ${this.ns}__Number__c, ${this.ns}__Type__c, 
               ${this.ns}__Enabled__c, ${this.ns}__Registered__c
        FROM ${this.ns}__UserDevice__c 
        WHERE ${this.ns}__User__c = '${userId}'
      `).catch(() => ({ records: [], totalSize: 0, done: true })),

      // Registered Numbers
      this.client.query<{
        Id: string;
        Name: string;
        nbavs__CallQueueEnabled__c: boolean;
        nbavs__CallQueueMaster__c: boolean;
      }>(`
        SELECT Id, Name, ${this.ns}__CallQueueEnabled__c, ${this.ns}__CallQueueMaster__c
        FROM ${this.ns}__RegisteredNumber__c 
        WHERE ${this.ns}__User__c = '${userId}' AND ${this.ns}__CallQueueMaster__c = true
      `).catch(() => ({ records: [], totalSize: 0, done: true })),

      // Voicemails
      this.client.query<{
        Id: string;
        nbavs__UUID__c: string;
        nbavs__CallStart__c: string;
        nbavs__DialledNumber__c: string;
        nbavs__TotalDuration__c: number;
        nbavs__VMStatus__c: boolean;
      }>(`
        SELECT Id, ${this.ns}__UUID__c, ${this.ns}__CallStart__c, ${this.ns}__DialledNumber__c, 
               ${this.ns}__TotalDuration__c, ${this.ns}__VMStatus__c
        FROM ${this.ns}__Voicemail__c 
        WHERE ${this.ns}__User__c = '${userId}'
        ORDER BY ${this.ns}__CallStart__c DESC
        LIMIT 5
      `).catch(() => ({ records: [], totalSize: 0, done: true })),

      // DDIs
      this.client.query<{ nbavs__Number__c: string }>(`
        SELECT ${this.ns}__Number__c 
        FROM ${this.ns}__PhoneNumber__c 
        WHERE ${this.ns}__User__c = '${userId}'
      `).catch(() => ({ records: [], totalSize: 0, done: true })),

      // User Ring Order Policy with Ring Targets
      this.client.query<{
        Id: string;
        nbavs__UserRingTargets__r?: {
          records: Array<{
            Id: string;
            nbavs__Number__c: string;
            nbavs__Enabled__c: boolean;
            nbavs__Priority__c: number;
          }>;
        };
      }>(`
        SELECT Id, 
               (SELECT Id, ${this.ns}__Number__c, ${this.ns}__Enabled__c, ${this.ns}__Priority__c
                FROM ${this.ns}__UserRingTargets__r 
                ORDER BY ${this.ns}__Priority__c ASC)
        FROM ${this.ns}__UserPolicy__c 
        WHERE ${this.ns}__User__c = '${userId}' AND ${this.ns}__Template__c = 'RINGORDER'
        LIMIT 1
      `).catch(() => ({ records: [], totalSize: 0, done: true })),
    ]);

    // Build active inbound numbers from ring targets and registered numbers
    const activeInboundNumbers: Array<{ number: string; enabled: boolean }> = [];
    const ringTargetNumbers = new Set<string>();

    const userPolicy = userPolicyResult.records[0];
    if (userPolicy?.nbavs__UserRingTargets__r?.records) {
      for (const rt of userPolicy.nbavs__UserRingTargets__r.records) {
        if (rt.nbavs__Number__c) {
          activeInboundNumbers.push({
            number: rt.nbavs__Number__c,
            enabled: rt.nbavs__Enabled__c || false,
          });
          ringTargetNumbers.add(rt.nbavs__Number__c);
        }
      }
    }

    for (const rn of registeredNumbersResult.records) {
      if (rn.Name && !ringTargetNumbers.has(rn.Name)) {
        activeInboundNumbers.push({
          number: rn.Name,
          enabled: rn.nbavs__CallQueueEnabled__c || false,
        });
      }
    }

    const userSettings = settingsResult.records[0];

    return {
      homeCountry: userSettings?.nbavs__CountryCodeLabel__c
        ? `${userSettings.nbavs__CountryCodeLabel__c} (+${userSettings.nbavs__CountryCode__c || ''})`
        : '',
      homeCountryCode: userSettings?.nbavs__CountryCode__c || '',
      defaultVoice: userSettings?.nbavs__VoiceLabel__c || '',
      groups: groupsResult.records.map(gm => ({
        id: gm.nbavs__Group__r?.Id || '',
        name: gm.nbavs__Group__r?.Name || '',
        extension: gm.nbavs__Group__r?.nbavs__Extension__c || '',
        groupPickup: gm.nbavs__Group__r?.nbavs__GroupPickup__c || '',
        isPrimary: gm.nbavs__Primary__c || false,
        hasPbxOrManager: (gm.nbavs__Group__r?.nbavs__PBX__c || gm.nbavs__Group__r?.nbavs__Manager__c) || false,
      })),
      devices: devicesResult.records.map(d => ({
        id: d.Id,
        name: d.Name || '',
        number: d.nbavs__Number__c || '',
        type: d.nbavs__Type__c || '',
        isEnabled: d.nbavs__Enabled__c || false,
        isRegistered: d.nbavs__Registered__c || false,
      })),
      activeInboundNumbers,
      voicemails: voicemailsResult.records.map(vm => ({
        id: vm.Id,
        uuid: vm.nbavs__UUID__c || '',
        dateTime: vm.nbavs__CallStart__c || '',
        dialledNumber: vm.nbavs__DialledNumber__c || '',
        duration: vm.nbavs__TotalDuration__c || 0,
        canPlay: vm.nbavs__VMStatus__c || false,
      })),
      ddis: phoneNumbersResult.records.map(pn => `+${pn.nbavs__Number__c}`),
    };
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Get group names for a single user
   */
  private async getGroupNames(userId: string): Promise<string[]> {
    try {
      const memberships = await this.getGroupMemberships(userId);
      return memberships.map(m => m.groupName);
    } catch {
      return [];
    }
  }

  /**
   * Get group memberships for multiple users at once
   */
  private async getGroupMembershipsForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (userIds.length === 0) {
      return result;
    }

    try {
      const soql = buildGroupMembershipsForUsersQuery(this.ns, userIds);
      const queryResult = await this.client.query<{
        nbavs__User__c: string;
        nbavs__Group__r: { Name: string };
      }>(soql);

      for (const record of queryResult.records) {
        const userId = record.nbavs__User__c;
        const groupName = record.nbavs__Group__r?.Name || 'Unknown';

        if (!result.has(userId)) {
          result.set(userId, []);
        }
        result.get(userId)!.push(groupName);
      }
    } catch (error) {
      console.warn('Failed to fetch group memberships:', error);
    }

    return result;
  }
}
