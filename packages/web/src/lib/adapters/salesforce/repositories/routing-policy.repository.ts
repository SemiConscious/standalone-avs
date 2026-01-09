/**
 * Salesforce Routing Policy Repository Implementation
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
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';
import type { SalesforceCallFlowRecord } from '../types';
import { mapSalesforceRoutingPolicy, mapCreateRoutingPolicyToSalesforce, mapUpdateRoutingPolicyToSalesforce, parsePolicyBody } from '../mappers/routing-policy.mapper';
import {
  buildRoutingPolicyListQuery,
  buildRoutingPolicyCountQuery,
  buildRoutingPolicyByIdQuery,
  buildRoutingPolicyByNameQuery,
  buildPolicyBodyQuery,
  buildPolicyJsonQuery,
  buildPhoneNumberAssignmentsQuery,
} from '../queries/routing-policy.queries';

export class SalesforceRoutingPolicyRepository implements IRoutingPolicyRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  async findAll(params: RoutingPolicyQueryParams): Promise<PaginatedResult<RoutingPolicy>> {
    const countSoql = buildRoutingPolicyCountQuery(this.ns, params);
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);
    const totalCount = countResult.totalSize;

    const listSoql = buildRoutingPolicyListQuery(this.ns, params);
    const listResult = await this.client.query<SalesforceCallFlowRecord>(listSoql);

    // Get phone number assignments
    const policyIds = listResult.records.map(p => p.Id);
    const phoneAssignments = await this.getPhoneNumberAssignments(policyIds);

    const policies = listResult.records.map(sf =>
      mapSalesforceRoutingPolicy(sf, phoneAssignments.get(sf.Id) || [])
    );

    return {
      items: policies,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<RoutingPolicy | null> {
    const soql = buildRoutingPolicyByIdQuery(this.ns, id);
    const result = await this.client.query<SalesforceCallFlowRecord>(soql);

    if (result.records.length === 0) return null;

    const phoneAssignments = await this.getPhoneNumberAssignments([id]);
    return mapSalesforceRoutingPolicy(result.records[0], phoneAssignments.get(id) || []);
  }

  async findByName(name: string): Promise<RoutingPolicy | null> {
    const soql = buildRoutingPolicyByNameQuery(this.ns, name);
    const result = await this.client.query<SalesforceCallFlowRecord>(soql);
    return result.records.length > 0 ? mapSalesforceRoutingPolicy(result.records[0]) : null;
  }

  async create(data: CreateRoutingPolicyInput): Promise<MutationResult<RoutingPolicy>> {
    try {
      const sfData = mapCreateRoutingPolicyToSalesforce(data, this.ns);
      const result = await this.client.create('CallFlow__c', sfData);

      if (!result.success) {
        return { success: false, error: result.errors?.map(e => e.message).join('; ') || 'Failed to create policy' };
      }

      const policy = await this.findById(result.id);
      return { success: true, data: policy! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create policy' };
    }
  }

  async update(id: string, data: UpdateRoutingPolicyInput): Promise<MutationResult<RoutingPolicy>> {
    try {
      const sfData = mapUpdateRoutingPolicyToSalesforce(data, this.ns);
      await this.client.update('CallFlow__c', id, sfData);

      const policy = await this.findById(id);
      return { success: true, data: policy! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update policy' };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('CallFlow__c', id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete policy' };
    }
  }

  async getPolicyBody(id: string): Promise<PolicyBody | null> {
    const soql = buildPolicyBodyQuery(this.ns, id);
    const result = await this.client.query<Record<string, string>>(soql);

    if (result.records.length === 0) return null;
    return parsePolicyBody(result.records[0][`${this.ns}__Body__c`]);
  }

  async updatePolicyBody(id: string, body: PolicyBody): Promise<MutationResult<RoutingPolicy>> {
    return this.update(id, { body });
  }

  async getPolicyJson(id: string): Promise<string | null> {
    const soql = buildPolicyJsonQuery(this.ns, id);
    const result = await this.client.query<Record<string, string>>(soql);

    if (result.records.length === 0) return null;
    return result.records[0][`${this.ns}__Policy__c`] || null;
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

    const newStatus = policy.status === 'Enabled' ? 'Disabled' : 'Enabled';
    return this.update(id, { status: newStatus });
  }

  async getPhoneNumberAssignments(policyIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (policyIds.length === 0) return result;

    try {
      const soql = buildPhoneNumberAssignmentsQuery(this.ns, policyIds);
      const queryResult = await this.client.query<{
        nbavs__Number__c?: string;
        nbavs__CallFlow__c: string;
        Name?: string;
      }>(soql);

      for (const record of queryResult.records) {
        const policyId = record.nbavs__CallFlow__c;
        const number = record.nbavs__Number__c || record.Name || '';

        if (!result.has(policyId)) {
          result.set(policyId, []);
        }
        result.get(policyId)!.push(number);
      }
    } catch (error) {
      console.warn('Failed to fetch phone number assignments:', error);
    }

    return result;
  }
}
