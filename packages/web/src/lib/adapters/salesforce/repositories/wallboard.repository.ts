/**
 * Salesforce Wallboard Repository Implementation
 */

import type { IWallboardRepository, WallboardQueryParams } from '$lib/repositories';
import type {
  Wallboard,
  CreateWallboardInput,
  UpdateWallboardInput,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';

interface SalesforceWallboardRecord {
  Id: string;
  Name: string;
  nbavs__Description__c?: string;
  nbavs__Type__c?: string;
  nbavs__Enabled__c?: boolean;
  nbavs__Configuration__c?: string;
  LastModifiedDate: string;
}

export class SalesforceWallboardRepository implements IWallboardRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  private mapWallboard(sf: SalesforceWallboardRecord): Wallboard {
    return {
      id: sf.Id,
      name: sf.Name,
      description: sf.nbavs__Description__c || '',
      type: (sf.nbavs__Type__c?.toLowerCase() || 'custom') as 'queue' | 'agent' | 'custom',
      enabled: sf.nbavs__Enabled__c ?? true,
      configuration: sf.nbavs__Configuration__c,
      lastModified: sf.LastModifiedDate,
    };
  }

  async findAll(params: WallboardQueryParams): Promise<PaginatedResult<Wallboard>> {
    const conditions: string[] = [];

    if (params.search) {
      const searchTerm = params.search.replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${searchTerm}%' OR ${this.ns}__Description__c LIKE '%${searchTerm}%')`);
    }
    if (params.filters?.enabled !== undefined) {
      conditions.push(`${this.ns}__Enabled__c = ${params.filters.enabled}`);
    }
    if (params.filters?.type) {
      conditions.push(`${this.ns}__Type__c = '${params.filters.type}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const countSoql = `SELECT COUNT() FROM ${this.ns}__Wallboard__c ${whereClause}`;
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);

    const listSoql = `
      SELECT Id, Name, ${this.ns}__Description__c, ${this.ns}__Type__c, 
             ${this.ns}__Enabled__c, ${this.ns}__Configuration__c, LastModifiedDate
      FROM ${this.ns}__Wallboard__c
      ${whereClause}
      ORDER BY Name
      LIMIT ${params.pageSize} OFFSET ${offset}
    `;
    const listResult = await this.client.query<SalesforceWallboardRecord>(listSoql);

    return {
      items: listResult.records.map(sf => this.mapWallboard(sf)),
      pagination: createPaginationMeta(params.page, params.pageSize, countResult.totalSize),
    };
  }

  async findById(id: string): Promise<Wallboard | null> {
    const soql = `
      SELECT Id, Name, ${this.ns}__Description__c, ${this.ns}__Type__c, 
             ${this.ns}__Enabled__c, ${this.ns}__Configuration__c, LastModifiedDate
      FROM ${this.ns}__Wallboard__c WHERE Id = '${id}' LIMIT 1
    `;
    const result = await this.client.query<SalesforceWallboardRecord>(soql);
    return result.records.length > 0 ? this.mapWallboard(result.records[0]) : null;
  }

  async create(data: CreateWallboardInput): Promise<MutationResult<Wallboard>> {
    try {
      const sfData = {
        Name: data.name,
        [`${this.ns}__Description__c`]: data.description || '',
        [`${this.ns}__Type__c`]: data.type || 'custom',
        [`${this.ns}__Enabled__c`]: data.enabled ?? true,
        [`${this.ns}__Configuration__c`]: data.configuration,
      };
      const result = await this.client.create('Wallboard__c', sfData);

      if (!result.success) {
        return { success: false, error: 'Failed to create wallboard' };
      }

      const wallboard = await this.findById(result.id);
      return { success: true, data: wallboard! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create wallboard' };
    }
  }

  async update(id: string, data: UpdateWallboardInput): Promise<MutationResult<Wallboard>> {
    try {
      const sfData: Record<string, unknown> = {};
      if (data.name !== undefined) sfData.Name = data.name;
      if (data.description !== undefined) sfData[`${this.ns}__Description__c`] = data.description;
      if (data.type !== undefined) sfData[`${this.ns}__Type__c`] = data.type;
      if (data.enabled !== undefined) sfData[`${this.ns}__Enabled__c`] = data.enabled;
      if (data.configuration !== undefined) sfData[`${this.ns}__Configuration__c`] = data.configuration;

      await this.client.update('Wallboard__c', id, sfData);

      const wallboard = await this.findById(id);
      return { success: true, data: wallboard! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update wallboard' };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('Wallboard__c', id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete wallboard' };
    }
  }

  async toggleEnabled(id: string): Promise<MutationResult<{ enabled: boolean }>> {
    try {
      const wallboard = await this.findById(id);
      if (!wallboard) {
        return { success: false, error: 'Wallboard not found' };
      }

      const newEnabled = !wallboard.enabled;
      await this.client.update('Wallboard__c', id, {
        [`${this.ns}__Enabled__c`]: newEnabled,
      });

      return { success: true, data: { enabled: newEnabled } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle wallboard' };
    }
  }
}
