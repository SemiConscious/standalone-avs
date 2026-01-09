/**
 * Salesforce Phone Number Repository Implementation
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
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';
import type { SalesforcePhoneNumberRecord } from '../types';
import { mapSalesforcePhoneNumber, mapUpdatePhoneNumberToSalesforce } from '../mappers/phone-number.mapper';
import {
  buildPhoneNumberListQuery,
  buildPhoneNumberCountQuery,
  buildPhoneNumberByIdQuery,
  buildPhoneNumberByNumberQuery,
  buildPhoneNumbersByPolicyQuery,
  buildUnassignedPhoneNumbersQuery,
} from '../queries/phone-number.queries';

export class SalesforcePhoneNumberRepository implements IPhoneNumberRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  async findAll(params: PhoneNumberQueryParams): Promise<PaginatedResult<PhoneNumber>> {
    const countSoql = buildPhoneNumberCountQuery(this.ns, params);
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);
    const totalCount = countResult.totalSize;

    const listSoql = buildPhoneNumberListQuery(this.ns, params);
    const listResult = await this.client.query<SalesforcePhoneNumberRecord>(listSoql);

    return {
      items: listResult.records.map(mapSalesforcePhoneNumber),
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<PhoneNumber | null> {
    const soql = buildPhoneNumberByIdQuery(this.ns, id);
    const result = await this.client.query<SalesforcePhoneNumberRecord>(soql);
    return result.records.length > 0 ? mapSalesforcePhoneNumber(result.records[0]) : null;
  }

  async findByNumber(number: string): Promise<PhoneNumber | null> {
    const soql = buildPhoneNumberByNumberQuery(this.ns, number);
    const result = await this.client.query<SalesforcePhoneNumberRecord>(soql);
    return result.records.length > 0 ? mapSalesforcePhoneNumber(result.records[0]) : null;
  }

  async update(id: string, data: UpdatePhoneNumberInput): Promise<MutationResult<PhoneNumber>> {
    try {
      const sfData = mapUpdatePhoneNumberToSalesforce(data, this.ns);
      await this.client.update('PhoneNumber__c', id, sfData);

      const phoneNumber = await this.findById(id);
      return { success: true, data: phoneNumber! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update phone number' };
    }
  }

  async assign(input: AssignPhoneNumberInput): Promise<MutationResult<PhoneNumber>> {
    try {
      await this.client.update('PhoneNumber__c', input.phoneNumberId, {
        [`${this.ns}__CallFlow__c`]: input.routingPolicyId,
      });

      const phoneNumber = await this.findById(input.phoneNumberId);
      return { success: true, data: phoneNumber! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to assign phone number' };
    }
  }

  async unassign(id: string): Promise<MutationResult<PhoneNumber>> {
    try {
      await this.client.update('PhoneNumber__c', id, {
        [`${this.ns}__CallFlow__c`]: null,
      });

      const phoneNumber = await this.findById(id);
      return { success: true, data: phoneNumber! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to unassign phone number' };
    }
  }

  async getByRoutingPolicy(policyId: string): Promise<PhoneNumber[]> {
    const soql = buildPhoneNumbersByPolicyQuery(this.ns, policyId);
    const result = await this.client.query<SalesforcePhoneNumberRecord>(soql);
    return result.records.map(mapSalesforcePhoneNumber);
  }

  async getUnassigned(): Promise<PhoneNumber[]> {
    const soql = buildUnassignedPhoneNumbersQuery(this.ns);
    const result = await this.client.query<SalesforcePhoneNumberRecord>(soql);
    return result.records.map(mapSalesforcePhoneNumber);
  }

  async getCountryBreakdown(): Promise<Map<string, number>> {
    const soql = `SELECT ${this.ns}__CountryCode__c, COUNT(Id) cnt FROM ${this.ns}__PhoneNumber__c GROUP BY ${this.ns}__CountryCode__c`;
    const result = await this.client.query<{ nbavs__CountryCode__c: string; cnt: number }>(soql);

    const breakdown = new Map<string, number>();
    for (const record of result.records) {
      breakdown.set(record.nbavs__CountryCode__c || 'Unknown', record.cnt);
    }
    return breakdown;
  }

  async getTypeBreakdown(): Promise<Map<PhoneNumberType, number>> {
    const soql = `SELECT ${this.ns}__Type__c, COUNT(Id) cnt FROM ${this.ns}__PhoneNumber__c GROUP BY ${this.ns}__Type__c`;
    const result = await this.client.query<{ nbavs__Type__c: string; cnt: number }>(soql);

    const breakdown = new Map<PhoneNumberType, number>();
    for (const record of result.records) {
      const type = (record.nbavs__Type__c?.toLowerCase() || 'geographic') as PhoneNumberType;
      breakdown.set(type, record.cnt);
    }
    return breakdown;
  }
}
