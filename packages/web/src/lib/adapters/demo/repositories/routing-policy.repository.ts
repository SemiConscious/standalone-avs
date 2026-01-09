/**
 * Demo Routing Policy Repository Implementation
 */

import type { IRoutingPolicyRepository, RoutingPolicyQueryParams } from '$lib/repositories';
import type {
  RoutingPolicy,
  CreateRoutingPolicyInput,
  UpdateRoutingPolicyInput,
  PolicyBody,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta, createDefaultPolicyBody } from '$lib/domain';
import { DEMO_ROUTING_POLICIES, DEMO_POLICY_BODIES } from '../data/routing-policies';

export class DemoRoutingPolicyRepository implements IRoutingPolicyRepository {
  private policies: RoutingPolicy[] = [...DEMO_ROUTING_POLICIES];
  private policyBodies: Map<string, PolicyBody> = new Map(DEMO_POLICY_BODIES);
  private policyJsons: Map<string, string> = new Map();
  private nextId = 200;

  async findAll(params: RoutingPolicyQueryParams): Promise<PaginatedResult<RoutingPolicy>> {
    let filtered = [...this.policies];

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (params.filters?.type) {
      filtered = filtered.filter(p => p.type === params.filters!.type);
    }
    if (params.filters?.status) {
      filtered = filtered.filter(p => p.status === params.filters!.status);
    }
    if (params.filters?.source) {
      filtered = filtered.filter(p => p.source === params.filters!.source);
    }
    if (params.filters?.createdById) {
      filtered = filtered.filter(p => p.createdById === params.filters!.createdById);
    }

    // Sort
    filtered.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
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

  async findById(id: string): Promise<RoutingPolicy | null> {
    return this.policies.find(p => p.id === id) || null;
  }

  async findByName(name: string): Promise<RoutingPolicy | null> {
    return this.policies.find(p => p.name === name) || null;
  }

  async create(data: CreateRoutingPolicyInput): Promise<MutationResult<RoutingPolicy>> {
    const id = `demo-pol${String(this.nextId++).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const policy: RoutingPolicy = {
      id,
      platformId: this.nextId,
      name: data.name,
      description: data.description || '',
      source: data.source || 'Inbound',
      type: data.type || 'Call',
      status: 'Disabled',
      createdById: 'demo-u001',
      createdByName: 'John Smith',
      createdDate: now,
      lastModifiedById: 'demo-u001',
      lastModifiedByName: 'John Smith',
      lastModifiedDate: now,
      phoneNumbers: [],
    };

    this.policies.push(policy);
    this.policyBodies.set(id, createDefaultPolicyBody());

    return { success: true, data: policy };
  }

  async update(id: string, data: UpdateRoutingPolicyInput): Promise<MutationResult<RoutingPolicy>> {
    const index = this.policies.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Policy not found' };

    const policy = this.policies[index];

    if (data.name !== undefined) policy.name = data.name;
    if (data.description !== undefined) policy.description = data.description;
    if (data.status !== undefined) policy.status = data.status;
    if (data.body !== undefined) this.policyBodies.set(id, data.body);
    if (data.policy !== undefined) this.policyJsons.set(id, data.policy);

    policy.lastModifiedDate = new Date().toISOString();

    return { success: true, data: policy };
  }

  async delete(id: string): Promise<DeleteResult> {
    const index = this.policies.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Policy not found' };

    this.policies.splice(index, 1);
    this.policyBodies.delete(id);
    this.policyJsons.delete(id);

    return { success: true };
  }

  async getPolicyBody(id: string): Promise<PolicyBody | null> {
    return this.policyBodies.get(id) || null;
  }

  async updatePolicyBody(id: string, body: PolicyBody): Promise<MutationResult<RoutingPolicy>> {
    return this.update(id, { body });
  }

  async getPolicyJson(id: string): Promise<string | null> {
    return this.policyJsons.get(id) || null;
  }

  async updatePolicyJson(id: string, policyJson: string): Promise<MutationResult<RoutingPolicy>> {
    return this.update(id, { policy: policyJson });
  }

  async enable(id: string): Promise<MutationResult<RoutingPolicy>> {
    return this.update(id, { status: 'Enabled' });
  }

  async disable(id: string): Promise<MutationResult<RoutingPolicy>> {
    return this.update(id, { status: 'Disabled' });
  }

  async toggleStatus(id: string): Promise<MutationResult<RoutingPolicy>> {
    const policy = await this.findById(id);
    if (!policy) return { success: false, error: 'Policy not found' };
    return this.update(id, { status: policy.status === 'Enabled' ? 'Disabled' : 'Enabled' });
  }

  async getPhoneNumberAssignments(policyIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    for (const id of policyIds) {
      const policy = this.policies.find(p => p.id === id);
      if (policy) {
        result.set(id, policy.phoneNumbers);
      }
    }
    return result;
  }
}
