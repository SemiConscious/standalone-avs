/**
 * Demo User Repository Implementation
 * 
 * Implements IUserRepository using in-memory demo data.
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
import { createPaginationMeta } from '$lib/domain';
import {
  DEMO_USERS,
  DEMO_AVAILABILITY_PROFILES,
  DEMO_CRM_USERS,
  DEMO_GROUP_MEMBERSHIPS,
} from '../data/users';

// =============================================================================
// Demo User Repository
// =============================================================================

export class DemoUserRepository implements IUserRepository {
  // In-memory store (copy of demo data to allow mutations)
  private users: User[] = [...DEMO_USERS];
  private nextId = 100;

  // =========================================================================
  // Basic CRUD Operations
  // =========================================================================

  async findAll(params: UserQueryParams): Promise<PaginatedResult<User>> {
    let filtered = [...this.users];

    // Search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.username.toLowerCase().includes(searchLower) ||
        u.extension.includes(searchLower)
      );
    }

    // Status filter
    if (params.filters?.status) {
      filtered = filtered.filter(u => u.status === params.filters!.status);
    }

    // Enabled filter
    if (params.filters?.enabled !== undefined) {
      filtered = filtered.filter(u => u.enabled === params.filters!.enabled);
    }

    // Permission level filter
    if (params.filters?.permissionLevel) {
      filtered = filtered.filter(u => u.permissionLevel === params.filters!.permissionLevel);
    }

    // Sort
    const sortBy = params.sortBy || 'name';
    const sortOrder = params.sortOrder || 'asc';
    filtered.sort((a, b) => {
      let aVal: string | boolean = '';
      let bVal: string | boolean = '';

      switch (sortBy) {
        case 'name':
        case 'user':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'extension':
          aVal = a.extension;
          bVal = b.extension;
          break;
        case 'status':
          aVal = a.enabled;
          bVal = b.enabled;
          break;
        case 'permissionLevel':
          aVal = a.permissionLevel;
          bVal = b.permissionLevel;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      if (typeof aVal === 'boolean') {
        return sortOrder === 'asc' ? (aVal ? 1 : -1) - (bVal ? 1 : -1) : (bVal ? 1 : -1) - (aVal ? 1 : -1);
      }

      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    const totalCount = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const end = start + params.pageSize;
    const paginated = filtered.slice(start, end);

    return {
      items: paginated,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async findByExtension(extension: string): Promise<User | null> {
    return this.users.find(u => u.extension === extension) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email || u.username === email) || null;
  }

  async create(data: CreateUserInput): Promise<MutationResult<User>> {
    const id = `demo-u${String(this.nextId++).padStart(3, '0')}`;
    const user: User = {
      id,
      platformId: this.nextId,
      name: `${data.firstName} ${data.lastName}`,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      username: data.username || data.email,
      extension: data.extension || '',
      mobilePhone: data.mobilePhone || '',
      status: data.enabled !== false ? 'active' : 'inactive',
      enabled: data.enabled !== false,
      licenses: {
        cti: data.licenses?.cti || false,
        pbx: data.licenses?.pbx || false,
        manager: data.licenses?.manager || false,
        record: data.licenses?.record || false,
        pci: data.licenses?.pci || false,
        scv: data.licenses?.scv || false,
        sms: data.licenses?.sms || false,
        whatsApp: data.licenses?.whatsApp || false,
        insights: data.licenses?.insights || false,
        freedom: data.licenses?.freedom || false,
      },
      permissionLevel: data.permissionLevel || 'Basic',
      trackOutboundCTIDevice: false,
      groups: [],
    };

    this.users.push(user);

    return {
      success: true,
      data: user,
    };
  }

  async update(id: string, data: UpdateUserInput): Promise<MutationResult<User>> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const existing = this.users[index];
    const updated: User = {
      ...existing,
      firstName: data.firstName ?? existing.firstName,
      lastName: data.lastName ?? existing.lastName,
      name: data.firstName || data.lastName
        ? `${data.firstName ?? existing.firstName} ${data.lastName ?? existing.lastName}`
        : existing.name,
      extension: data.extension ?? existing.extension,
      mobilePhone: data.mobilePhone ?? existing.mobilePhone,
      enabled: data.enabled ?? existing.enabled,
      status: data.enabled !== undefined
        ? (data.enabled ? 'active' : 'inactive')
        : existing.status,
      licenses: data.licenses
        ? { ...existing.licenses, ...data.licenses }
        : existing.licenses,
      permissionLevel: data.permissionLevel ?? existing.permissionLevel,
      trackOutboundCTIDevice: data.trackOutboundCTIDevice ?? existing.trackOutboundCTIDevice,
    };

    this.users[index] = updated;

    return {
      success: true,
      data: updated,
    };
  }

  async delete(id: string): Promise<DeleteResult> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    this.users.splice(index, 1);

    return { success: true };
  }

  // =========================================================================
  // Related Data
  // =========================================================================

  async getGroupMemberships(userId: string): Promise<GroupMembership[]> {
    const groupNames = DEMO_GROUP_MEMBERSHIPS.get(userId) || [];
    return groupNames.map((name, index) => ({
      groupId: `demo-g${String(index + 1).padStart(3, '0')}`,
      groupName: name,
    }));
  }

  async getAvailabilityProfiles(): Promise<AvailabilityProfile[]> {
    return [...DEMO_AVAILABILITY_PROFILES];
  }

  async getCrmUsers(): Promise<CrmUser[]> {
    return [...DEMO_CRM_USERS];
  }

  // =========================================================================
  // Validation Helpers
  // =========================================================================

  async isExtensionAvailable(extension: string, excludeUserId?: string): Promise<boolean> {
    const existing = this.users.find(u =>
      u.extension === extension && u.id !== excludeUserId
    );
    return !existing;
  }

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  async toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>> {
    const user = this.users.find(u => u.id === id);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    user.enabled = !user.enabled;
    user.status = user.enabled ? 'active' : 'inactive';

    return {
      success: true,
      data: { enabled: user.enabled },
    };
  }

  // =========================================================================
  // Profile Operations
  // =========================================================================

  async findBySalesforceUserId(_salesforceUserId: string): Promise<User | null> {
    // In demo mode, return the first user (the "current" user)
    return this.users[0] || null;
  }

  async getProfileData(userId: string): Promise<import('$lib/repositories').UserProfileData> {
    const user = this.users.find(u => u.id === userId);
    
    return {
      homeCountry: 'United Kingdom (+44)',
      homeCountryCode: '44',
      defaultVoice: 'British: Simon',
      groups: user?.groups?.map(g => ({
        id: g.toLowerCase().replace(/\s+/g, '-'),
        name: g,
        extension: '1' + Math.floor(Math.random() * 100).toString().padStart(3, '0'),
        groupPickup: '*8' + Math.floor(Math.random() * 10).toString(),
        isPrimary: false,
        hasPbxOrManager: true,
      })) || [],
      devices: [
        {
          id: 'demo-device-1',
          name: 'SIP Phone',
          number: user?.sipExtension || '1000',
          type: 'SIP',
          isEnabled: true,
          isRegistered: true,
        },
      ],
      activeInboundNumbers: [
        { number: '12003', enabled: true },
        { number: '12027', enabled: true },
        { number: '447870361412', enabled: true },
      ],
      voicemails: [],
      ddis: ['+442035101291', '+4433315016666'],
    };
  }
}
