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
    nbavs__NatterboxUser__r?: {
        Id: string;
        Name: string;
    };
    nbavs__Group__r?: {
        Id: string;
        Name: string;
    };
    nbavs__CRO__r?: {
        Id: string;
        nbavs__Call_Direction__c: string;
        nbavs__Account__r?: { Id: string; Name: string };
        nbavs__Contact__r?: { Id: string; Name: string };
        nbavs__Lead__r?: { Id: string; Name: string };
        nbavs__WrapupLabel_0__c: string;
        nbavs__WrapupLabel_1__c: string;
    };
    CreatedDate: string;
}

interface SalesforceCategory {
    Id: string;
    nbavs__Name__c: string;
}

export interface InsightDetail {
    id: string;
    name: string;
    uuid: string;
    summary: string;
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
    agentName: string;
    agentId: string;
    groupName: string;
    groupId: string;
    account?: { id: string; name: string };
    contact?: { id: string; name: string };
    lead?: { id: string; name: string };
    wrapups: string[];
    categories: string[];
    createdDate: string;
}

export interface InsightDetailPageData {
    insight: InsightDetail;
    isDemo: boolean;
    error?: string;
}

// Demo data
const DEMO_INSIGHT: InsightDetail = {
    id: 'demo-1',
    name: 'AI-00001234',
    uuid: 'demo-uuid-001',
    summary: 'Customer inquired about pricing for enterprise plan. Agent provided detailed information about features, compared with competitor offerings, and scheduled a follow-up demo for next week. Customer expressed strong interest in the advanced analytics features.',
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
    agentName: 'John Smith',
    agentId: 'agent-001',
    groupName: 'Sales',
    groupId: 'group-001',
    account: { id: 'acc-001', name: 'Acme Corporation' },
    contact: { id: 'con-001', name: 'Jane Doe' },
    wrapups: ['Sales Inquiry', 'Demo Scheduled'],
    categories: ['Pricing', 'Enterprise', 'Demo Request'],
    createdDate: '2026-01-05T14:30:00Z',
};

export const load: PageServerLoad = async ({ params, locals }) => {
    const { id } = params;

    // Demo mode
    if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
        return {
            insight: DEMO_INSIGHT,
            isDemo: true,
        } satisfies InsightDetailPageData;
    }

    // Check credentials
    if (!hasValidCredentials(locals)) {
        throw error(401, 'Not authenticated');
    }

    try {
        // Fetch NatterboxAI record with related data
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
                   ${NAMESPACE}NatterboxUser__r.Id,
                   ${NAMESPACE}NatterboxUser__r.Name,
                   ${NAMESPACE}Group__r.Id,
                   ${NAMESPACE}Group__r.Name,
                   ${NAMESPACE}CRO__r.Id,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Call_Direction__c,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Account__r.Id,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Account__r.Name,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Contact__r.Id,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Contact__r.Name,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Lead__r.Id,
                   ${NAMESPACE}CRO__r.${NAMESPACE}Lead__r.Name,
                   ${NAMESPACE}CRO__r.${NAMESPACE}WrapupLabel_0__c,
                   ${NAMESPACE}CRO__r.${NAMESPACE}WrapupLabel_1__c
            FROM ${NAMESPACE}NatterboxAI__c
            WHERE Id = '${id}'
            LIMIT 1
        `;

        const result = await querySalesforce<SalesforceNatterboxAI>(
            locals.instanceUrl!,
            locals.accessToken!,
            insightSoql
        );

        if (result.records.length === 0) {
            throw error(404, 'Insight not found');
        }

        const ai = result.records[0];
        const cro = ai[`${NAMESPACE}CRO__r`];
        
        // Fetch categories
        let categories: string[] = [];
        try {
            const categorySoql = `
                SELECT ${NAMESPACE}Name__c 
                FROM ${NAMESPACE}Category__c 
                WHERE ${NAMESPACE}NatterboxAI__c = '${id}'
            `;
            const categoryResult = await querySalesforce<SalesforceCategory>(
                locals.instanceUrl!,
                locals.accessToken!,
                categorySoql
            );
            categories = categoryResult.records.map(c => c[`${NAMESPACE}Name__c`]).filter(Boolean);
        } catch (e) {
            console.warn('Failed to fetch categories:', e);
        }

        // Build wrapups array
        const wrapups: string[] = [];
        if (cro?.[`${NAMESPACE}WrapupLabel_0__c`]) wrapups.push(cro[`${NAMESPACE}WrapupLabel_0__c`]);
        if (cro?.[`${NAMESPACE}WrapupLabel_1__c`]) wrapups.push(cro[`${NAMESPACE}WrapupLabel_1__c`]);

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

        const insight: InsightDetail = {
            id: ai.Id,
            name: ai.Name,
            uuid: ai[`${NAMESPACE}UUID__c`] || '',
            summary: ai[`${NAMESPACE}Summary__c`] || 'No summary available',
            overallRating: ai[`${NAMESPACE}OverallRating__c`] || 0,
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
            direction: cro?.[`${NAMESPACE}Call_Direction__c`] || 'Unknown',
            agentName: ai[`${NAMESPACE}NatterboxUser__r`]?.Name || 'Unknown',
            agentId: ai[`${NAMESPACE}NatterboxUser__r`]?.Id || '',
            groupName: ai[`${NAMESPACE}Group__r`]?.Name || '',
            groupId: ai[`${NAMESPACE}Group__r`]?.Id || '',
            account: cro?.[`${NAMESPACE}Account__r`] 
                ? { id: cro[`${NAMESPACE}Account__r`].Id, name: cro[`${NAMESPACE}Account__r`].Name }
                : undefined,
            contact: cro?.[`${NAMESPACE}Contact__r`]
                ? { id: cro[`${NAMESPACE}Contact__r`].Id, name: cro[`${NAMESPACE}Contact__r`].Name }
                : undefined,
            lead: cro?.[`${NAMESPACE}Lead__r`]
                ? { id: cro[`${NAMESPACE}Lead__r`].Id, name: cro[`${NAMESPACE}Lead__r`].Name }
                : undefined,
            wrapups,
            categories,
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
