import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface SalesforceCallLog {
  expr0: number; // COUNT
}

interface SalesforceCallLogStats {
  TotalCalls: number;
  AvgDuration: number;
}

export interface CallReportingStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  internalCalls: number;
  avgDuration: string;
  answerRate: number;
  abandonRate: number;
  changeFromLastMonth: number;
}

export interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface CallReportingPageData {
  stats: CallReportingStats;
  reportTypes: ReportType[];
  isDemo: boolean;
  error?: string;
}

// Demo data
const DEMO_STATS: CallReportingStats = {
  totalCalls: 15234,
  inboundCalls: 8562,
  outboundCalls: 5123,
  internalCalls: 1549,
  avgDuration: '3:24',
  answerRate: 94,
  abandonRate: 6,
  changeFromLastMonth: 12,
};

const REPORT_TYPES: ReportType[] = [
  { id: 'summary', name: 'Call Summary', description: 'Overview of call volumes and patterns', icon: 'clipboard-list' },
  { id: 'agent', name: 'Agent Performance', description: 'Individual and team metrics', icon: 'bar-chart-3' },
  { id: 'queue', name: 'Queue Analysis', description: 'Wait times and abandonment rates', icon: 'pie-chart' },
  { id: 'trend', name: 'Trend Analysis', description: 'Historical comparisons', icon: 'trending-up' },
  { id: 'scheduled', name: 'Scheduled Reports', description: 'Manage automated reports', icon: 'calendar' },
  { id: 'custom', name: 'Custom Export', description: 'Build custom data exports', icon: 'download' },
];

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      stats: DEMO_STATS,
      reportTypes: REPORT_TYPES,
      isDemo: true,
    } satisfies CallReportingPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      stats: {
        totalCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        internalCalls: 0,
        avgDuration: '0:00',
        answerRate: 0,
        abandonRate: 0,
        changeFromLastMonth: 0,
      },
      reportTypes: REPORT_TYPES,
      isDemo: false,
      error: 'Not authenticated',
    } satisfies CallReportingPageData;
  }

  try {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const thisMonthStr = thisMonth.toISOString();

    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString();

    let totalCalls = 0;
    let inboundCalls = 0;
    let outboundCalls = 0;
    let internalCalls = 0;
    let totalDuration = 0;
    let answeredCalls = 0;
    let lastMonthCalls = 0;

    try {
      // Total calls this month
      const totalCallsSoql = `
        SELECT COUNT(Id) expr0
        FROM nbavs__CallLog__c
        WHERE nbavs__DateTime__c >= ${thisMonthStr}
      `;

      const totalResult = await querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        totalCallsSoql
      );
      totalCalls = totalResult.records[0]?.expr0 || 0;

      // Inbound calls
      const inboundSoql = `
        SELECT COUNT(Id) expr0
        FROM nbavs__CallLog__c
        WHERE nbavs__DateTime__c >= ${thisMonthStr} AND nbavs__Direction__c = 'Inbound'
      `;
      const inboundResult = await querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        inboundSoql
      );
      inboundCalls = inboundResult.records[0]?.expr0 || 0;

      // Outbound calls
      const outboundSoql = `
        SELECT COUNT(Id) expr0
        FROM nbavs__CallLog__c
        WHERE nbavs__DateTime__c >= ${thisMonthStr} AND nbavs__Direction__c = 'Outbound'
      `;
      const outboundResult = await querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        outboundSoql
      );
      outboundCalls = outboundResult.records[0]?.expr0 || 0;

      // Internal calls
      const internalSoql = `
        SELECT COUNT(Id) expr0
        FROM nbavs__CallLog__c
        WHERE nbavs__DateTime__c >= ${thisMonthStr} AND nbavs__Direction__c = 'Internal'
      `;
      const internalResult = await querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        internalSoql
      );
      internalCalls = internalResult.records[0]?.expr0 || 0;

      // Answered calls (calls with duration > 0)
      const answeredSoql = `
        SELECT COUNT(Id) expr0
        FROM nbavs__CallLog__c
        WHERE nbavs__DateTime__c >= ${thisMonthStr} AND nbavs__TimeTalking__c > 0
      `;
      const answeredResult = await querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        answeredSoql
      );
      answeredCalls = answeredResult.records[0]?.expr0 || 0;

      // Last month calls for comparison
      const lastMonthSoql = `
        SELECT COUNT(Id) expr0
        FROM nbavs__CallLog__c
        WHERE nbavs__DateTime__c >= ${lastMonthStr} AND nbavs__DateTime__c < ${thisMonthStr}
      `;
      const lastMonthResult = await querySalesforce<SalesforceCallLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        lastMonthSoql
      );
      lastMonthCalls = lastMonthResult.records[0]?.expr0 || 0;
    } catch (e) {
      console.warn('Failed to fetch call statistics:', e);
    }

    const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
    const abandonRate = 100 - answerRate;
    const changeFromLastMonth = lastMonthCalls > 0
      ? Math.round(((totalCalls - lastMonthCalls) / lastMonthCalls) * 100)
      : 0;

    // Calculate average duration (would need aggregate query in real implementation)
    const avgDurationSeconds = 204; // Placeholder - would calculate from actual data
    const avgMins = Math.floor(avgDurationSeconds / 60);
    const avgSecs = avgDurationSeconds % 60;
    const avgDuration = `${avgMins}:${avgSecs.toString().padStart(2, '0')}`;

    const stats: CallReportingStats = {
      totalCalls,
      inboundCalls,
      outboundCalls,
      internalCalls,
      avgDuration,
      answerRate,
      abandonRate,
      changeFromLastMonth,
    };

    return {
      stats,
      reportTypes: REPORT_TYPES,
      isDemo: false,
    } satisfies CallReportingPageData;
  } catch (error) {
    console.error('Failed to fetch call reporting data:', error);
    return {
      stats: {
        totalCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        internalCalls: 0,
        avgDuration: '0:00',
        answerRate: 0,
        abandonRate: 0,
        changeFromLastMonth: 0,
      },
      reportTypes: REPORT_TYPES,
      isDemo: false,
      error: 'Failed to load call reporting data',
    } satisfies CallReportingPageData;
  }
};

