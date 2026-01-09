/**
 * Call Reporting Detail Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import { tryCreateContextAndRepositories } from '$lib/adapters';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// ============================================================
// Types
// ============================================================

export interface ReportData {
  reportType: string;
  reportName: string;
  reportDescription: string;
  dateRange: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    avgDuration: number;
    avgWaitTime: number;
    answerRate: number;
  };
  byDirection?: { direction: string; count: number; percentage: number }[];
  byResult?: { result: string; count: number; percentage: number }[];
  byAgent?: { agentId: string; agentName: string; totalCalls: number; answered: number; avgDuration: number; answerRate: number }[];
  byGroup?: { groupId: string; groupName: string; totalCalls: number; answered: number; avgWaitTime: number; answerRate: number }[];
  byHour?: { hour: number; count: number }[];
  byDay?: { day: string; count: number }[];
  trend?: { date: string; calls: number; answered: number }[];
  recentCalls?: { id: string; name: string; dateTime: string; direction: string; duration: number; result: string; agent: string; number: string }[];
}

export interface ReportPageData {
  report: ReportData;
  isDemo: boolean;
  error?: string;
}

// ============================================================
// Report Configuration
// ============================================================

const REPORT_CONFIG: Record<string, { name: string; description: string }> = {
  summary: { name: 'Call Summary', description: 'Overview of call volumes, patterns, and key metrics' },
  agent: { name: 'Agent Performance', description: 'Individual agent metrics and performance indicators' },
  queue: { name: 'Queue Analysis', description: 'Wait times, abandonment rates, and queue performance' },
  trend: { name: 'Trend Analysis', description: 'Historical trends and patterns over time' },
};

// ============================================================
// Demo Data
// ============================================================

function generateDemoData(reportType: string): ReportData {
  const baseData: ReportData = {
    reportType,
    reportName: REPORT_CONFIG[reportType]?.name || 'Report',
    reportDescription: REPORT_CONFIG[reportType]?.description || '',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      label: 'Last 30 Days',
    },
    summary: {
      totalCalls: 15234,
      answeredCalls: 14320,
      missedCalls: 914,
      avgDuration: 204,
      avgWaitTime: 45,
      answerRate: 94,
    },
    byDirection: [
      { direction: 'Inbound', count: 8562, percentage: 56 },
      { direction: 'Outbound', count: 5123, percentage: 34 },
      { direction: 'Internal', count: 1549, percentage: 10 },
    ],
    byResult: [
      { result: 'Answered', count: 14320, percentage: 94 },
      { result: 'Missed', count: 650, percentage: 4 },
      { result: 'Voicemail', count: 264, percentage: 2 },
    ],
  };

  if (reportType === 'agent') {
    baseData.byAgent = [
      { agentId: '1', agentName: 'John Smith', totalCalls: 1523, answered: 1456, avgDuration: 198, answerRate: 96 },
      { agentId: '2', agentName: 'Sarah Johnson', totalCalls: 1412, answered: 1320, avgDuration: 215, answerRate: 93 },
      { agentId: '3', agentName: 'Mike Williams', totalCalls: 1356, answered: 1290, avgDuration: 187, answerRate: 95 },
      { agentId: '4', agentName: 'Emily Davis', totalCalls: 1298, answered: 1198, avgDuration: 223, answerRate: 92 },
      { agentId: '5', agentName: 'David Brown', totalCalls: 1187, answered: 1145, avgDuration: 201, answerRate: 96 },
    ];
  }

  if (reportType === 'queue') {
    baseData.byGroup = [
      { groupId: '1', groupName: 'Sales', totalCalls: 4521, answered: 4320, avgWaitTime: 32, answerRate: 96 },
      { groupId: '2', groupName: 'Support', totalCalls: 5234, answered: 4890, avgWaitTime: 58, answerRate: 93 },
      { groupId: '3', groupName: 'Billing', totalCalls: 2156, answered: 2012, avgWaitTime: 45, answerRate: 93 },
      { groupId: '4', groupName: 'Technical', totalCalls: 1823, answered: 1650, avgWaitTime: 72, answerRate: 90 },
    ];
  }

  if (reportType === 'trend') {
    const today = new Date();
    baseData.trend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (29 - i));
      const baseCalls = 450 + Math.floor(Math.random() * 150);
      return {
        date: date.toISOString().split('T')[0],
        calls: baseCalls,
        answered: Math.floor(baseCalls * (0.9 + Math.random() * 0.08)),
      };
    });
    baseData.byHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hour >= 8 && hour <= 18 ? 400 + Math.floor(Math.random() * 300) : 50 + Math.floor(Math.random() * 100),
    }));
    baseData.byDay = [
      { day: 'Monday', count: 2456 },
      { day: 'Tuesday', count: 2612 },
      { day: 'Wednesday', count: 2534 },
      { day: 'Thursday', count: 2489 },
      { day: 'Friday', count: 2312 },
      { day: 'Saturday', count: 1423 },
      { day: 'Sunday', count: 1408 },
    ];
  }

  if (reportType === 'summary') {
    baseData.recentCalls = [
      { id: '1', name: 'CL-001234', dateTime: new Date(Date.now() - 300000).toISOString(), direction: 'Inbound', duration: 245, result: 'Answered', agent: 'John Smith', number: '+1 555 0100' },
      { id: '2', name: 'CL-001233', dateTime: new Date(Date.now() - 600000).toISOString(), direction: 'Outbound', duration: 180, result: 'Answered', agent: 'Sarah Johnson', number: '+1 555 0200' },
      { id: '3', name: 'CL-001232', dateTime: new Date(Date.now() - 900000).toISOString(), direction: 'Inbound', duration: 0, result: 'Missed', agent: '-', number: '+1 555 0300' },
      { id: '4', name: 'CL-001231', dateTime: new Date(Date.now() - 1200000).toISOString(), direction: 'Inbound', duration: 312, result: 'Answered', agent: 'Mike Williams', number: '+1 555 0400' },
      { id: '5', name: 'CL-001230', dateTime: new Date(Date.now() - 1500000).toISOString(), direction: 'Internal', duration: 156, result: 'Answered', agent: 'Emily Davis', number: 'Ext 1234' },
    ];
  }

  return baseData;
}

// ============================================================
// Page Load
// ============================================================

export const load: PageServerLoad = async ({ params, locals }) => {
  const { id } = params;

  // Validate report type
  if (!REPORT_CONFIG[id]) {
    throw error(404, `Report type "${id}" not found`);
  }

  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return {
      report: generateDemoData(id),
      isDemo: true,
    } satisfies ReportPageData;
  }

  const { repos, isDemo } = result;

  // Demo mode
  if (isDemo) {
    return {
      report: generateDemoData(id),
      isDemo: true,
    } satisfies ReportPageData;
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Use call reporting repository to fetch data
    const reportData = await repos.callReporting.getReportData(id, {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    const report: ReportData = {
      reportType: id,
      reportName: REPORT_CONFIG[id]?.name || 'Report',
      reportDescription: REPORT_CONFIG[id]?.description || '',
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: 'Last 30 Days',
      },
      summary: reportData.summary,
      byDirection: reportData.byDirection,
      byResult: reportData.byResult,
      byAgent: reportData.byAgent,
      byGroup: reportData.byGroup,
      byHour: reportData.byHour,
      trend: reportData.trend,
    };

    // Fetch additional data based on report type
    if (id === 'agent' && !report.byAgent) {
      const agentStats = await repos.callReporting.getStatsByUser({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      report.byAgent = agentStats.map(s => ({
        agentId: s.key,
        agentName: s.label,
        totalCalls: s.stats.totalCalls,
        answered: s.stats.answeredCalls,
        avgDuration: s.stats.avgTalkTime,
        answerRate: s.stats.answerRate,
      }));
    }

    if (id === 'queue' && !report.byGroup) {
      const groupStats = await repos.callReporting.getStatsByGroup({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      report.byGroup = groupStats.map(s => ({
        groupId: s.key,
        groupName: s.label,
        totalCalls: s.stats.totalCalls,
        answered: s.stats.answeredCalls,
        avgWaitTime: s.stats.avgWaitTime,
        answerRate: s.stats.answerRate,
      }));
    }

    return {
      report,
      isDemo: false,
    } satisfies ReportPageData;
  } catch (e) {
    console.error('Failed to fetch report data:', e);
    return {
      report: generateDemoData(id),
      isDemo: false,
      error: e instanceof Error ? e.message : 'Failed to load report',
    } satisfies ReportPageData;
  }
};
