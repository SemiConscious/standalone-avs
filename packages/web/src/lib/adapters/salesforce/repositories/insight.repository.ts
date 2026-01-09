/**
 * Salesforce Insight Repository Implementation
 * 
 * Note: AI Insights typically come from external AI services (e.g., Lumina).
 * This implementation provides basic Salesforce storage/retrieval of insight data.
 */

import type { IInsightRepository, InsightQueryParams } from '$lib/repositories';
import type {
  Insight,
  CallAnalysis,
  InsightStats,
  InsightType,
  SentimentScore,
  PaginatedResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';

interface SalesforceInsightRecord {
  Id: string;
  nbavs__CallLog__c?: string;
  nbavs__Type__c?: string;
  nbavs__Title__c?: string;
  nbavs__Content__c?: string;
  nbavs__Confidence__c?: number;
  CreatedDate: string;
  nbavs__Agent__c?: string;
  nbavs__Agent__r?: { Id: string; Name: string };
}

export class SalesforceInsightRepository implements IInsightRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  private mapInsight(sf: SalesforceInsightRecord): Insight {
    return {
      id: sf.Id,
      callLogId: sf.nbavs__CallLog__c || '',
      type: (sf.nbavs__Type__c?.toLowerCase() || 'call_summary') as InsightType,
      title: sf.nbavs__Title__c || '',
      content: sf.nbavs__Content__c || '',
      confidence: sf.nbavs__Confidence__c || 0,
      createdDate: sf.CreatedDate,
      agentId: sf.nbavs__Agent__r?.Id,
      agentName: sf.nbavs__Agent__r?.Name,
    };
  }

  async findAll(params: InsightQueryParams): Promise<PaginatedResult<Insight>> {
    const conditions: string[] = [];

    if (params.filters?.fromDate) {
      conditions.push(`CreatedDate >= ${params.filters.fromDate}T00:00:00Z`);
    }
    if (params.filters?.toDate) {
      conditions.push(`CreatedDate <= ${params.filters.toDate}T23:59:59Z`);
    }
    if (params.filters?.agentId) {
      conditions.push(`${this.ns}__Agent__c = '${params.filters.agentId}'`);
    }
    if (params.filters?.insightType) {
      conditions.push(`${this.ns}__Type__c = '${params.filters.insightType}'`);
    }
    if (params.filters?.minConfidence) {
      conditions.push(`${this.ns}__Confidence__c >= ${params.filters.minConfidence}`);
    }
    if (params.search) {
      const searchTerm = params.search.replace(/'/g, "\\'");
      conditions.push(`(${this.ns}__Title__c LIKE '%${searchTerm}%' OR ${this.ns}__Content__c LIKE '%${searchTerm}%')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (params.page - 1) * params.pageSize;

    const countSoql = `SELECT COUNT() FROM ${this.ns}__Insight__c ${whereClause}`;
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);

    const listSoql = `
      SELECT Id, ${this.ns}__CallLog__c, ${this.ns}__Type__c, ${this.ns}__Title__c,
             ${this.ns}__Content__c, ${this.ns}__Confidence__c, CreatedDate,
             ${this.ns}__Agent__c, ${this.ns}__Agent__r.Id, ${this.ns}__Agent__r.Name
      FROM ${this.ns}__Insight__c
      ${whereClause}
      ORDER BY CreatedDate DESC
      LIMIT ${params.pageSize} OFFSET ${offset}
    `;
    const listResult = await this.client.query<SalesforceInsightRecord>(listSoql);

    return {
      items: listResult.records.map(sf => this.mapInsight(sf)),
      pagination: createPaginationMeta(params.page, params.pageSize, countResult.totalSize),
    };
  }

  async findById(id: string): Promise<Insight | null> {
    const soql = `
      SELECT Id, ${this.ns}__CallLog__c, ${this.ns}__Type__c, ${this.ns}__Title__c,
             ${this.ns}__Content__c, ${this.ns}__Confidence__c, CreatedDate,
             ${this.ns}__Agent__c, ${this.ns}__Agent__r.Id, ${this.ns}__Agent__r.Name
      FROM ${this.ns}__Insight__c WHERE Id = '${id}' LIMIT 1
    `;
    const result = await this.client.query<SalesforceInsightRecord>(soql);
    return result.records.length > 0 ? this.mapInsight(result.records[0]) : null;
  }

  async findByCallLogId(callLogId: string): Promise<Insight[]> {
    const soql = `
      SELECT Id, ${this.ns}__CallLog__c, ${this.ns}__Type__c, ${this.ns}__Title__c,
             ${this.ns}__Content__c, ${this.ns}__Confidence__c, CreatedDate,
             ${this.ns}__Agent__c, ${this.ns}__Agent__r.Id, ${this.ns}__Agent__r.Name
      FROM ${this.ns}__Insight__c WHERE ${this.ns}__CallLog__c = '${callLogId}'
    `;
    const result = await this.client.query<SalesforceInsightRecord>(soql);
    return result.records.map(sf => this.mapInsight(sf));
  }

  async findByAgentId(agentId: string, params: InsightQueryParams): Promise<PaginatedResult<Insight>> {
    return this.findAll({ ...params, filters: { ...params.filters, agentId } });
  }

  async getCallAnalysis(callLogId: string): Promise<CallAnalysis | null> {
    // In a full implementation, this would fetch from the AI service
    // For now, return null (call analysis not available from Salesforce)
    return null;
  }

  async searchTranscripts(searchTerm: string, params: InsightQueryParams): Promise<PaginatedResult<Insight>> {
    return this.findAll({ ...params, search: searchTerm });
  }

  async getStats(fromDate: string, toDate: string): Promise<InsightStats> {
    // Simplified implementation - in production would use aggregate queries
    const params: InsightQueryParams = {
      page: 1,
      pageSize: 10000,
      filters: { fromDate, toDate },
    };
    const result = await this.findAll(params);

    return {
      totalCallsAnalyzed: result.pagination.totalItems,
      averageSentiment: 0, // Would need sentiment data
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      topTopics: [],
      averageActionItems: 0,
    };
  }

  async getSentimentDistribution(fromDate: string, toDate: string): Promise<Map<SentimentScore, number>> {
    // Would need sentiment data from AI service
    return new Map([
      ['positive', 0],
      ['neutral', 0],
      ['negative', 0],
    ]);
  }

  async getCountByType(fromDate: string, toDate: string): Promise<Map<InsightType, number>> {
    const soql = `
      SELECT ${this.ns}__Type__c, COUNT(Id) cnt
      FROM ${this.ns}__Insight__c
      WHERE CreatedDate >= ${fromDate}T00:00:00Z AND CreatedDate <= ${toDate}T23:59:59Z
      GROUP BY ${this.ns}__Type__c
    `;
    const result = await this.client.query<{ nbavs__Type__c: string; cnt: number }>(soql);

    const counts = new Map<InsightType, number>();
    for (const record of result.records) {
      const type = (record.nbavs__Type__c?.toLowerCase() || 'call_summary') as InsightType;
      counts.set(type, record.cnt);
    }
    return counts;
  }

  async getTopTopics(fromDate: string, toDate: string, limit = 10): Promise<Array<{ name: string; count: number }>> {
    // Would need topic extraction from AI service
    return [];
  }

  async getAgentMetrics(agentId: string, fromDate: string, toDate: string): Promise<{
    averageSentiment: number;
    callsAnalyzed: number;
    coachingSuggestionsCount: number;
    topStrengths: string[];
    areasForImprovement: string[];
  }> {
    const params: InsightQueryParams = {
      page: 1,
      pageSize: 10000,
      filters: { agentId, fromDate, toDate },
    };
    const result = await this.findAll(params);

    return {
      averageSentiment: 0,
      callsAnalyzed: result.pagination.totalItems,
      coachingSuggestionsCount: result.items.filter(i => i.type === 'coaching').length,
      topStrengths: [],
      areasForImprovement: [],
    };
  }

  // =========================================================================
  // Filter View Operations
  // =========================================================================

  async getFilterViews(): Promise<import('$lib/repositories/insight.repository').FilterView[]> {
    // Get current user ID
    const userInfoResponse = await fetch(`${this.ctx.instanceUrl}/services/oauth2/userinfo`, {
      headers: { 'Authorization': `Bearer ${this.ctx.accessToken}` },
    });
    if (!userInfoResponse.ok) throw new Error('Failed to get user info');
    const userInfo = await userInfoResponse.json();
    const sfUserId = userInfo.user_id;

    const soql = `
      SELECT Id, Name, ${this.ns}__ViewName__c, ${this.ns}__ViewColumns__c, 
             ${this.ns}__ViewFilters__c, ${this.ns}__Default__c, CreatedById, CreatedDate
      FROM ${this.ns}__FilterView__c
      WHERE ${this.ns}__Application__c = 'NatterboxAI'
      AND CreatedById = '${sfUserId}'
      ORDER BY ${this.ns}__Default__c DESC, CreatedDate DESC
      LIMIT 50
    `;
    
    const result = await this.client.query<Record<string, unknown>>(soql);
    
    return result.records.map(fv => {
      let columns: string[] = ['name', 'timestamp', 'sentiment', 'summary'];
      let filters: Record<string, unknown> = {};
      
      try {
        const colStr = fv[`${this.ns}__ViewColumns__c`] as string;
        if (colStr) columns = JSON.parse(colStr);
      } catch { /* use defaults */ }
      
      try {
        const filterStr = fv[`${this.ns}__ViewFilters__c`] as string;
        if (filterStr) filters = JSON.parse(filterStr);
      } catch { /* use defaults */ }
      
      return {
        id: fv.Id as string,
        name: (fv[`${this.ns}__ViewName__c`] || fv.Name || 'Unnamed View') as string,
        columns,
        filters,
        isDefault: (fv[`${this.ns}__Default__c`] || false) as boolean,
        createdDate: fv.CreatedDate as string,
        isOwner: (fv.CreatedById as string) === sfUserId,
      };
    });
  }

  async saveFilterView(view: import('$lib/repositories/insight.repository').SaveFilterViewInput): Promise<{ id: string }> {
    // Get Natterbox user ID
    let nbUserId: string | null = null;
    try {
      const userInfoResponse = await fetch(`${this.ctx.instanceUrl}/services/oauth2/userinfo`, {
        headers: { 'Authorization': `Bearer ${this.ctx.accessToken}` },
      });
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        const sfUserId = userInfo.user_id;
        const nbUserResult = await this.client.query<{ Id: string }>(
          `SELECT Id FROM ${this.ns}__User__c WHERE ${this.ns}__User__c = '${sfUserId}' LIMIT 1`
        );
        if (nbUserResult.records.length > 0) {
          nbUserId = nbUserResult.records[0].Id;
        }
      }
    } catch { /* continue without nbUserId */ }

    // If setting as default, unset any existing default
    if (view.isDefault) {
      const existingDefaults = await this.client.query<{ Id: string }>(
        `SELECT Id FROM ${this.ns}__FilterView__c 
         WHERE ${this.ns}__Application__c = 'NatterboxAI' 
         AND ${this.ns}__Default__c = true 
         AND Id != '${view.id || ''}'`
      );
      
      for (const fv of existingDefaults.records) {
        await this.client.update(`${this.ns}__FilterView__c`, fv.Id, {
          [`${this.ns}__Default__c`]: false,
        });
      }
    }

    const viewData: Record<string, unknown> = {
      [`${this.ns}__ViewName__c`]: view.name,
      [`${this.ns}__ViewColumns__c`]: JSON.stringify(view.columns),
      [`${this.ns}__ViewFilters__c`]: JSON.stringify(view.filters),
      [`${this.ns}__Default__c`]: view.isDefault,
      [`${this.ns}__Application__c`]: 'NatterboxAI',
    };

    if (nbUserId) {
      viewData[`${this.ns}__CreatedByNatterboxUser__c`] = nbUserId;
    }

    if (view.id && view.id !== '0') {
      await this.client.update(`${this.ns}__FilterView__c`, view.id, viewData);
      return { id: view.id };
    } else {
      const result = await this.client.create(`${this.ns}__FilterView__c`, viewData);
      return { id: result.id };
    }
  }

  async deleteFilterView(viewId: string): Promise<void> {
    // Verify ownership
    const userInfoResponse = await fetch(`${this.ctx.instanceUrl}/services/oauth2/userinfo`, {
      headers: { 'Authorization': `Bearer ${this.ctx.accessToken}` },
    });
    if (!userInfoResponse.ok) throw new Error('Failed to get user info');
    const userInfo = await userInfoResponse.json();
    const sfUserId = userInfo.user_id;

    const result = await this.client.query<{ Id: string; CreatedById: string }>(
      `SELECT Id, CreatedById FROM ${this.ns}__FilterView__c WHERE Id = '${viewId}'`
    );

    if (result.records.length === 0) {
      throw new Error('View not found');
    }

    if (result.records[0].CreatedById !== sfUserId) {
      throw new Error('You can only delete views you created');
    }

    await this.client.delete(`${this.ns}__FilterView__c`, viewId);
  }

  // =========================================================================
  // Advanced Search Operations
  // =========================================================================

  async searchAIInsights(
    filters: import('$lib/repositories/insight.repository').AIInsightSearchFilters
  ): Promise<import('$lib/repositories/insight.repository').AIInsightSearchResult> {
    const whereClauses: string[] = [];
    
    if (filters.query) {
      const searchTerm = filters.query.replace(/'/g, "\\'");
      whereClauses.push(`(Name LIKE '%${searchTerm}%' OR ${this.ns}__Number__c LIKE '%${searchTerm}%')`);
    }
    
    if (filters.startDate) {
      whereClauses.push(`CreatedDate >= ${filters.startDate}T00:00:00Z`);
    }
    
    if (filters.endDate) {
      whereClauses.push(`CreatedDate <= ${filters.endDate}T23:59:59Z`);
    }
    
    if (filters.sentiment) {
      switch (filters.sentiment) {
        case 'positive':
          whereClauses.push(`${this.ns}__OverallRating__c >= 4`);
          break;
        case 'negative':
          whereClauses.push(`${this.ns}__OverallRating__c < 2.5`);
          break;
        case 'neutral':
          whereClauses.push(`${this.ns}__OverallRating__c >= 2.5`);
          whereClauses.push(`${this.ns}__OverallRating__c < 4`);
          break;
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Get total count
    const countSoql = `SELECT COUNT() FROM ${this.ns}__NatterboxAI__c ${whereClause}`;
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);
    const total = countResult.totalSize;

    // Get records
    const soql = `
      SELECT Id, Name, ${this.ns}__UUID__c, ${this.ns}__StartTime__c, ${this.ns}__Number__c,
             ${this.ns}__Summary__c, ${this.ns}__OverallRating__c, ${this.ns}__ChannelDuration__c,
             ${this.ns}__AIAnalysisStatus__c, ${this.ns}__NatterboxUser__r.Name,
             ${this.ns}__Group__r.Name, ${this.ns}__CRO__r.${this.ns}__Call_Direction__c,
             CreatedDate
      FROM ${this.ns}__NatterboxAI__c
      ${whereClause}
      ORDER BY CreatedDate DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.client.query<Record<string, unknown>>(soql);

    const results = result.records.map(ai => {
      const overallRating = (ai[`${this.ns}__OverallRating__c`] as number) || 0;
      const aiStatus = (ai[`${this.ns}__AIAnalysisStatus__c`] as string) || '';
      let status = 'Unknown';
      if (aiStatus === 'Complete') status = 'Completed';
      else if (aiStatus === 'Processing' || aiStatus === 'Pending') status = 'Processing';
      else if (aiStatus === 'Error') status = 'Error';

      const getSentiment = (rating: number): 'positive' | 'neutral' | 'negative' => {
        if (rating >= 4) return 'positive';
        if (rating >= 2.5) return 'neutral';
        return 'negative';
      };

      return {
        id: ai.Id as string,
        name: ai.Name as string,
        uuid: (ai[`${this.ns}__UUID__c`] || '') as string,
        phoneNumber: (ai[`${this.ns}__Number__c`] || '') as string,
        direction: ((ai[`${this.ns}__CRO__r`] as Record<string, unknown>)?.[`${this.ns}__Call_Direction__c`] || 'Unknown') as string,
        duration: (ai[`${this.ns}__ChannelDuration__c`] || 0) as number,
        timestamp: ((ai[`${this.ns}__StartTime__c`] || ai.CreatedDate) || '') as string,
        summary: (ai[`${this.ns}__Summary__c`] || 'No summary available') as string,
        sentiment: getSentiment(overallRating),
        sentimentScore: Math.round((overallRating / 5) * 100),
        agentName: ((ai[`${this.ns}__NatterboxUser__r`] as Record<string, unknown>)?.Name || 'Unknown') as string,
        groupName: ((ai[`${this.ns}__Group__r`] as Record<string, unknown>)?.Name || '') as string,
        status,
      };
    });

    return { results, total };
  }
}
