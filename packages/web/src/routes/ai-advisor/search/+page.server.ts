import type { PageServerLoad, Actions } from './$types';
import { hasValidCredentials } from '$lib/server/salesforce';
import { getSapienJwt, getSapienConfig } from '$lib/server/sapien';
import { 
  searchTranscripts, 
  type TranscriptSearchFilters,
  type TranscriptResult,
} from '$lib/server/insights';
import { env } from '$env/dynamic/private';
import { fail } from '@sveltejs/kit';

// Demo data
const DEMO_RESULTS: TranscriptResult[] = [
  {
    id: 'tr-001',
    callId: 'call-001',
    phoneNumber: '+1 555 0100',
    direction: 'inbound',
    duration: 245,
    timestamp: '2026-01-07T10:30:00Z',
    transcript: 'Customer inquired about enterprise pricing. Discussed feature comparison with competitors. Scheduled follow-up demo for next week.',
    summary: 'Enterprise pricing inquiry with competitive analysis',
    sentiment: 'positive',
    sentimentScore: 82,
    topics: ['pricing', 'enterprise', 'demo'],
    agentName: 'John Smith',
    highlights: ['enterprise pricing', 'follow-up demo'],
  },
  {
    id: 'tr-002',
    callId: 'call-002',
    phoneNumber: '+1 555 0200',
    direction: 'inbound',
    duration: 420,
    timestamp: '2026-01-07T09:15:00Z',
    transcript: 'Technical support call regarding API integration issues. Customer experiencing timeout errors. Identified configuration problem and provided solution.',
    summary: 'API integration support - timeout issue resolved',
    sentiment: 'neutral',
    sentimentScore: 58,
    topics: ['support', 'API', 'integration'],
    agentName: 'Sarah Johnson',
    highlights: ['API integration', 'timeout errors', 'configuration'],
  },
  {
    id: 'tr-003',
    callId: 'call-003',
    phoneNumber: '+1 555 0300',
    direction: 'outbound',
    duration: 180,
    timestamp: '2026-01-06T16:45:00Z',
    transcript: 'Follow-up call about recent support ticket. Customer still experiencing issues. Escalated to engineering team for investigation.',
    summary: 'Escalated support issue - customer frustrated',
    sentiment: 'negative',
    sentimentScore: 28,
    topics: ['escalation', 'support'],
    agentName: 'Mike Williams',
    highlights: ['escalated', 'still experiencing issues'],
  },
  {
    id: 'tr-004',
    callId: 'call-004',
    phoneNumber: '+1 555 0400',
    direction: 'inbound',
    duration: 312,
    timestamp: '2026-01-06T14:20:00Z',
    transcript: 'New customer onboarding call. Walked through account setup and main features. Customer very satisfied with the platform.',
    summary: 'Successful onboarding - happy customer',
    sentiment: 'positive',
    sentimentScore: 94,
    topics: ['onboarding', 'training'],
    agentName: 'Emily Davis',
    highlights: ['account setup', 'very satisfied'],
  },
  {
    id: 'tr-005',
    callId: 'call-005',
    phoneNumber: '+1 555 0500',
    direction: 'inbound',
    duration: 156,
    timestamp: '2026-01-06T11:00:00Z',
    transcript: 'Billing inquiry about recent invoice. Customer had questions about usage charges. Explained billing methodology.',
    summary: 'Billing inquiry - usage charges explained',
    sentiment: 'neutral',
    sentimentScore: 52,
    topics: ['billing', 'invoice'],
    agentName: 'John Smith',
    highlights: ['invoice', 'usage charges'],
  },
];

export interface SearchPageData {
  results: TranscriptResult[];
  total: number;
  filters: TranscriptSearchFilters;
  facets?: {
    sentiments?: Record<string, number>;
    topics?: Record<string, number>;
    agents?: Record<string, number>;
  };
  isDemo: boolean;
  error?: string;
}

export const load: PageServerLoad = async ({ url, locals }) => {
  // Parse search params
  const filters: TranscriptSearchFilters = {
    query: url.searchParams.get('q') || undefined,
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    sentiment: (url.searchParams.get('sentiment') as TranscriptSearchFilters['sentiment']) || undefined,
    topics: url.searchParams.get('topics')?.split(',').filter(Boolean) || undefined,
    limit: parseInt(url.searchParams.get('limit') || '20'),
    offset: parseInt(url.searchParams.get('offset') || '0'),
  };

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    let filteredResults = [...DEMO_RESULTS];

    // Apply filters to demo data
    if (filters.query) {
      const q = filters.query.toLowerCase();
      filteredResults = filteredResults.filter(r => 
        r.transcript.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q) ||
        r.topics?.some(t => t.toLowerCase().includes(q))
      );
    }

    if (filters.sentiment) {
      filteredResults = filteredResults.filter(r => r.sentiment === filters.sentiment);
    }

    if (filters.topics?.length) {
      filteredResults = filteredResults.filter(r =>
        r.topics?.some(t => filters.topics?.includes(t))
      );
    }

    return {
      results: filteredResults.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20)),
      total: filteredResults.length,
      filters,
      facets: {
        sentiments: { positive: 2, neutral: 2, negative: 1 },
        topics: { pricing: 1, support: 2, billing: 1, onboarding: 1, integration: 1 },
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
      isDemo: false,
      error: 'Not authenticated',
    } satisfies SearchPageData;
  }

  try {
    // Get Sapien JWT and config
    const sapienConfig = getSapienConfig();
    const jwt = await getSapienJwt();
    
    const insightsHost = env.INSIGHTS_HOST || sapienConfig?.host;
    if (!insightsHost) {
      throw new Error('Insights API host not configured');
    }

    const orgId = sapienConfig?.organizationId;
    if (!orgId) {
      throw new Error('Organization ID not configured');
    }

    const response = await searchTranscripts(insightsHost, jwt, orgId, filters);

    return {
      results: response.results,
      total: response.total,
      filters,
      facets: response.facets,
      isDemo: false,
    } satisfies SearchPageData;
  } catch (e) {
    console.error('Failed to search transcripts:', e);
    return {
      results: [],
      total: 0,
      filters,
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to search transcripts',
    } satisfies SearchPageData;
  }
};

export const actions: Actions = {
  search: async ({ request, url }) => {
    const formData = await request.formData();
    const query = formData.get('query') as string;
    const sentiment = formData.get('sentiment') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const topics = formData.get('topics') as string;

    // Build search URL with params
    const searchParams = new URLSearchParams();
    if (query) searchParams.set('q', query);
    if (sentiment && sentiment !== 'all') searchParams.set('sentiment', sentiment);
    if (startDate) searchParams.set('startDate', startDate);
    if (endDate) searchParams.set('endDate', endDate);
    if (topics) searchParams.set('topics', topics);

    return { redirect: `/ai-advisor/search?${searchParams.toString()}` };
  },
};

