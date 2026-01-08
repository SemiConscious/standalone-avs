import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const NAMESPACE = 'nbavs__';

interface SalesforceNatterboxAI {
    Id: string;
    Name: string;
    nbavs__UUID__c: string;
    nbavs__StartTime__c: string;
    nbavs__Number__c: string;
    nbavs__Summary__c: string;
    nbavs__OverallRating__c: number;
    nbavs__Rating1__c: number;
    nbavs__Rating2__c: number;
    nbavs__Rating3__c: number;
    nbavs__Rating4__c: number;
    nbavs__ChannelDuration__c: number;
    nbavs__AIAnalysisStatus__c: string;
    nbavs__NatterboxUser__r?: {
        Name: string;
    };
    nbavs__Group__r?: {
        Name: string;
    };
    nbavs__CRO__r?: {
        nbavs__Call_Direction__c: string;
    };
    CreatedDate: string;
}

export interface AIInsight {
    id: string;
    name: string;
    uuid: string;
    callLogId: string;
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    overallRating: number;
    ratings: {
        callQuality: number;
        customerExperience: number;
        agentKnowledge: number;
        politeness: number;
    };
    duration: number;
    transcriptStatus: string;
    agentName: string;
    groupName: string;
    direction: string;
    phoneNumber: string;
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
        name: 'AI-00001234',
        uuid: 'uuid-001',
        callLogId: 'cl-001',
        summary: 'Customer inquired about pricing for enterprise plan. Agent provided detailed information and scheduled a follow-up demo.',
        sentiment: 'positive',
        score: 85,
        overallRating: 4.2,
        ratings: { callQuality: 4.5, customerExperience: 4.0, agentKnowledge: 4.3, politeness: 4.0 },
        duration: 245,
        transcriptStatus: 'Completed',
        agentName: 'John Smith',
        groupName: 'Sales',
        direction: 'Inbound',
        phoneNumber: '+1 555 0100',
        createdDate: '2026-01-05T14:30:00Z',
    },
    {
        id: '2',
        name: 'AI-00001233',
        uuid: 'uuid-002',
        callLogId: 'cl-002',
        summary: 'Technical support call regarding integration issues. Problem was identified and resolved during the call.',
        sentiment: 'neutral',
        score: 65,
        overallRating: 3.8,
        ratings: { callQuality: 3.5, customerExperience: 4.0, agentKnowledge: 4.2, politeness: 3.5 },
        duration: 420,
        transcriptStatus: 'Completed',
        agentName: 'Sarah Johnson',
        groupName: 'Support',
        direction: 'Inbound',
        phoneNumber: '+1 555 0200',
        createdDate: '2026-01-05T13:15:00Z',
    },
    {
        id: '3',
        name: 'AI-00001232',
        uuid: 'uuid-003',
        callLogId: 'cl-003',
        summary: 'Customer expressed frustration about delayed delivery. Agent escalated to supervisor and offered compensation.',
        sentiment: 'negative',
        score: 35,
        overallRating: 2.5,
        ratings: { callQuality: 2.0, customerExperience: 2.5, agentKnowledge: 3.0, politeness: 2.5 },
        duration: 312,
        transcriptStatus: 'Completed',
        agentName: 'Mike Williams',
        groupName: 'Support',
        direction: 'Inbound',
        phoneNumber: '+1 555 0300',
        createdDate: '2026-01-05T11:45:00Z',
    },
    {
        id: '4',
        name: 'AI-00001231',
        uuid: 'uuid-004',
        callLogId: 'cl-004',
        summary: 'New customer onboarding call. Successfully set up account and walked through main features.',
        sentiment: 'positive',
        score: 92,
        overallRating: 4.8,
        ratings: { callQuality: 5.0, customerExperience: 4.8, agentKnowledge: 4.5, politeness: 5.0 },
        duration: 480,
        transcriptStatus: 'Completed',
        agentName: 'Emily Davis',
        groupName: 'Onboarding',
        direction: 'Outbound',
        phoneNumber: '+1 555 0400',
        createdDate: '2026-01-05T10:00:00Z',
    },
    {
        id: '5',
        name: 'AI-00001230',
        uuid: 'uuid-005',
        callLogId: 'cl-005',
        summary: 'Transcript processing in progress...',
        sentiment: 'neutral',
        score: 0,
        overallRating: 0,
        ratings: { callQuality: 0, customerExperience: 0, agentKnowledge: 0, politeness: 0 },
        duration: 156,
        transcriptStatus: 'Processing',
        agentName: 'John Smith',
        groupName: 'Sales',
        direction: 'Inbound',
        phoneNumber: '+1 555 0500',
        createdDate: '2026-01-05T09:30:00Z',
    },
];

/**
 * Convert overall rating (1-5) to sentiment
 */
function getSentimentFromRating(rating: number): 'positive' | 'neutral' | 'negative' {
    if (rating >= 4) return 'positive';
    if (rating >= 2.5) return 'neutral';
    return 'negative';
}

