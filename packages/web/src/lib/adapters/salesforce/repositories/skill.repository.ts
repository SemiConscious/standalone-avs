/**
 * Salesforce Skill Repository Implementation
 */

import type { ISkillRepository, SkillQueryParams } from '$lib/repositories';
import type {
  Skill,
  CreateSkillInput,
  UpdateSkillInput,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';

export class SalesforceSkillRepository implements ISkillRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  private mapSkill(sf: Record<string, unknown>): Skill {
    const ns = this.ns;
    return {
      id: sf.Id as string,
      name: sf.Name as string,
      description: (sf[`${ns}__Description__c`] as string) || '',
      sapienId: sf[`${ns}__Id__c`] as number | undefined,
      proficiency: (sf[`${ns}__Weight_Preset__c`] as string) || 'No knowledge',
      weight: (sf[`${ns}__Weight__c`] as number) || 0,
      lastModified: sf.LastModifiedDate as string,
    };
  }

  async findAll(params: SkillQueryParams): Promise<PaginatedResult<Skill>> {
    const conditions: string[] = [];

    if (params.search) {
      const searchTerm = params.search.replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${searchTerm}%' OR ${this.ns}__Description__c LIKE '%${searchTerm}%')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const countSoql = `SELECT COUNT() FROM ${this.ns}__Skill__c ${whereClause}`;
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);

    const listSoql = `
      SELECT Id, Name, ${this.ns}__Id__c, ${this.ns}__Description__c,
             ${this.ns}__Weight_Preset__c, ${this.ns}__Weight__c, LastModifiedDate
      FROM ${this.ns}__Skill__c
      ${whereClause}
      ORDER BY Name
      LIMIT ${params.pageSize} OFFSET ${offset}
    `;
    const listResult = await this.client.query<Record<string, unknown>>(listSoql);

    return {
      items: listResult.records.map(sf => this.mapSkill(sf)),
      pagination: createPaginationMeta(params.page, params.pageSize, countResult.totalSize),
    };
  }

  async findById(id: string): Promise<Skill | null> {
    const soql = `
      SELECT Id, Name, ${this.ns}__Id__c, ${this.ns}__Description__c,
             ${this.ns}__Weight_Preset__c, ${this.ns}__Weight__c, LastModifiedDate
      FROM ${this.ns}__Skill__c WHERE Id = '${id}' LIMIT 1
    `;
    const result = await this.client.query<Record<string, unknown>>(soql);
    return result.records.length > 0 ? this.mapSkill(result.records[0]) : null;
  }

  async create(data: CreateSkillInput): Promise<MutationResult<Skill>> {
    try {
      const sfData = {
        Name: data.name,
        [`${this.ns}__Description__c`]: data.description || '',
      };
      const result = await this.client.create('Skill__c', sfData);

      if (!result.success) {
        return { success: false, error: 'Failed to create skill' };
      }

      const skill = await this.findById(result.id);
      return { success: true, data: skill! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create skill' };
    }
  }

  async update(id: string, data: UpdateSkillInput): Promise<MutationResult<Skill>> {
    try {
      const sfData: Record<string, unknown> = {};
      if (data.name !== undefined) sfData.Name = data.name;
      if (data.description !== undefined) sfData[`${this.ns}__Description__c`] = data.description;

      await this.client.update('Skill__c', id, sfData);

      const skill = await this.findById(id);
      return { success: true, data: skill! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update skill' };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('Skill__c', id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete skill' };
    }
  }
}
