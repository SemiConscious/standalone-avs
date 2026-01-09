/**
 * Salesforce Sound Repository Implementation
 * 
 * Note: Sound handling typically involves external storage (e.g., S3, Sapien).
 * This implementation provides the Salesforce metadata layer.
 */

import type { ISoundRepository, SoundQueryParams } from '$lib/repositories';
import type {
  Sound,
  CreateSoundInput,
  UpdateSoundInput,
  SoundType,
  TTSVoice,
  TTSRequest,
  PaginatedResult,
  MutationResult,
  DeleteResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';

export class SalesforceSoundRepository implements ISoundRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  private mapSound(sf: Record<string, unknown>): Sound {
    const ns = this.ns;
    return {
      id: sf.Id as string,
      platformId: sf[`${ns}__Id__c`] as number | undefined,
      name: sf.Name as string,
      description: (sf[`${ns}__Description__c`] as string) || '',
      type: 'prompt' as SoundType,
      format: 'wav' as 'wav' | 'mp3' | 'ogg',
      duration: 0,
      fileSize: (sf[`${ns}__Size__c`] as number) || 0,
      createdDate: sf.CreatedDate as string,
      lastModifiedDate: sf.LastModifiedDate as string,
      createdByName: (sf.CreatedBy as Record<string, unknown>)?.Name as string | undefined,
      isSystem: false,
    };
  }

  async findAll(params: SoundQueryParams): Promise<PaginatedResult<Sound>> {
    const conditions: string[] = [];

    if (params.search) {
      const searchTerm = params.search.replace(/'/g, "\\'");
      conditions.push(`(Name LIKE '%${searchTerm}%' OR ${this.ns}__Description__c LIKE '%${searchTerm}%')`);
    }
    // Skip type/system filters as those fields may not exist

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const countSoql = `SELECT COUNT() FROM ${this.ns}__Sound__c ${whereClause}`;
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);

    // Simplified query - only select basic fields
    const listSoql = `
      SELECT Id, Name, ${this.ns}__Id__c, ${this.ns}__Description__c, ${this.ns}__Size__c,
             CreatedDate, LastModifiedDate, CreatedBy.Name
      FROM ${this.ns}__Sound__c
      ${whereClause}
      ORDER BY Name
      LIMIT ${params.pageSize} OFFSET ${offset}
    `;
    const listResult = await this.client.query<Record<string, unknown>>(listSoql);

    return {
      items: listResult.records.map(sf => this.mapSound(sf)),
      pagination: createPaginationMeta(params.page, params.pageSize, countResult.totalSize),
    };
  }

  async findById(id: string): Promise<Sound | null> {
    const soql = `
      SELECT Id, Name, ${this.ns}__Id__c, ${this.ns}__Description__c, ${this.ns}__Size__c,
             CreatedDate, LastModifiedDate, CreatedBy.Name
      FROM ${this.ns}__Sound__c WHERE Id = '${id}' LIMIT 1
    `;
    const result = await this.client.query<Record<string, unknown>>(soql);
    return result.records.length > 0 ? this.mapSound(result.records[0]) : null;
  }

  async findByName(name: string): Promise<Sound | null> {
    const soql = `
      SELECT Id, Name, ${this.ns}__Id__c, ${this.ns}__Description__c, ${this.ns}__Size__c,
             CreatedDate, LastModifiedDate, CreatedBy.Name
      FROM ${this.ns}__Sound__c WHERE Name = '${name}' LIMIT 1
    `;
    const result = await this.client.query<Record<string, unknown>>(soql);
    return result.records.length > 0 ? this.mapSound(result.records[0]) : null;
  }

  async create(data: CreateSoundInput): Promise<MutationResult<Sound>> {
    try {
      const sfData = {
        Name: data.name,
        [`${this.ns}__Description__c`]: data.description || '',
        [`${this.ns}__Type__c`]: data.type || 'prompt',
        [`${this.ns}__IsSystem__c`]: false,
      };
      const result = await this.client.create('Sound__c', sfData);

      if (!result.success) {
        return { success: false, error: 'Failed to create sound' };
      }

      const sound = await this.findById(result.id);
      return { success: true, data: sound! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create sound' };
    }
  }

  async update(id: string, data: UpdateSoundInput): Promise<MutationResult<Sound>> {
    try {
      const sfData: Record<string, unknown> = {};
      if (data.name !== undefined) sfData.Name = data.name;
      if (data.description !== undefined) sfData[`${this.ns}__Description__c`] = data.description;
      if (data.type !== undefined) sfData[`${this.ns}__Type__c`] = data.type;

      await this.client.update('Sound__c', id, sfData);

      const sound = await this.findById(id);
      return { success: true, data: sound! };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update sound' };
    }
  }

  async delete(id: string): Promise<DeleteResult> {
    try {
      await this.client.delete('Sound__c', id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete sound' };
    }
  }

  async getPlaybackUrl(id: string): Promise<string | null> {
    const sound = await this.findById(id);
    if (!sound?.platformId) return null;
    return `/api/sounds/${sound.platformId}`;
  }

  async getDownloadUrl(id: string): Promise<string | null> {
    return this.getPlaybackUrl(id);
  }

  async getTTSVoices(): Promise<TTSVoice[]> {
    // This would typically come from the TTS service (e.g., AWS Polly, Google TTS)
    return [
      { id: 'amy', name: 'Amy', languageCode: 'en-GB', gender: 'female', provider: 'aws' },
      { id: 'brian', name: 'Brian', languageCode: 'en-GB', gender: 'male', provider: 'aws' },
      { id: 'joanna', name: 'Joanna', languageCode: 'en-US', gender: 'female', provider: 'aws' },
      { id: 'matthew', name: 'Matthew', languageCode: 'en-US', gender: 'male', provider: 'aws' },
    ];
  }

  async generateTTS(request: TTSRequest): Promise<string> {
    // This would call the TTS service - for now return a placeholder
    return `/api/tts/generate?text=${encodeURIComponent(request.text)}&voice=${request.voiceId}`;
  }

  async createFromTTS(name: string, request: TTSRequest): Promise<MutationResult<Sound>> {
    // In a full implementation, this would:
    // 1. Call TTS service to generate audio
    // 2. Upload to storage
    // 3. Create Salesforce record
    return this.create({ name, type: 'prompt' });
  }
}
