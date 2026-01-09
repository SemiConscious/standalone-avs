/**
 * Insights Search Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import type { PageServerLoad, Actions } from './$types';
import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import { fail } from '@sveltejs/kit';

// ============================================================
// Types
// ============================================================

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
// Column Definitions
// ============================================================

const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'ID', default: true, sortable: true },
  { key: 'timestamp', label: 'Date/Time', default: true, sortable: true },
  { key: 'phoneNumber', label: 'Phone Number', default: true, sortable: false },
  { key: 'direction', label: 'Direction', default: true, sortable: true },
  { key: 'duration', label: 'Duration', default: true, sortable: true },
  { key: 'sentiment', label: 'Sentiment', default: true, sortable: true },
  { key: 'summary', label: 'Summary', default: true, sortable: false },
  { key: 'agentName', label: 'Agent', default: false, sortable: true },
  { key: 'groupName', label: 'Group', default: false, sortable: true },
  { key: 'status', label: 'Status', default: false, sortable: true },
];

const DEFAULT_COLUMNS = ['name', 'timestamp', 'phoneNumber', 'direction', 'duration', 'sentiment', 'summary'];

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

  // Check authentication using repository pattern
  const ctxResult = tryCreateContextAndRepositories(locals);
  
  if (!ctxResult) {
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

  const { repos, isDemo } = ctxResult;

  // Demo mode - use repository demo data
  if (isDemo) {
    const searchResult = await repos.insights.searchAIInsights(filters);
    const filterViews = await repos.insights.getFilterViews();

    return {
      results: searchResult.results,
      total: searchResult.total,
      filters,
      columns,
      availableColumns: AVAILABLE_COLUMNS,
      filterViews: filterViews.map(v => ({
        ...v,
        filters: v.filters as TranscriptSearchFilters,
      })),
      selectedViewId,
      facets: {
        sentiments: { positive: 2, neutral: 2, negative: 1 },
        agents: { 'John Smith': 2, 'Sarah Johnson': 1, 'Mike Williams': 1, 'Emily Davis': 1 },
      },
      isDemo: true,
    } satisfies SearchPageData;
  }

  try {
    // Load filter views using repository
    const filterViews = await repos.insights.getFilterViews();

    // Apply view filters if a view is selected
    let appliedFilters = { ...filters };
    if (selectedViewId) {
      const selectedView = filterViews.find(v => v.id === selectedViewId);
      if (selectedView) {
        appliedFilters = { ...appliedFilters, ...(selectedView.filters as TranscriptSearchFilters) };
      }
    }

    // Search insights using repository
    const searchResult = await repos.insights.searchAIInsights(appliedFilters);

    // Build facets from results
    const sentimentCounts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    const agentCounts: Record<string, number> = {};
    
    for (const result of searchResult.results) {
      sentimentCounts[result.sentiment] = (sentimentCounts[result.sentiment] || 0) + 1;
      if (result.agentName) {
        agentCounts[result.agentName] = (agentCounts[result.agentName] || 0) + 1;
      }
    }

    return {
      results: searchResult.results,
      total: searchResult.total,
      filters: appliedFilters,
      columns,
      availableColumns: AVAILABLE_COLUMNS,
      filterViews: filterViews.map(v => ({
        ...v,
        filters: v.filters as TranscriptSearchFilters,
      })),
      selectedViewId,
      facets: {
        sentiments: sentimentCounts,
        agents: agentCounts,
      },
      isDemo: false,
    } satisfies SearchPageData;
  } catch (error) {
    console.error('Failed to search insights:', error);
    return {
      results: [],
      total: 0,
      filters,
      columns: DEFAULT_COLUMNS,
      availableColumns: AVAILABLE_COLUMNS,
      filterViews: [],
      selectedViewId: null,
      isDemo: false,
      error: error instanceof Error ? error.message : 'Failed to search insights',
    } satisfies SearchPageData;
  }
};

// ============================================================
// Actions
// ============================================================

export const actions: Actions = {
  saveView: async ({ request, locals }) => {
    const ctxResult = tryCreateContextAndRepositories(locals);
    if (!ctxResult) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos, isDemo } = ctxResult;

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
      let parsedColumns: string[];
      let parsedFilters: Record<string, unknown>;

      try {
        parsedColumns = columns ? JSON.parse(columns) : DEFAULT_COLUMNS;
      } catch {
        parsedColumns = DEFAULT_COLUMNS;
      }

      try {
        parsedFilters = filters ? JSON.parse(filters) : {};
      } catch {
        parsedFilters = {};
      }

      const result = await repos.insights.saveFilterView({
        id: viewId && viewId !== '0' ? viewId : undefined,
        name: viewName.trim(),
        columns: parsedColumns,
        filters: parsedFilters,
        isDefault,
      });

      return { 
        success: true, 
        message: viewId && viewId !== '0' ? 'View updated successfully' : 'View saved successfully', 
        viewId: result.id 
      };
    } catch (e) {
      console.error('Failed to save filter view:', e);
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to save view' });
    }
  },

  deleteView: async ({ request, locals }) => {
    const ctxResult = tryCreateContextAndRepositories(locals);
    if (!ctxResult) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { repos } = ctxResult;

    const formData = await request.formData();
    const viewId = formData.get('viewId') as string;

    if (!viewId) {
      return fail(400, { error: 'View ID is required' });
    }

    try {
      await repos.insights.deleteFilterView(viewId);
      return { success: true, message: 'View deleted successfully' };
    } catch (e) {
      console.error('Failed to delete filter view:', e);
      if (e instanceof Error && e.message.includes('not found')) {
        return fail(404, { error: 'View not found' });
      }
      if (e instanceof Error && e.message.includes('only delete')) {
        return fail(403, { error: e.message });
      }
      return fail(500, { error: e instanceof Error ? e.message : 'Failed to delete view' });
    }
  },
};
