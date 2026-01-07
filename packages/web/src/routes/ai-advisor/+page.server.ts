import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface SalesforceInsight {
    Id: string;
    Name: string;
    nbavs__CallLogId__c: string;
    nbavs__Summary__c: string;
    nbavs__Sentiment__c: string;
    nbavs__Score__c: number;
    nbavs__TranscriptStatus__c: string;
    CreatedDate: string;
}

export interface AIInsight {
    id: string;
    name: string;
    callLogId: string;
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    transcriptStatus: string;
    createdDate: string;
}

export interface AIAdvisorStats {
    totalInsights: number;
    transcriptions: number;
    processing: number;
    avgSentimentScore: number;
}

export interface AIAdvisorPageData {
    stats: AIAdvisorStats;
    recentInsights: AIInsight[];
    isDemo: boolean;
    error?: string;
}

// Demo data
const DEMO_STATS: AIAdvisorStats = {
    totalInsights: 1234,
    transcriptions: 456,
    processing: 89,
    avgSentimentScore: 78,
};

const DEMO_INSIGHTS: AIInsight[] = [
    {
        id: '1',
        name: 'Call Analysis #1234',
        callLogId: 'cl-001',
        summary: 'Customer inquired about pricing for enterprise plan. Agent provided detailed information and scheduled a follow-up demo.',
        sentiment: 'positive',
        score: 85,
        transcriptStatus: 'Completed',
        createdDate: '2026-01-05T14:30:00Z',
    },
    {
        id: '2',
        name: 'Call Analysis #1233',
        callLogId: 'cl-002',
        summary: 'Technical support call regarding integration issues. Problem was identified and resolved during the call.',
        sentiment: 'neutral',
        score: 65,
        transcriptStatus: 'Completed',
        createdDate: '2026-01-05T13:15:00Z',
    },
    {
        id: '3',
        name: 'Call Analysis #1232',
        callLogId: 'cl-003',
        summary: 'Customer expressed frustration about delayed delivery. Agent escalated to supervisor and offered compensation.',
        sentiment: 'negative',
        score: 35,
        transcriptStatus: 'Completed',
        createdDate: '2026-01-05T11:45:00Z',
    },
    {
        id: '4',
        name: 'Call Analysis #1231',
        callLogId: 'cl-004',
        summary: 'New customer onboarding call. Successfully set up account and walked through main features.',
        sentiment: 'positive',
        score: 92,
        transcriptStatus: 'Completed',
        createdDate: '2026-01-05T10:00:00Z',
    },
    {
        id: '5',
        name: 'Call Analysis #1230',
        callLogId: 'cl-005',
        summary: 'Transcript processing in progress...',
        sentiment: 'neutral',
        score: 0,
        transcriptStatus: 'Processing',
        createdDate: '2026-01-05T09:30:00Z',
    },
];

export const load: PageServerLoad = async ({ locals }) => {
    // Demo mode
    if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
        return {
            stats: DEMO_STATS,
            recentInsights: DEMO_INSIGHTS,
            isDemo: true,
        } satisfies AIAdvisorPageData;
    }

    // Check credentials
    if (!hasValidCredentials(locals)) {
        return {
            stats: { totalInsights: 0, transcriptions: 0, processing: 0, avgSentimentScore: 0 },
            recentInsights: [],
            isDemo: false,
            error: 'Not authenticated',
        } satisfies AIAdvisorPageData;
    }

    try {
        // Try to fetch AI Insight data (may not exist in all orgs)
        // This assumes there's an Insight__c or similar object
        let insights: AIInsight[] = [];
        let stats: AIAdvisorStats = { totalInsights: 0, transcriptions: 0, processing: 0, avgSentimentScore: 0 };

        try {
            // Check if the object exists by trying a simple query
            const insightSoql = `
        SELECT Id, Name, CreatedDate
        FROM nbavs__Insight__c
        ORDER BY CreatedDate DESC
        LIMIT 10
      `;

            const result = await querySalesforce<SalesforceInsight>(
                locals.instanceUrl!,
                locals.accessToken!,
                insightSoql
            );

            insights = result.records.map((i) => ({
                id: i.Id,
                name: i.Name,
                callLogId: i.nbavs__CallLogId__c || '',
                summary: i.nbavs__Summary__c || 'No summary available',
                sentiment: (i.nbavs__Sentiment__c?.toLowerCase() as AIInsight['sentiment']) || 'neutral',
                score: i.nbavs__Score__c || 0,
                transcriptStatus: i.nbavs__TranscriptStatus__c || 'Unknown',
                createdDate: i.CreatedDate,
            }));

            stats.totalInsights = result.totalSize;
            stats.transcriptions = insights.filter((i) => i.transcriptStatus === 'Completed').length;
            stats.processing = insights.filter((i) => i.transcriptStatus === 'Processing').length;
            stats.avgSentimentScore = insights.length > 0
                ? Math.round(insights.reduce((sum, i) => sum + i.score, 0) / insights.length)
                : 0;
        } catch (e) {
            // Object may not exist - this is okay, AI Advisor might not be enabled
            console.warn('AI Advisor data not available:', e);
        }

        return {
            stats,
            recentInsights: insights,
            isDemo: false,
        } satisfies AIAdvisorPageData;
    } catch (error) {
        console.error('Failed to fetch AI Advisor data:', error);
        return {
            stats: { totalInsights: 0, transcriptions: 0, processing: 0, avgSentimentScore: 0 },
            recentInsights: [],
            isDemo: false,
            error: 'Failed to load AI Advisor data',
        } satisfies AIAdvisorPageData;
    }
};

