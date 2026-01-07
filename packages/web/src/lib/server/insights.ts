/**
 * Insights API Service
 * 
 * This service handles interactions with the Sapien Insights/Search API
 * for call transcript searching, sentiment analysis, and AI-powered insights.
 */

import { env } from '$env/dynamic/private';

// API Host from environment
const INSIGHTS_HOST = env.INSIGHTS_HOST || env.SAPIEN_HOST;

// ============================================================
// Types
// ============================================================

/**
 * Search filters for transcript search
 */
export interface TranscriptSearchFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  minScore?: number;
  maxScore?: number;
  agents?: string[];
  topics?: string[];
  policyIds?: number[];
  phoneNumbers?: string[];
  limit?: number;
  offset?: number;
}

/**
 * A transcript result from search
 */
export interface TranscriptResult {
  id: string;
  callId: string;
  phoneNumber?: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  timestamp: string;
  transcript: string;
  summary?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  topics?: string[];
  agentId?: string;
  agentName?: string;
  policyId?: number;
  highlights?: string[];
}

/**
 * Search response with pagination
 */
export interface TranscriptSearchResponse {
  results: TranscriptResult[];
  total: number;
  offset: number;
  limit: number;
  facets?: {
    sentiments?: Record<string, number>;
    topics?: Record<string, number>;
    agents?: Record<string, number>;
  };
}

/**
 * Insight configuration for AI analysis
 */
export interface InsightConfiguration {
  id: string;
  name: string;
  type: 'sentiment' | 'topic' | 'keyword' | 'custom';
  enabled: boolean;
  config: Record<string, unknown>;
  organizationId: number;
}

/**
 * Transcript detail with full analysis
 */
export interface TranscriptDetail extends TranscriptResult {
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: string;
  }>;
  speakers?: Array<{
    id: string;
    name?: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }>;
  keyPhrases?: string[];
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  customInsights?: Record<string, unknown>;
}

// ============================================================
// Search Functions
// ============================================================

/**
 * Search transcripts
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param filters - Search filters
 * @returns Search results with pagination
 */
export async function searchTranscripts(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  filters: TranscriptSearchFilters = {}
): Promise<TranscriptSearchResponse> {
  const url = new URL(`${insightsHost}/v1/insights/${organizationId}/transcripts/search`);
  
  // Build query parameters
  const params: Record<string, string> = {};
  if (filters.query) params.q = filters.query;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.sentiment) params.sentiment = filters.sentiment;
  if (filters.minScore !== undefined) params.minScore = String(filters.minScore);
  if (filters.maxScore !== undefined) params.maxScore = String(filters.maxScore);
  if (filters.agents?.length) params.agents = filters.agents.join(',');
  if (filters.topics?.length) params.topics = filters.topics.join(',');
  if (filters.policyIds?.length) params.policyIds = filters.policyIds.join(',');
  if (filters.phoneNumbers?.length) params.phoneNumbers = filters.phoneNumbers.join(',');
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.offset) params.offset = String(filters.offset);

  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  console.log(`[Insights API] Searching transcripts for org ${organizationId}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to search transcripts: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Insights API] Found ${data.total || 0} transcripts`);
  return data;
}

/**
 * Get transcript detail by ID
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param transcriptId - Transcript ID
 * @returns Full transcript detail
 */
export async function getTranscriptDetail(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  transcriptId: string
): Promise<TranscriptDetail> {
  const url = `${insightsHost}/v1/insights/${organizationId}/transcripts/${transcriptId}`;

  console.log(`[Insights API] Fetching transcript ${transcriptId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to get transcript: ${errorText}`);
  }

  return response.json();
}

/**
 * Get transcript by call ID
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param callId - Call ID
 * @returns Full transcript detail or null if not found
 */
export async function getTranscriptByCallId(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  callId: string
): Promise<TranscriptDetail | null> {
  const url = `${insightsHost}/v1/insights/${organizationId}/calls/${callId}/transcript`;

  console.log(`[Insights API] Fetching transcript for call ${callId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to get transcript: ${errorText}`);
  }

  return response.json();
}

