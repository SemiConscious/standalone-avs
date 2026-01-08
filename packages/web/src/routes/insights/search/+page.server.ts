import type { PageServerLoad, Actions } from './$types';
import { querySalesforce, hasValidCredentials, createSalesforce, updateSalesforce, deleteSalesforce } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

const NAMESPACE = 'nbavs__';

// ============================================================
// Types
// ============================================================

interface SalesforceFilterView {
  Id: string;
  Name: string;
  nbavs__ViewName__c: string;
  nbavs__ViewColumns__c: string;
  nbavs__ViewFilters__c: string;
  nbavs__Default__c: boolean;
  nbavs__Application__c: string;
  nbavs__CreatedByNatterboxUser__c: string;
  CreatedById: string;
  CreatedDate: string;
}

interface SalesforceUser {
  Id: string;
}

interface SalesforceNatterboxAI {
  Id: string;
  Name: string;
  nbavs__UUID__c: string;
  nbavs__StartTime__c: string;
  nbavs__Number__c: string;
  nbavs__Summary__c: string;
  nbavs__OverallRating__c: number;
  nbavs__ChannelDuration__c: number;
  nbavs__AIAnalysisStatus__c: string;
  nbavs__NatterboxUser__r?: { Name: string };
  nbavs__Group__r?: { Name: string };
  nbavs__CRO__r?: { nbavs__Call_Direction__c: string };
  CreatedDate: string;
}

export interface TranscriptSearchFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  agentId?: string;
  groupId?: string;
  limit?: number;
  offset?: number;
}

export interface InsightResult {
  id: string;
  name: string;
  uuid: string;
  phoneNumber: string;
  direction: string;
  duration: number;
  timestamp: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  agentName: string;
  groupName: string;
  status: string;
}

export interface FilterView {
  id: string;
  name: string;
  columns: string[];
  filters: TranscriptSearchFilters;
  isDefault: boolean;
  createdDate: string;
  isOwner: boolean;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  default: boolean;
  sortable: boolean;
}

export interface SearchPageData {
  results: InsightResult[];
  total: number;
  filters: TranscriptSearchFilters;
  columns: string[];
  availableColumns: ColumnDefinition[];
  filterViews: FilterView[];
  selectedViewId: string | null;
  facets?: {
    sentiments?: Record<string, number>;
    agents?: Record<string, number>;
  };
  isDemo: boolean;
  error?: string;
}

// ============================================================
// Constants
// ============================================================

const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Name', default: true, sortable: true },
  { key: 'timestamp', label: 'Date/Time', default: true, sortable: true },
  { key: 'agentName', label: 'Agent', default: true, sortable: true },
  { key: 'phoneNumber', label: 'Phone Number', default: true, sortable: false },
  { key: 'direction', label: 'Direction', default: true, sortable: true },
  { key: 'duration', label: 'Duration', default: true, sortable: true },
  { key: 'sentiment', label: 'Sentiment', default: true, sortable: true },
  { key: 'sentimentScore', label: 'Score', default: false, sortable: true },
  { key: 'summary', label: 'Summary', default: true, sortable: false },
  { key: 'groupName', label: 'Group', default: false, sortable: true },
  { key: 'status', label: 'Status', default: false, sortable: true },
];

const DEFAULT_COLUMNS = AVAILABLE_COLUMNS.filter(c => c.default).map(c => c.key);

