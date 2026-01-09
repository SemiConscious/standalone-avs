/**
 * Salesforce Group Repository Implementation
 */

import type { IGroupRepository, GroupQueryParams } from '$lib/repositories';
import type {
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  GroupMember,
  AddGroupMemberInput,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';
import type { SalesforceGroupRecord, SalesforceGroupMemberRecord } from '../types';
import { mapSalesforceGroup, mapSalesforceGroupMember, mapCreateGroupToSalesforce, mapUpdateGroupToSalesforce } from '../mappers/group.mapper';
import { buildGroupListQuery, buildGroupCountQuery, buildGroupByIdQuery, buildGroupMembersQuery, buildMemberCountsQuery } from '../queries/group.queries';

export class SalesforceGroupRepository implements IGroupRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  async findAll(params: GroupQueryParams): Promise<PaginatedResult<Group>> {
    const countSoql = buildGroupCountQuery(this.ns, params);
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);
    const totalCount = countResult.totalSize;

    const listSoql = buildGroupListQuery(this.ns, params);
    const listResult = await this.client.query<SalesforceGroupRecord>(listSoql);

    // Get member counts
    const groupIds = listResult.records.map(g => g.Id);
    const memberCounts = await this.getMemberCounts(groupIds);

    const groups = listResult.records.map(sf =>
      mapSalesforceGroup(sf, memberCounts.get(sf.Id))
    );

    return {
      items: groups,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<Group | null> {
    const soql = buildGroupByIdQuery(this.ns, id);
    const result = await this.client.query<SalesforceGroupRecord>(soql);

    if (result.records.length === 0) return null;

    const memberCounts = await this.getMemberCounts([id]);
    return mapSalesforceGroup(result.records[0], memberCounts.get(id));
  }

  async findByExtension(extension: string): Promise<Group | null> {
    const soql = `SELECT ${buildGroupByIdQuery(this.ns, '').split('FROM')[0].replace('SELECT', '').trim()} FROM ${this.ns}__Group__c WHERE ${this.ns}__Extension__c = '${extension}' LIMIT 1`;
    const result = await this.client.query<SalesforceGroupRecord>(soql);
    return result.records.length > 0 ? mapSalesforceGroup(result.records[0]) : null;
  }

  async create(data: CreateGroupInput): Promise<MutationResult<Group>> {
    try {
      const sfData = mapCreateGroupToSalesforce(data, this.ns);
      const result = await this.client.create('Group__c', sfData);

      if (!result.success) {
        return { success: false, error: result.errors?.map(e => e.message).join('; ') || 'Failed to create group' };
      }

      const group = await this.findById(result.id);
      return { success: true, data: group! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create group' };
    }
  }

  async update(id: string, data: UpdateGroupInput): Promise<MutationResult<Group>> {
    try {
      const sfData = mapUpdateGroupToSalesforce(data, this.ns);
      await this.client.update('Group__c', id, sfData);

      const group = await this.findById(id);
      return { success: true, data: group! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update group' };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('Group__c', id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete group' };
    }
  }

  async getMembers(groupId: string): Promise<GroupMember[]> {
    const soql = buildGroupMembersQuery(this.ns, groupId);
    const result = await this.client.query<SalesforceGroupMemberRecord>(soql);
    return result.records.map(mapSalesforceGroupMember);
  }

  async addMember(input: AddGroupMemberInput): Promise<MutationResult<GroupMember>> {
    try {
      const sfData = {
        [`${this.ns}__Group__c`]: input.groupId,
        [`${this.ns}__User__c`]: input.userId,
        [`${this.ns}__RingOrder__c`]: input.ringOrder,
      };
      const result = await this.client.create('GroupMember__c', sfData);

      if (!result.success) {
        return { success: false, error: 'Failed to add member to group' };
      }

      return {
        success: true,
        data: {
          id: result.id,
          groupId: input.groupId,
          groupName: '',
          userId: input.userId,
          userName: '',
          ringOrder: input.ringOrder,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add member' };
    }
  }

  async removeMember(groupId: string, userId: string): Promise<DeleteResult> {
    try {
      const soql = `SELECT Id FROM ${this.ns}__GroupMember__c WHERE ${this.ns}__Group__c = '${groupId}' AND ${this.ns}__User__c = '${userId}' LIMIT 1`;
      const result = await this.client.query<{ Id: string }>(soql);

      if (result.records.length === 0) {
        return { success: false, error: 'Member not found in group' };
      }

      await this.client.delete('GroupMember__c', result.records[0].Id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove member' };
    }
  }

  async updateMemberOrder(groupId: string, userId: string, ringOrder: number): Promise<MutationResult<GroupMember>> {
    try {
      const soql = `SELECT Id FROM ${this.ns}__GroupMember__c WHERE ${this.ns}__Group__c = '${groupId}' AND ${this.ns}__User__c = '${userId}' LIMIT 1`;
      const result = await this.client.query<{ Id: string }>(soql);

      if (result.records.length === 0) {
        return { success: false, error: 'Member not found in group' };
      }

      await this.client.update('GroupMember__c', result.records[0].Id, {
        [`${this.ns}__RingOrder__c`]: ringOrder,
      });

      return {
        success: true,
        data: { id: result.records[0].Id, groupId, groupName: '', userId, userName: '', ringOrder },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update member order' };
    }
  }

  async getMemberCounts(groupIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (groupIds.length === 0) return result;

    try {
      const soql = buildMemberCountsQuery(this.ns, groupIds);
      const queryResult = await this.client.query<{ nbavs__Group__c: string; cnt: number }>(soql);

      for (const record of queryResult.records) {
        result.set(record.nbavs__Group__c, record.cnt);
      }
    } catch (error) {
      console.warn('Failed to fetch member counts:', error);
    }

    return result;
  }

  async isExtensionAvailable(extension: string, excludeGroupId?: string): Promise<boolean> {
    let soql = `SELECT Id FROM ${this.ns}__Group__c WHERE ${this.ns}__Extension__c = '${extension}'`;
    if (excludeGroupId) soql += ` AND Id != '${excludeGroupId}'`;
    soql += ' LIMIT 1';

    const result = await this.client.query<{ Id: string }>(soql);
    return result.records.length === 0;
  }

  async removeMemberById(membershipId: string): Promise<DeleteResult> {
    try {
      await this.client.delete('GroupMember__c', membershipId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove member' };
    }
  }

  async bulkUpdateMemberPriorities(
    updates: { membershipId: string; priority: number }[]
  ): Promise<MutationResult<void>> {
    if (updates.length === 0) {
      return { success: true, data: undefined };
    }

    try {
      const records = updates.map(u => ({
        Id: u.membershipId,
        [`${this.ns}__Priority__c`]: u.priority,
      }));

      await this.client.bulkUpdate('GroupMember__c', records);
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update priorities' };
    }
  }

  async getAvailableUsersForGroup(
    groupId: string,
    options?: { limit?: number }
  ): Promise<{ id: string; name: string; username: string; extension: string }[]> {
    const limit = options?.limit || 200;

    // First get existing member IDs
    const membersSoql = `
      SELECT ${this.ns}__User__c 
      FROM ${this.ns}__GroupMember__c 
      WHERE ${this.ns}__Group__c = '${groupId}'
    `;
    const membersResult = await this.client.query<{ nbavs__User__c: string }>(membersSoql);
    const memberUserIds = membersResult.records.map(m => m.nbavs__User__c);

    // Get enabled users not in the group
    let userSoql = `
      SELECT Id, Name, ${this.ns}__Username__c, ${this.ns}__SipExtension__c
      FROM ${this.ns}__User__c
      WHERE ${this.ns}__Enabled__c = true
    `;
    if (memberUserIds.length > 0) {
      userSoql += ` AND Id NOT IN ('${memberUserIds.join("','")}')`;
    }
    userSoql += ` ORDER BY Name LIMIT ${limit}`;

    const userResult = await this.client.query<{
      Id: string;
      Name: string;
      nbavs__Username__c: string;
      nbavs__SipExtension__c: string;
    }>(userSoql);

    return userResult.records.map(u => ({
      id: u.Id,
      name: u.Name,
      username: u.nbavs__Username__c || '',
      extension: u.nbavs__SipExtension__c || '',
    }));
  }

  async getAdminGroupsForUser(userId: string): Promise<import('$lib/repositories').AdminGroupPermission[]> {
    const soql = `
      SELECT ${this.ns}__Group__c, ${this.ns}__Group__r.Name, 
             ${this.ns}__LiveCallStatus__c, ${this.ns}__ListenIn__c, ${this.ns}__AgentState__c
      FROM ${this.ns}__GroupAdministrator__c
      WHERE ${this.ns}__User__c = '${userId}'
    `;

    const result = await this.client.query<{
      nbavs__Group__c: string;
      nbavs__Group__r: { Name: string };
      nbavs__LiveCallStatus__c: boolean;
      nbavs__ListenIn__c: boolean;
      nbavs__AgentState__c: boolean;
    }>(soql);

    return result.records.map(rec => ({
      groupId: rec.nbavs__Group__c,
      groupName: rec.nbavs__Group__r?.Name || 'Unknown Group',
      liveCallStatus: rec.nbavs__LiveCallStatus__c || false,
      listenIn: rec.nbavs__ListenIn__c || false,
      agentState: rec.nbavs__AgentState__c || false,
    }));
  }
}