/**
 * Convert overall rating to a percentage score
 */
function getScoreFromRating(rating: number): number {
    return Math.round((rating / 5) * 100);
}

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
        // Fetch NatterboxAI records
        const insightSoql = `
            SELECT Id, Name, CreatedDate,
                   ${NAMESPACE}UUID__c,
                   ${NAMESPACE}StartTime__c,
                   ${NAMESPACE}Number__c,
                   ${NAMESPACE}Summary__c,
                   ${NAMESPACE}OverallRating__c,
                   ${NAMESPACE}Rating1__c,
                   ${NAMESPACE}Rating2__c,
                   ${NAMESPACE}Rating3__c,
                   ${NAMESPACE}Rating4__c,
                   ${NAMESPACE}ChannelDuration__c,
                   ${NAMESPACE}AIAnalysisStatus__c,
                   ${NAMESPACE}NatterboxUser__r.Name,
                   ${NAMESPACE}Group__r.Name,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Call_Direction__c
            FROM ${NAMESPACE}NatterboxAI__c
            ORDER BY CreatedDate DESC
            LIMIT 10
        `;

        const result = await querySalesforce<SalesforceNatterboxAI>(
            locals.instanceUrl!,
            locals.accessToken!,
            insightSoql
        );

        const insights: AIInsight[] = result.records.map((ai) => {
            const overallRating = ai[`${NAMESPACE}OverallRating__c`] || 0;
            // Determine transcript status from AIAnalysisStatus
            const aiStatus = ai[`${NAMESPACE}AIAnalysisStatus__c`] || '';
            let transcriptStatus = 'Unknown';
            if (aiStatus === 'Complete') {
                transcriptStatus = 'Completed';
            } else if (aiStatus === 'Processing' || aiStatus === 'Pending') {
                transcriptStatus = 'Processing';
            } else if (aiStatus === 'Error') {
                transcriptStatus = 'Error';
            }
            
            return {
                id: ai.Id,
                name: ai.Name,
                uuid: ai[`${NAMESPACE}UUID__c`] || '',
                callLogId: ai[`${NAMESPACE}UUID__c`] || '', // UUID can be used to link to call
                summary: ai[`${NAMESPACE}Summary__c`] || 'No summary available',
                sentiment: getSentimentFromRating(overallRating),
                score: getScoreFromRating(overallRating),
                overallRating,
                ratings: {
                    callQuality: ai[`${NAMESPACE}Rating1__c`] || 0,
                    customerExperience: ai[`${NAMESPACE}Rating2__c`] || 0,
                    agentKnowledge: ai[`${NAMESPACE}Rating3__c`] || 0,
                    politeness: ai[`${NAMESPACE}Rating4__c`] || 0,
                },
                duration: ai[`${NAMESPACE}ChannelDuration__c`] || 0,
                transcriptStatus,
                agentName: ai[`${NAMESPACE}NatterboxUser__r`]?.Name || 'Unknown',
                groupName: ai[`${NAMESPACE}Group__r`]?.Name || '',
                direction: ai[`${NAMESPACE}CRO__r`]?.[`${NAMESPACE}Call_Direction__c`] || 'Unknown',
                phoneNumber: ai[`${NAMESPACE}Number__c`] || '',
                createdDate: ai.CreatedDate,
            };
        });

        // Calculate stats
        const completedInsights = insights.filter(i => i.transcriptStatus === 'Completed' || i.transcriptStatus === 'Complete');
        const processingInsights = insights.filter(i => i.transcriptStatus === 'Processing' || i.transcriptStatus === 'In Progress');
        
        const avgScore = completedInsights.length > 0
            ? Math.round(completedInsights.reduce((sum, i) => sum + i.score, 0) / completedInsights.length)
            : 0;

        // Get total count
        let totalCount = result.totalSize;
        try {
            const countSoql = `SELECT COUNT() FROM ${NAMESPACE}NatterboxAI__c`;
            const countResult = await querySalesforce<{ expr0: number }>(
                locals.instanceUrl!,
                locals.accessToken!,
                countSoql
            );
            totalCount = countResult.totalSize;
        } catch (e) {
            console.warn('Failed to get total count:', e);
        }

        const stats: AIAdvisorStats = {
            totalInsights: totalCount,
            transcriptions: completedInsights.length,
            processing: processingInsights.length,
            avgSentimentScore: avgScore,
        };

        return {
            stats,
            recentInsights: insights,
            isDemo: false,
        } satisfies AIAdvisorPageData;
    } catch (error) {
        console.error('Failed to fetch Insights data:', error);
        return {
            stats: { totalInsights: 0, transcriptions: 0, processing: 0, avgSentimentScore: 0 },
            recentInsights: [],
            isDemo: false,
            error: error instanceof Error ? error.message : 'Failed to load Insights data',
        } satisfies AIAdvisorPageData;
    }
};
