/**
 * Demo Group Repository Implementation
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
import { DEMO_GROUPS, DEMO_GROUP_MEMBERS } from '../data/groups';

export class DemoGroupRepository implements IGroupRepository {
  private groups: Group[] = [...DEMO_GROUPS];
  private members: GroupMember[] = [...DEMO_GROUP_MEMBERS];
  private nextId = 100;

  async findAll(params: GroupQueryParams): Promise<PaginatedResult<Group>> {
    let filtered = [...this.groups];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(searchLower) ||
        g.description.toLowerCase().includes(searchLower)
      );
    }

    if (params.filters?.pbx !== undefined) {
      filtered = filtered.filter(g => g.pbx === params.filters!.pbx);
    }
    if (params.filters?.manager !== undefined) {
      filtered = filtered.filter(g => g.manager === params.filters!.manager);
    }
    if (params.filters?.record !== undefined) {
      filtered = filtered.filter(g => g.record === params.filters!.record);
    }

    // Sort
    const sortBy = params.sortBy || 'name';
    filtered.sort((a, b) => {
      const aVal = sortBy === 'extension' ? a.extension : a.name;
      const bVal = sortBy === 'extension' ? b.extension : b.name;
      const cmp = aVal.localeCompare(bVal);
      return params.sortOrder === 'desc' ? -cmp : cmp;
    });

    const totalCount = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const paginated = filtered.slice(start, start + params.pageSize);

    return {
      items: paginated,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<Group | null> {
    return this.groups.find(g => g.id === id) || null;
  }

  async findByExtension(extension: string): Promise<Group | null> {
    return this.groups.find(g => g.extension === extension) || null;
  }

  async create(data: CreateGroupInput): Promise<MutationResult<Group>> {
    const id = `demo-g${String(this.nextId++).padStart(3, '0')}`;
    const group: Group = {
      id,
      platformId: this.nextId,
      name: data.name,
      description: data.description || '',
      email: data.email || '',
      extension: data.extension || '',
      groupPickup: data.groupPickup || '',
      pbx: data.pbx ?? false,
      manager: data.manager ?? false,
      record: data.record ?? false,
      lastModified: new Date().toISOString(),
      memberCount: 0,
    };
    this.groups.push(group);
    return { success: true, data: group };
  }

  async update(id: string, data: UpdateGroupInput): Promise<MutationResult<Group>> {
    const index = this.groups.findIndex(g => g.id === id);
    if (index === -1) return { success: false, error: 'Group not found' };

    this.groups[index] = {
      ...this.groups[index],
      ...data,
      lastModified: new Date().toISOString(),
    };
    return { success: true, data: this.groups[index] };
  }

  async delete(id: string): Promise<DeleteResult> {
    const index = this.groups.findIndex(g => g.id === id);
    if (index === -1) return { success: false, error: 'Group not found' };
    this.groups.splice(index, 1);
    this.members = this.members.filter(m => m.groupId !== id);
    return { success: true };
  }

  async getMembers(groupId: string): Promise<GroupMember[]> {
    return this.members.filter(m => m.groupId === groupId);
  }

  async addMember(input: AddGroupMemberInput): Promise<MutationResult<GroupMember>> {
    const id = `demo-gm${String(this.nextId++).padStart(3, '0')}`;
    const member: GroupMember = {
      id,
      groupId: input.groupId,
      groupName: this.groups.find(g => g.id === input.groupId)?.name || '',
      userId: input.userId,
      userName: '',
      ringOrder: input.ringOrder,
    };
    this.members.push(member);
    return { success: true, data: member };
  }

  async removeMember(groupId: string, userId: string): Promise<DeleteResult> {
    const index = this.members.findIndex(m => m.groupId === groupId && m.userId === userId);
    if (index === -1) return { success: false, error: 'Member not found' };
    this.members.splice(index, 1);
    return { success: true };
  }

  async updateMemberOrder(groupId: string, userId: string, ringOrder: number): Promise<MutationResult<GroupMember>> {
    const member = this.members.find(m => m.groupId === groupId && m.userId === userId);
    if (!member) return { success: false, error: 'Member not found' };
    member.ringOrder = ringOrder;
    return { success: true, data: member };
  }

  async getMemberCounts(groupIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const id of groupIds) {
      counts.set(id, this.members.filter(m => m.groupId === id).length);
    }
    return counts;
  }

  async isExtensionAvailable(extension: string, excludeGroupId?: string): Promise<boolean> {
    return !this.groups.some(g => g.extension === extension && g.id !== excludeGroupId);
  }

  async removeMemberById(membershipId: string): Promise<DeleteResult> {
    const index = this.members.findIndex(m => m.id === membershipId);
    if (index === -1) return { success: false, error: 'Member not found' };
    this.members.splice(index, 1);
    return { success: true };
  }

  async bulkUpdateMemberPriorities(
    updates: { membershipId: string; priority: number }[]
  ): Promise<MutationResult<void>> {
    for (const update of updates) {
      const member = this.members.find(m => m.id === update.membershipId);
      if (member) {
        member.ringOrder = update.priority;
      }
    }
    return { success: true, data: undefined };
  }

  async getAvailableUsersForGroup(
    groupId: string,
    _options?: { limit?: number }
  ): Promise<{ id: string; name: string; username: string; extension: string }[]> {
    // In demo mode, return some mock available users
    const existingMemberIds = this.members.filter(m => m.groupId === groupId).map(m => m.userId);
    
    // Mock available users
    const allUsers = [
      { id: 'demo-u001', name: 'John Smith', username: 'john.smith@demo.com', extension: '2001' },
      { id: 'demo-u002', name: 'Jane Doe', username: 'jane.doe@demo.com', extension: '2002' },
      { id: 'demo-u003', name: 'Bob Johnson', username: 'bob.johnson@demo.com', extension: '2003' },
      { id: 'demo-u004', name: 'Alice Williams', username: 'alice.williams@demo.com', extension: '2004' },
      { id: 'demo-u005', name: 'Charlie Brown', username: 'charlie.brown@demo.com', extension: '2005' },
    ];
    
    return allUsers.filter(u => !existingMemberIds.includes(u.id));
  }

  async getAdminGroupsForUser(_userId: string): Promise<import('$lib/repositories').AdminGroupPermission[]> {
    // In demo mode, return permissions for all demo groups
    return this.groups.map(g => ({
      groupId: g.id,
      groupName: g.name,
      liveCallStatus: true,
      listenIn: true,
      agentState: true,
    }));
  }
}
