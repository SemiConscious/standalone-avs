/**
 * Demo Phone Number Repository Implementation
 */

import type { IPhoneNumberRepository, PhoneNumberQueryParams } from '$lib/repositories';
import type {
  PhoneNumber,
  AssignPhoneNumberInput,
  UpdatePhoneNumberInput,
  PhoneNumberType,
  PaginatedResult,
  MutationResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import { DEMO_PHONE_NUMBERS } from '../data/phone-numbers';

export class DemoPhoneNumberRepository implements IPhoneNumberRepository {
  private phoneNumbers: PhoneNumber[] = [...DEMO_PHONE_NUMBERS];

  async findAll(params: PhoneNumberQueryParams): Promise<PaginatedResult<PhoneNumber>> {
    let filtered = [...this.phoneNumbers];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(pn =>
        pn.number.includes(params.search!) ||
        pn.displayName.toLowerCase().includes(searchLower)
      );
    }

    if (params.filters?.type) {
      filtered = filtered.filter(pn => pn.type === params.filters!.type);
    }
    if (params.filters?.status) {
      filtered = filtered.filter(pn => pn.status === params.filters!.status);
    }
    if (params.filters?.countryCode) {
      filtered = filtered.filter(pn => pn.countryCode === params.filters!.countryCode);
    }
    if (params.filters?.assigned !== undefined) {
      filtered = filtered.filter(pn =>
        params.filters!.assigned ? pn.routingPolicyId : !pn.routingPolicyId
      );
    }
    if (params.filters?.routingPolicyId) {
      filtered = filtered.filter(pn => pn.routingPolicyId === params.filters!.routingPolicyId);
    }

    // Sort
    filtered.sort((a, b) => {
      const cmp = a.number.localeCompare(b.number);
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

  async findById(id: string): Promise<PhoneNumber | null> {
    return this.phoneNumbers.find(pn => pn.id === id) || null;
  }

  async findByNumber(number: string): Promise<PhoneNumber | null> {
    return this.phoneNumbers.find(pn => pn.number === number) || null;
  }

  async update(id: string, data: UpdatePhoneNumberInput): Promise<MutationResult<PhoneNumber>> {
    const index = this.phoneNumbers.findIndex(pn => pn.id === id);
    if (index === -1) return { success: false, error: 'Phone number not found' };

    if (data.displayName !== undefined) {
      this.phoneNumbers[index].displayName = data.displayName;
    }
    if (data.routingPolicyId !== undefined) {
      this.phoneNumbers[index].routingPolicyId = data.routingPolicyId || undefined;
      this.phoneNumbers[index].routingPolicy = data.routingPolicyId ? 'Policy' : undefined;
      this.phoneNumbers[index].assignedType = data.routingPolicyId ? 'policy' : 'none';
    }

    return { success: true, data: this.phoneNumbers[index] };
  }

  async assign(input: AssignPhoneNumberInput): Promise<MutationResult<PhoneNumber>> {
    const pn = this.phoneNumbers.find(p => p.id === input.phoneNumberId);
    if (!pn) return { success: false, error: 'Phone number not found' };

    pn.routingPolicyId = input.routingPolicyId;
    pn.assignedTo = input.assignedTo;
    pn.assignedType = input.assignedType;

    return { success: true, data: pn };
  }

  async unassign(id: string): Promise<MutationResult<PhoneNumber>> {
    const pn = this.phoneNumbers.find(p => p.id === id);
    if (!pn) return { success: false, error: 'Phone number not found' };

    pn.routingPolicyId = undefined;
    pn.routingPolicy = undefined;
    pn.assignedTo = undefined;
    pn.assignedType = 'none';

    return { success: true, data: pn };
  }

  async getByRoutingPolicy(policyId: string): Promise<PhoneNumber[]> {
    return this.phoneNumbers.filter(pn => pn.routingPolicyId === policyId);
  }

  async getUnassigned(): Promise<PhoneNumber[]> {
    return this.phoneNumbers.filter(pn => !pn.routingPolicyId);
  }

  async getCountryBreakdown(): Promise<Map<string, number>> {
    const breakdown = new Map<string, number>();
    for (const pn of this.phoneNumbers) {
      const count = breakdown.get(pn.countryCode) || 0;
      breakdown.set(pn.countryCode, count + 1);
    }
    return breakdown;
  }

  async getTypeBreakdown(): Promise<Map<PhoneNumberType, number>> {
    const breakdown = new Map<PhoneNumberType, number>();
    for (const pn of this.phoneNumbers) {
      const count = breakdown.get(pn.type) || 0;
      breakdown.set(pn.type, count + 1);
    }
    return breakdown;
  }
}
