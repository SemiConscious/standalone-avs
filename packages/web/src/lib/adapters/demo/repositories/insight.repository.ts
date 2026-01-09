/**
 * Demo Insight Repository Implementation
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
import { DEMO_INSIGHTS, DEMO_CALL_ANALYSES, DEMO_INSIGHT_STATS } from '../data/insights';

export class DemoInsightRepository implements IInsightRepository {
  private insights: Insight[] = [...DEMO_INSIGHTS];
  private callAnalyses: Map<string, CallAnalysis> = new Map(DEMO_CALL_ANALYSES);

  async findAll(params: InsightQueryParams): Promise<PaginatedResult<Insight>> {
    let filtered = [...this.insights];

    if (params.filters?.fromDate) {
      const from = new Date(params.filters.fromDate);
      filtered = filtered.filter(i => new Date(i.createdDate) >= from);
    }
    if (params.filters?.toDate) {
      const to = new Date(params.filters.toDate + 'T23:59:59Z');
      filtered = filtered.filter(i => new Date(i.createdDate) <= to);
    }
    if (params.filters?.agentId) {
      filtered = filtered.filter(i => i.agentId === params.filters!.agentId);
    }
    if (params.filters?.insightType) {
      filtered = filtered.filter(i => i.type === params.filters!.insightType);
    }
    if (params.filters?.minConfidence) {
      filtered = filtered.filter(i => i.confidence >= params.filters!.minConfidence!);
    }
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(searchLower) ||
        i.content.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    const totalCount = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const paginated = filtered.slice(start, start + params.pageSize);

    return {
      items: paginated,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<Insight | null> {
    return this.insights.find(i => i.id === id) || null;
  }

  async findByCallLogId(callLogId: string): Promise<Insight[]> {
    return this.insights.filter(i => i.callLogId === callLogId);
  }

  async findByAgentId(agentId: string, params: InsightQueryParams): Promise<PaginatedResult<Insight>> {
    return this.findAll({ ...params, filters: { ...params.filters, agentId } });
  }

  async getCallAnalysis(callLogId: string): Promise<CallAnalysis | null> {
    return this.callAnalyses.get(callLogId) || null;
  }

  async searchTranscripts(searchTerm: string, params: InsightQueryParams): Promise<PaginatedResult<Insight>> {
    return this.findAll({ ...params, search: searchTerm });
  }

  async getStats(fromDate: string, toDate: string): Promise<InsightStats> {
    // Return demo stats, filtered by date range in a real implementation
    return { ...DEMO_INSIGHT_STATS };
  }

  async getSentimentDistribution(fromDate: string, toDate: string): Promise<Map<SentimentScore, number>> {
    const distribution = new Map<SentimentScore, number>();
    distribution.set('positive', DEMO_INSIGHT_STATS.sentimentDistribution.positive);
    distribution.set('neutral', DEMO_INSIGHT_STATS.sentimentDistribution.neutral);
    distribution.set('negative', DEMO_INSIGHT_STATS.sentimentDistribution.negative);
    return distribution;
  }

  async getCountByType(fromDate: string, toDate: string): Promise<Map<InsightType, number>> {
    const counts = new Map<InsightType, number>();
    for (const insight of this.insights) {
      const count = counts.get(insight.type) || 0;
      counts.set(insight.type, count + 1);
    }
    return counts;
  }

  async getTopTopics(fromDate: string, toDate: string, limit = 10): Promise<Array<{ name: string; count: number }>> {
    return DEMO_INSIGHT_STATS.topTopics.slice(0, limit);
  }

  async getAgentMetrics(agentId: string, fromDate: string, toDate: string): Promise<{
    averageSentiment: number;
    callsAnalyzed: number;
    coachingSuggestionsCount: number;
    topStrengths: string[];
    areasForImprovement: string[];
  }> {
    const agentInsights = this.insights.filter(i => i.agentId === agentId);

    return {
      averageSentiment: 0.68,
      callsAnalyzed: agentInsights.length,
      coachingSuggestionsCount: agentInsights.filter(i => i.type === 'coaching').length,
      topStrengths: ['Clear communication', 'Product knowledge', 'Customer empathy'],
      areasForImprovement: ['Call efficiency', 'Upselling opportunities'],
    };
  }

  // =========================================================================
  // Filter View Operations
  // =========================================================================

  private filterViews: import('$lib/repositories/insight.repository').FilterView[] = [
    {
      id: 'demo-view-1',
      name: 'Negative Calls',
      columns: ['name', 'timestamp', 'agentName', 'sentiment', 'summary'],
      filters: { sentiment: 'negative' },
      isDefault: false,
      createdDate: '2026-01-01T00:00:00Z',
      isOwner: true,
    },
    {
      id: 'demo-view-2',
      name: 'Recent Calls',
      columns: ['name', 'timestamp', 'phoneNumber', 'direction', 'duration', 'sentiment', 'summary'],
      filters: {},
      isDefault: true,
      createdDate: '2026-01-02T00:00:00Z',
      isOwner: true,
    },
  ];

  async getFilterViews(): Promise<import('$lib/repositories/insight.repository').FilterView[]> {
    return [...this.filterViews];
  }

  async saveFilterView(view: import('$lib/repositories/insight.repository').SaveFilterViewInput): Promise<{ id: string }> {
    if (view.id && view.id !== '0') {
      const index = this.filterViews.findIndex(v => v.id === view.id);
      if (index !== -1) {
        this.filterViews[index] = {
          ...this.filterViews[index],
          name: view.name,
          columns: view.columns,
          filters: view.filters,
          isDefault: view.isDefault,
        };
        return { id: view.id };
      }
    }

    const newId = `demo-view-${Date.now()}`;
    this.filterViews.push({
      id: newId,
      name: view.name,
      columns: view.columns,
      filters: view.filters,
      isDefault: view.isDefault,
      createdDate: new Date().toISOString(),
      isOwner: true,
    });
    return { id: newId };
  }

  async deleteFilterView(viewId: string): Promise<void> {
    const index = this.filterViews.findIndex(v => v.id === viewId);
    if (index !== -1) {
      this.filterViews.splice(index, 1);
    }
  }

  // =========================================================================
  // Advanced Search Operations
  // =========================================================================

  private demoResults: import('$lib/repositories/insight.repository').AIInsightSearchItem[] = [
    {
      id: 'tr-001',
      name: 'AI-00001234',
      uuid: 'uuid-001',
      phoneNumber: '+1 555 0100',
      direction: 'Inbound',
      duration: 245,
      timestamp: '2026-01-07T10:30:00Z',
      summary: 'Customer reported billing issue resolved successfully',
      sentiment: 'positive',
      sentimentScore: 85,
      agentName: 'John Smith',
      groupName: 'Support',
      status: 'Completed',
    },
    {
      id: 'tr-002',
      name: 'AI-00001233',
      uuid: 'uuid-002',
      phoneNumber: '+1 555 0200',
      direction: 'Inbound',
      duration: 380,
      timestamp: '2026-01-07T09:15:00Z',
      summary: 'API integration support - timeout issue resolved',
      sentiment: 'neutral',
      sentimentScore: 58,
      agentName: 'Sarah Johnson',
      groupName: 'Support',
      status: 'Completed',
    },
    {
      id: 'tr-003',
      name: 'AI-00001232',
      uuid: 'uuid-003',
      phoneNumber: '+1 555 0300',
      direction: 'Outbound',
      duration: 180,
      timestamp: '2026-01-06T16:45:00Z',
      summary: 'Escalated support issue - customer frustrated',
      sentiment: 'negative',
      sentimentScore: 28,
      agentName: 'Mike Williams',
      groupName: 'Support',
      status: 'Completed',
    },
    {
      id: 'tr-004',
      name: 'AI-00001231',
      uuid: 'uuid-004',
      phoneNumber: '+1 555 0400',
      direction: 'Inbound',
      duration: 312,
      timestamp: '2026-01-06T14:20:00Z',
      summary: 'Successful onboarding - happy customer',
      sentiment: 'positive',
      sentimentScore: 94,
      agentName: 'Emily Davis',
      groupName: 'Onboarding',
      status: 'Completed',
    },
    {
      id: 'tr-005',
      name: 'AI-00001230',
      uuid: 'uuid-005',
      phoneNumber: '+1 555 0500',
      direction: 'Inbound',
      duration: 156,
      timestamp: '2026-01-06T11:00:00Z',
      summary: 'Billing inquiry - usage charges explained',
      sentiment: 'neutral',
      sentimentScore: 52,
      agentName: 'John Smith',
      groupName: 'Billing',
      status: 'Processing',
    },
  ];

  async searchAIInsights(
    filters: import('$lib/repositories/insight.repository').AIInsightSearchFilters
  ): Promise<import('$lib/repositories/insight.repository').AIInsightSearchResult> {
    let filtered = [...this.demoResults];

    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q) ||
        r.phoneNumber?.toLowerCase().includes(q)
      );
    }

    if (filters.sentiment) {
      filtered = filtered.filter(r => r.sentiment === filters.sentiment);
    }

    const total = filtered.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    const results = filtered.slice(offset, offset + limit);

    return { results, total };
  }
}