// ============================================================
// Configuration Functions
// ============================================================

/**
 * Get insight configurations
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @returns Array of insight configurations
 */
export async function getInsightConfigurations(
  insightsHost: string,
  jwt: string,
  organizationId: number
): Promise<InsightConfiguration[]> {
  const url = `${insightsHost}/v1/insights/${organizationId}/configurations`;

  console.log(`[Insights API] Fetching configurations for org ${organizationId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to get configurations: ${errorText}`);
  }

  return response.json();
}

/**
 * Create insight configuration
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param configuration - Configuration to create
 * @returns Created configuration
 */
export async function createInsightConfiguration(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  configuration: Omit<InsightConfiguration, 'id' | 'organizationId'>
): Promise<InsightConfiguration> {
  const url = `${insightsHost}/v1/insights/${organizationId}/configurations`;

  console.log(`[Insights API] Creating configuration "${configuration.name}"`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configuration),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to create configuration: ${errorText}`);
  }

  return response.json();
}

/**
 * Update insight configuration
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param configId - Configuration ID
 * @param configuration - Configuration updates
 * @returns Updated configuration
 */
export async function updateInsightConfiguration(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  configId: string,
  configuration: Partial<Omit<InsightConfiguration, 'id' | 'organizationId'>>
): Promise<InsightConfiguration> {
  const url = `${insightsHost}/v1/insights/${organizationId}/configurations/${configId}`;

  console.log(`[Insights API] Updating configuration ${configId}`);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configuration),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to update configuration: ${errorText}`);
  }

  return response.json();
}

/**
 * Delete insight configuration
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param configId - Configuration ID
 */
export async function deleteInsightConfiguration(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  configId: string
): Promise<void> {
  const url = `${insightsHost}/v1/insights/${organizationId}/configurations/${configId}`;

  console.log(`[Insights API] Deleting configuration ${configId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to delete configuration: ${errorText}`);
  }
}

// ============================================================
// Analytics Functions
// ============================================================

/**
 * Get sentiment analytics
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param startDate - Start date (ISO format)
 * @param endDate - End date (ISO format)
 * @returns Sentiment analytics data
 */
export async function getSentimentAnalytics(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  startDate: string,
  endDate: string
): Promise<{
  overall: { positive: number; neutral: number; negative: number };
  trend: Array<{ date: string; positive: number; neutral: number; negative: number }>;
  avgScore: number;
}> {
  const url = new URL(`${insightsHost}/v1/insights/${organizationId}/analytics/sentiment`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  console.log(`[Insights API] Fetching sentiment analytics`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to get sentiment analytics: ${errorText}`);
  }

  return response.json();
}

/**
 * Get topic analytics
 * 
 * @param insightsHost - Insights API host URL
 * @param jwt - Authorization JWT
 * @param organizationId - Organization ID
 * @param startDate - Start date (ISO format)
 * @param endDate - End date (ISO format)
 * @param limit - Max number of topics
 * @returns Topic analytics data
 */
export async function getTopicAnalytics(
  insightsHost: string,
  jwt: string,
  organizationId: number,
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<Array<{
  topic: string;
  count: number;
  sentiment: { positive: number; neutral: number; negative: number };
}>> {
  const url = new URL(`${insightsHost}/v1/insights/${organizationId}/analytics/topics`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('limit', String(limit));

  console.log(`[Insights API] Fetching topic analytics`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Insights API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to get topic analytics: ${errorText}`);
  }

  return response.json();
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get Insights API host from environment
 */
export function getInsightsHost(): string | undefined {
  return INSIGHTS_HOST;
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get sentiment badge color class
 */
export function getSentimentColor(sentiment: 'positive' | 'neutral' | 'negative'): string {
  switch (sentiment) {
    case 'positive': return 'bg-green-500/10 text-green-400';
    case 'negative': return 'bg-red-500/10 text-red-400';
    default: return 'bg-gray-500/10 text-gray-400';
  }
}

