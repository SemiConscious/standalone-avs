/**
 * Insights Detail Page Server
 * 
 * Fetches a single NatterboxAI record by ID for detailed view.
 */

import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
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
    nbavs__NatterboxUser__c?: string;
    nbavs__NatterboxUser__r?: {
        Id: string;
        Name: string;
    };
    nbavs__Group__c?: string;
    nbavs__Group__r?: {
        Id: string;
        Name: string;
    };
    nbavs__CRO__r?: {
        nbavs__Call_Direction__c: string;
    };
    nbavs__Account__c?: string;
    nbavs__Account__r?: {
        Id: string;
        Name: string;
    };
    nbavs__Contact__c?: string;
    nbavs__Contact__r?: {
        Id: string;
        Name: string;
    };
    CreatedDate: string;
}

export interface AIInsightDetail {
    id: string;
    name: string;
    uuid: string;
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
    startTime: string;
    phoneNumber: string;
    direction: string;
    agentId?: string;
    agentName: string;
    groupId?: string;
    groupName: string;
    account?: { id: string; name: string };
    contact?: { id: string; name: string };
    wrapups: string[];
    categories: string[];
    createdDate: string;
}

export interface InsightDetailPageData {
    insight: AIInsightDetail;
    isDemo: boolean;
    error?: string;
}

// Demo data
const DEMO_INSIGHT: AIInsightDetail = {
    id: 'demo-1',
    name: 'AI-00001234',
    uuid: 'uuid-demo-001',
    summary: 'Customer inquired about pricing for enterprise plan. Agent provided detailed information about features, compared with competitor offerings, and scheduled a follow-up demo for next week. Customer expressed strong interest in the advanced analytics features.',
    sentiment: 'positive',
    score: 84,
    overallRating: 4.2,
    ratings: {
        callQuality: 4.5,
        customerExperience: 4.0,
        agentKnowledge: 4.3,
        politeness: 4.0,
    },
    duration: 245,
    transcriptStatus: 'Completed',
    startTime: '2026-01-05T14:30:00Z',
    phoneNumber: '+1 555 0100',
    direction: 'Inbound',
    agentId: 'agent-001',
    agentName: 'John Smith',
    groupId: 'group-001',
    groupName: 'Sales',
    account: { id: 'acc-001', name: 'Acme Corporation' },
    contact: { id: 'con-001', name: 'Jane Doe' },
    wrapups: ['Sales Inquiry', 'Demo Scheduled'],
    categories: ['Pricing', 'Enterprise', 'Demo Request'],
    createdDate: '2026-01-05T14:30:00Z',
};

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

export const load: PageServerLoad = async ({ params, locals }) => {
    const { id } = params;

    // Demo mode
    if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
        return {
            insight: { ...DEMO_INSIGHT, id },
            isDemo: true,
        } satisfies InsightDetailPageData;
    }

    // Check credentials
    if (!hasValidCredentials(locals)) {
        return {
            insight: { ...DEMO_INSIGHT, id },
            isDemo: true,
        } satisfies InsightDetailPageData;
    }

    try {
        // Fetch NatterboxAI record by ID
        const soql = `
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
                   ${NAMESPACE}NatterboxUser__c,
                   ${NAMESPACE}NatterboxUser__r.Id,
                   ${NAMESPACE}NatterboxUser__r.Name,
                   ${NAMESPACE}Group__c,
                   ${NAMESPACE}Group__r.Id,
                   ${NAMESPACE}Group__r.Name,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Call_Direction__c,
                   ${NAMESPACE}Account__c,
                   ${NAMESPACE}Account__r.Id,
                   ${NAMESPACE}Account__r.Name,
                   ${NAMESPACE}Contact__c,
                   ${NAMESPACE}Contact__r.Id,
                   ${NAMESPACE}Contact__r.Name
            FROM ${NAMESPACE}NatterboxAI__c
            WHERE Id = '${id}'
            LIMIT 1
        `;

        const result = await querySalesforce<SalesforceNatterboxAI>(
            locals.instanceUrl!,
            locals.accessToken!,
            soql
        );

        if (result.records.length === 0) {
            throw error(404, 'Insight not found');
        }

        const ai = result.records[0];
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

        const insight: AIInsightDetail = {
            id: ai.Id,
            name: ai.Name,
            uuid: ai[`${NAMESPACE}UUID__c`] || '',
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
            startTime: ai[`${NAMESPACE}StartTime__c`] || ai.CreatedDate,
            phoneNumber: ai[`${NAMESPACE}Number__c`] || '',
            direction: ai[`${NAMESPACE}CRO__r`]?.[`${NAMESPACE}Call_Direction__c`] || 'Unknown',
            agentId: ai[`${NAMESPACE}NatterboxUser__r`]?.Id,
            agentName: ai[`${NAMESPACE}NatterboxUser__r`]?.Name || 'Unknown',
            groupId: ai[`${NAMESPACE}Group__r`]?.Id,
            groupName: ai[`${NAMESPACE}Group__r`]?.Name || '',
            account: ai[`${NAMESPACE}Account__r`] ? {
                id: ai[`${NAMESPACE}Account__r`].Id,
                name: ai[`${NAMESPACE}Account__r`].Name,
            } : undefined,
            contact: ai[`${NAMESPACE}Contact__r`] ? {
                id: ai[`${NAMESPACE}Contact__r`].Id,
                name: ai[`${NAMESPACE}Contact__r`].Name,
            } : undefined,
            wrapups: [], // Would need to query a related object
            categories: [], // Would need to query a related object
            createdDate: ai.CreatedDate,
        };

        return {
            insight,
            isDemo: false,
        } satisfies InsightDetailPageData;
    } catch (e) {
        if (e && typeof e === 'object' && 'status' in e) {
            throw e; // Re-throw SvelteKit errors
        }
        console.error('Failed to fetch insight:', e);
        throw error(500, e instanceof Error ? e.message : 'Failed to load insight');
    }
};