// Demo data
const DEMO_RESULTS: InsightResult[] = [
  {
    id: 'tr-001',
    name: 'AI-00001234',
    uuid: 'uuid-001',
    phoneNumber: '+1 555 0100',
    direction: 'Inbound',
    duration: 245,
    timestamp: '2026-01-07T10:30:00Z',
    summary: 'Enterprise pricing inquiry with competitive analysis',
    sentiment: 'positive',
    sentimentScore: 82,
    agentName: 'John Smith',
    groupName: 'Sales',
    status: 'Completed',
  },
  {
    id: 'tr-002',
    name: 'AI-00001233',
    uuid: 'uuid-002',
    phoneNumber: '+1 555 0200',
    direction: 'Inbound',
    duration: 420,
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

const DEMO_FILTER_VIEWS: FilterView[] = [
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
    columns: DEFAULT_COLUMNS,
    filters: {},
    isDefault: true,
    createdDate: '2026-01-02T00:00:00Z',
    isOwner: true,
  },
];

// ============================================================
// Salesforce Query Helpers
// ============================================================

function getSentimentFromRating(rating: number): 'positive' | 'neutral' | 'negative' {
  if (rating >= 4) return 'positive';
  if (rating >= 2.5) return 'neutral';
  return 'negative';
}

function getScoreFromRating(rating: number): number {
  return Math.round((rating / 5) * 100);
}

async function getCurrentUserId(instanceUrl: string, accessToken: string): Promise<string> {
  const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to get user info');
  const data = await response.json();
  return data.user_id;
}

async function getNatterboxUserId(instanceUrl: string, accessToken: string): Promise<string | null> {
  try {
    const sfUserId = await getCurrentUserId(instanceUrl, accessToken);
    const soql = `SELECT Id FROM ${NAMESPACE}User__c WHERE ${NAMESPACE}User__c = '${sfUserId}' LIMIT 1`;
    const result = await querySalesforce<SalesforceUser>(instanceUrl, accessToken, soql);
    return result.records.length > 0 ? result.records[0].Id : null;
  } catch (e) {
    console.warn('Failed to get Natterbox user ID:', e);
    return null;
  }
}

async function loadFilterViews(
  instanceUrl: string,
  accessToken: string
): Promise<FilterView[]> {
  try {
    const sfUserId = await getCurrentUserId(instanceUrl, accessToken);
    
    const soql = `
      SELECT Id, Name, ${NAMESPACE}ViewName__c, ${NAMESPACE}ViewColumns__c, 
             ${NAMESPACE}ViewFilters__c, ${NAMESPACE}Default__c, CreatedById, CreatedDate
      FROM ${NAMESPACE}FilterView__c
      WHERE ${NAMESPACE}Application__c = 'NatterboxAI'
      AND CreatedById = '${sfUserId}'
      ORDER BY ${NAMESPACE}Default__c DESC, CreatedDate DESC
      LIMIT 50
    `;
    
    const result = await querySalesforce<SalesforceFilterView>(instanceUrl, accessToken, soql);
    
    return result.records.map(fv => {
      let columns = DEFAULT_COLUMNS;
      let filters: TranscriptSearchFilters = {};
      
      try {
        if (fv[`${NAMESPACE}ViewColumns__c`]) {
          columns = JSON.parse(fv[`${NAMESPACE}ViewColumns__c`]);
        }
      } catch (e) {
        console.warn('Failed to parse columns:', e);
      }
      
      try {
        if (fv[`${NAMESPACE}ViewFilters__c`]) {
          filters = JSON.parse(fv[`${NAMESPACE}ViewFilters__c`]);
        }
      } catch (e) {
        console.warn('Failed to parse filters:', e);
      }
      
      return {
        id: fv.Id,
        name: fv[`${NAMESPACE}ViewName__c`] || fv.Name || 'Unnamed View',
        columns,
        filters,
        isDefault: fv[`${NAMESPACE}Default__c`] || false,
        createdDate: fv.CreatedDate,
        isOwner: fv.CreatedById === sfUserId,
      };
    });
  } catch (e) {
    console.warn('Failed to load filter views:', e);
    return [];
  }
}

async function searchInsights(
  instanceUrl: string,
  accessToken: string,
  filters: TranscriptSearchFilters
): Promise<{ results: InsightResult[]; total: number }> {
  // Build WHERE clause
  const whereClauses: string[] = [];
  
  if (filters.query) {
    // Search in Name and Number only (Summary is Long Text Area and cannot be filtered)
    const searchTerm = filters.query.replace(/'/g, "\\'");
    whereClauses.push(`(Name LIKE '%${searchTerm}%' OR ${NAMESPACE}Number__c LIKE '%${searchTerm}%')`);
  }
  
  if (filters.startDate) {
    whereClauses.push(`CreatedDate >= ${filters.startDate}T00:00:00Z`);
  }
  
  if (filters.endDate) {
    whereClauses.push(`CreatedDate <= ${filters.endDate}T23:59:59Z`);
  }
  
  if (filters.sentiment) {
    // Map sentiment to rating ranges
    switch (filters.sentiment) {
      case 'positive':
        whereClauses.push(`${NAMESPACE}OverallRating__c >= 4`);
        break;
      case 'negative':
        whereClauses.push(`${NAMESPACE}OverallRating__c < 2.5`);
        break;
      case 'neutral':
        whereClauses.push(`${NAMESPACE}OverallRating__c >= 2.5`);
        whereClauses.push(`${NAMESPACE}OverallRating__c < 4`);
        break;
    }
  }
  
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  
  // Count query
  const countSoql = `SELECT COUNT() FROM ${NAMESPACE}NatterboxAI__c ${whereClause}`;
  let total = 0;
  try {
    const countResult = await querySalesforce<{ expr0: number }>(instanceUrl, accessToken, countSoql);
    total = countResult.totalSize;
  } catch (e) {
    console.warn('Failed to get count:', e);
  }
  
  // Main query
  const soql = `
    SELECT Id, Name, CreatedDate,
           ${NAMESPACE}UUID__c,
           ${NAMESPACE}StartTime__c,
           ${NAMESPACE}Number__c,
           ${NAMESPACE}Summary__c,
           ${NAMESPACE}OverallRating__c,
           ${NAMESPACE}ChannelDuration__c,
           ${NAMESPACE}AIAnalysisStatus__c,
           ${NAMESPACE}NatterboxUser__r.Name,
           ${NAMESPACE}Group__r.Name,
           ${NAMESPACE}CRO__r.${NAMESPACE}Call_Direction__c
    FROM ${NAMESPACE}NatterboxAI__c
    ${whereClause}
    ORDER BY CreatedDate DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  
  const result = await querySalesforce<SalesforceNatterboxAI>(instanceUrl, accessToken, soql);
  
  const results: InsightResult[] = result.records.map((ai) => {
    const overallRating = ai[`${NAMESPACE}OverallRating__c`] || 0;
    const aiStatus = ai[`${NAMESPACE}AIAnalysisStatus__c`] || '';
    let status = 'Unknown';
    if (aiStatus === 'Complete') status = 'Completed';
    else if (aiStatus === 'Processing' || aiStatus === 'Pending') status = 'Processing';
    else if (aiStatus === 'Error') status = 'Error';
    
    return {
      id: ai.Id,
      name: ai.Name,
      uuid: ai[`${NAMESPACE}UUID__c`] || '',
      phoneNumber: ai[`${NAMESPACE}Number__c`] || '',
      direction: ai[`${NAMESPACE}CRO__r`]?.[`${NAMESPACE}Call_Direction__c`] || 'Unknown',
      duration: ai[`${NAMESPACE}ChannelDuration__c`] || 0,
      timestamp: ai[`${NAMESPACE}StartTime__c`] || ai.CreatedDate,
      summary: ai[`${NAMESPACE}Summary__c`] || 'No summary available',
      sentiment: getSentimentFromRating(overallRating),
      sentimentScore: getScoreFromRating(overallRating),
      agentName: ai[`${NAMESPACE}NatterboxUser__r`]?.Name || 'Unknown',
      groupName: ai[`${NAMESPACE}Group__r`]?.Name || '',
      status,
    };
  });
  
  return { results, total };
}

// ============================================================
// Page Load
// ============================================================

export const load: PageServerLoad = async ({ url, locals }) => {
  // Parse search params
  const filters: TranscriptSearchFilters = {
    query: url.searchParams.get('q') || undefined,
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    sentiment: (url.searchParams.get('sentiment') as TranscriptSearchFilters['sentiment']) || undefined,
    limit: parseInt(url.searchParams.get('limit') || '20'),
    offset: parseInt(url.searchParams.get('offset') || '0'),
  };
  
  // Parse columns from URL or use defaults
  const columnsParam = url.searchParams.get('columns');
  const columns = columnsParam ? columnsParam.split(',').filter(Boolean) : DEFAULT_COLUMNS;
  
  // Parse selected view ID
  const selectedViewId = url.searchParams.get('viewId') || null;

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    let filteredResults = [...DEMO_RESULTS];

    // Apply filters to demo data
    if (filters.query) {
      const q = filters.query.toLowerCase();
      filteredResults = filteredResults.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q) ||
        r.phoneNumber?.toLowerCase().includes(q)
      );
    }

    if (filters.sentiment) {
      filteredResults = filteredResults.filter(r => r.sentiment === filters.sentiment);
    }

    return {
      results: filteredResults.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20)),
      total: filteredResults.length,
      filters,
      columns,
      availableColumns: AVAILABLE_COLUMNS,
      filterViews: DEMO_FILTER_VIEWS,
      selectedViewId,
      facets: {
        sentiments: { positive: 2, neutral: 2, negative: 1 },
        agents: { 'John Smith': 2, 'Sarah Johnson': 1, 'Mike Williams': 1, 'Emily Davis': 1 },
      },
      isDemo: true,
    } satisfies SearchPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      results: [],
      total: 0,
      filters,
      columns: DEFAULT_COLUMNS,
      availableColumns: AVAILABLE_COLUMNS,
      filterViews: [],
      selectedViewId: null,
      isDemo: false,
      error: 'Not authenticated',
    } satisfies SearchPageData;
  }

  // Load filter views
  const filterViews = await loadFilterViews(locals.instanceUrl!, locals.accessToken!);

  try {
    // Query Salesforce directly
    const response = await searchInsights(locals.instanceUrl!, locals.accessToken!, filters);
    
    // Calculate facets from results (simplified)
    const facets: SearchPageData['facets'] = {
      sentiments: { positive: 0, neutral: 0, negative: 0 },
      agents: {},
    };
    
    for (const r of response.results) {
      if (facets.sentiments) {
        facets.sentiments[r.sentiment] = (facets.sentiments[r.sentiment] || 0) + 1;
      }
      if (facets.agents && r.agentName && r.agentName !== 'Unknown') {
        facets.agents[r.agentName] = (facets.agents[r.agentName] || 0) + 1;
      }
    }

    return {
      results: response.results,
      total: response.total,
      filters,
      columns,
      availableColumns: AVAILABLE_COLUMNS,
      filterViews,
      selectedViewId,
      facets,
      isDemo: false,
    } satisfies SearchPageData;
  } catch (e) {
    console.error('Failed to search insights:', e);
    return {
      results: [],
      total: 0,
      filters,
      columns,
      availableColumns: AVAILABLE_COLUMNS,
      filterViews,
      selectedViewId,
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to search insights',
    } satisfies SearchPageData;
  }
};

// ============================================================
// Actions
// ============================================================

export const actions: Actions = {
  search: async ({ request }) => {
    const formData = await request.formData();
    const query = formData.get('query') as string;
    const sentiment = formData.get('sentiment') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    // Build search URL with params
    const searchParams = new URLSearchParams();
    if (query) searchParams.set('q', query);
    if (sentiment && sentiment !== 'all') searchParams.set('sentiment', sentiment);
    if (startDate) searchParams.set('startDate', startDate);
    if (endDate) searchParams.set('endDate', endDate);

    return { redirect: `/insights/search?${searchParams.toString()}` };
  },

  saveView: async ({ request, locals }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const viewName = formData.get('viewName') as string;
    const viewId = formData.get('viewId') as string;
    const columns = formData.get('columns') as string;
    const filters = formData.get('filters') as string;
    const isDefault = formData.get('isDefault') === 'true';

    if (!viewName?.trim()) {
      return fail(400, { error: 'View name is required' });
    }

    try {
      const nbUserId = await getNatterboxUserId(locals.instanceUrl!, locals.accessToken!);
      
      // If setting as default, first unset any existing default
      if (isDefault) {
        const existingDefaults = await querySalesforce<SalesforceFilterView>(
          locals.instanceUrl!,
          locals.accessToken!,
          `SELECT Id FROM ${NAMESPACE}FilterView__c 
           WHERE ${NAMESPACE}Application__c = 'NatterboxAI' 
           AND ${NAMESPACE}Default__c = true 
           AND Id != '${viewId || ''}'`
        );
        
        for (const fv of existingDefaults.records) {
          await updateSalesforce(
            locals.instanceUrl!,
            locals.accessToken!,
            `${NAMESPACE}FilterView__c`,
            fv.Id,
            { [`${NAMESPACE}Default__c`]: false }
          );
        }
      }

      const viewData = {
        [`${NAMESPACE}ViewName__c`]: viewName.trim(),
        [`${NAMESPACE}ViewColumns__c`]: columns || JSON.stringify(DEFAULT_COLUMNS),
        [`${NAMESPACE}ViewFilters__c`]: filters || '{}',
        [`${NAMESPACE}Default__c`]: isDefault,
        [`${NAMESPACE}Application__c`]: 'NatterboxAI',
        ...(nbUserId ? { [`${NAMESPACE}CreatedByNatterboxUser__c`]: nbUserId } : {}),
      };

      if (viewId && viewId !== '0') {
        // Update existing view
        await updateSalesforce(
          locals.instanceUrl!,
          locals.accessToken!,
          `${NAMESPACE}FilterView__c`,
          viewId,
          viewData
        );
        return { success: true, message: 'View updated successfully', viewId };
      } else {
        // Create new view
        const result = await createSalesforce(
          locals.instanceUrl!,
          locals.accessToken!,
          `${NAMESPACE}FilterView__c`,
          viewData
        );
        return { success: true, message: 'View saved successfully', viewId: result.id };
      }
    } catch (e) {
      console.error('Failed to save filter view:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to save view' });
    }
  },

  deleteView: async ({ request, locals }) => {
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    const formData = await request.formData();
    const viewId = formData.get('viewId') as string;

    if (!viewId) {
      return fail(400, { error: 'View ID is required' });
    }

    try {
      // Verify ownership
      const sfUserId = await getCurrentUserId(locals.instanceUrl!, locals.accessToken!);
      const result = await querySalesforce<SalesforceFilterView>(
        locals.instanceUrl!,
        locals.accessToken!,
        `SELECT Id, CreatedById FROM ${NAMESPACE}FilterView__c WHERE Id = '${viewId}'`
      );

      if (result.records.length === 0) {
        return fail(404, { error: 'View not found' });
      }

      if (result.records[0].CreatedById !== sfUserId) {
        return fail(403, { error: 'You can only delete views you created' });
      }

      await deleteSalesforce(
        locals.instanceUrl!,
        locals.accessToken!,
        `${NAMESPACE}FilterView__c`,
        viewId
      );

      return { success: true, message: 'View deleted successfully' };
    } catch (e) {
      console.error('Failed to delete filter view:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to delete view' });
    }
  },
};
