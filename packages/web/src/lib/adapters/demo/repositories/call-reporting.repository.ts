/**
 * Demo Call Reporting Repository Implementation
 */

import type { ICallReportingRepository } from '$lib/repositories';
import type {
  CallReport,
  CallReportStats,
  CallReportQueryParams,
  CallReportExportParams,
  GroupedCallStats,
  PaginatedResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import { DEMO_CALL_REPORTS, DEMO_CALL_REPORT_STATS } from '../data/call-reporting';

export class DemoCallReportingRepository implements ICallReportingRepository {
  private filterReports(params?: CallReportQueryParams): CallReport[] {
    let filtered = [...DEMO_CALL_REPORTS];

    if (params?.direction && params.direction.length > 0) {
      filtered = filtered.filter(r => params.direction!.includes(r.direction));
    }
    if (params?.result && params.result.length > 0) {
      filtered = filtered.filter(r => params.result!.includes(r.result));
    }
    if (params?.userId) {
      filtered = filtered.filter(r => r.userId === params.userId);
    }
    if (params?.groupId) {
      filtered = filtered.filter(r => r.groupId === params.groupId);
    }
    if (params?.number) {
      filtered = filtered.filter(r => r.number.includes(params.number!));
    }
    if (params?.hasRecording !== undefined) {
      filtered = filtered.filter(r => r.hasRecording === params.hasRecording);
    }
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.number.toLowerCase().includes(search) ||
          r.userName?.toLowerCase().includes(search) ||
          r.groupName?.toLowerCase().includes(search)
      );
    }

    // Sort
    if (params?.sortBy) {
      const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        const aVal = a[params.sortBy as keyof CallReport];
        const bVal = b[params.sortBy as keyof CallReport];
        if (aVal === bVal) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;
        return aVal < bVal ? -sortOrder : sortOrder;
      });
    }

    return filtered;
  }

  async getReports(params?: CallReportQueryParams): Promise<PaginatedResult<CallReport>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;

    const filtered = this.filterReports(params);
    const totalItems = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      pagination: createPaginationMeta(page, pageSize, totalItems),
    };
  }

  async getReportById(id: string): Promise<CallReport | null> {
    return DEMO_CALL_REPORTS.find(r => r.id === id) ?? null;
  }

  async getStats(params?: CallReportQueryParams): Promise<CallReportStats> {
    const filtered = this.filterReports(params);

    const totalCalls = filtered.length;
    const answeredCalls = filtered.filter(r => r.result === 'answered').length;
    const missedCalls = filtered.filter(r => r.result === 'missed').length;

    const talkingCalls = filtered.filter(r => r.timeTalking > 0);
    const avgTalkTime = talkingCalls.length > 0
      ? Math.round(talkingCalls.reduce((sum, r) => sum + r.timeTalking, 0) / talkingCalls.length)
      : 0;

    const queueCalls = filtered.filter(r => r.timeInQueue > 0);
    const avgWaitTime = queueCalls.length > 0
      ? Math.round(queueCalls.reduce((sum, r) => sum + r.timeInQueue, 0) / queueCalls.length)
      : 0;

    return {
      totalCalls,
      answeredCalls,
      missedCalls,
      avgTalkTime,
      avgWaitTime,
      answerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
      byDirection: {
        inbound: filtered.filter(r => r.direction === 'inbound').length,
        outbound: filtered.filter(r => r.direction === 'outbound').length,
        internal: filtered.filter(r => r.direction === 'internal').length,
      },
      byResult: {
        answered: answeredCalls,
        missed: missedCalls,
        voicemail: filtered.filter(r => r.result === 'voicemail').length,
        busy: filtered.filter(r => r.result === 'busy').length,
        failed: filtered.filter(r => r.result === 'failed').length,
        abandoned: filtered.filter(r => r.result === 'abandoned').length,
        transferred: filtered.filter(r => r.result === 'transferred').length,
        other: filtered.filter(r => r.result === 'other').length,
      },
    };
  }

  async getStatsByUser(params?: CallReportQueryParams): Promise<GroupedCallStats[]> {
    const filtered = this.filterReports(params);

    // Group by user
    const byUser = new Map<string, { name: string; calls: CallReport[] }>();
    for (const report of filtered) {
      if (!report.userId) continue;
      if (!byUser.has(report.userId)) {
        byUser.set(report.userId, { name: report.userName || 'Unknown', calls: [] });
      }
      byUser.get(report.userId)!.calls.push(report);
    }

    return Array.from(byUser.entries()).map(([userId, data]) => ({
      key: userId,
      label: data.name,
      stats: {
        totalCalls: data.calls.length,
        answeredCalls: data.calls.filter(r => r.result === 'answered').length,
        missedCalls: data.calls.filter(r => r.result === 'missed').length,
        avgTalkTime: 0,
        avgWaitTime: 0,
        answerRate: 0,
        byDirection: { inbound: 0, outbound: 0, internal: 0 },
        byResult: { answered: 0, missed: 0, voicemail: 0, busy: 0, failed: 0, abandoned: 0, transferred: 0, other: 0 },
      },
    }));
  }

  async getStatsByGroup(params?: CallReportQueryParams): Promise<GroupedCallStats[]> {
    const filtered = this.filterReports(params);

    // Group by group
    const byGroup = new Map<string, { name: string; calls: CallReport[] }>();
    for (const report of filtered) {
      if (!report.groupId) continue;
      if (!byGroup.has(report.groupId)) {
        byGroup.set(report.groupId, { name: report.groupName || 'Unknown', calls: [] });
      }
      byGroup.get(report.groupId)!.calls.push(report);
    }

    return Array.from(byGroup.entries()).map(([groupId, data]) => ({
      key: groupId,
      label: data.name,
      stats: {
        totalCalls: data.calls.length,
        answeredCalls: data.calls.filter(r => r.result === 'answered').length,
        missedCalls: data.calls.filter(r => r.result === 'missed').length,
        avgTalkTime: 0,
        avgWaitTime: 0,
        answerRate: 0,
        byDirection: { inbound: 0, outbound: 0, internal: 0 },
        byResult: { answered: 0, missed: 0, voicemail: 0, busy: 0, failed: 0, abandoned: 0, transferred: 0, other: 0 },
      },
    }));
  }

  async export(params: CallReportExportParams): Promise<string | Blob> {
    const filtered = this.filterReports(params);

    if (params.format === 'json') {
      return JSON.stringify(filtered, null, 2);
    }

    // CSV format
    const headers = ['ID', 'Date/Time', 'Direction', 'Result', 'Number', 'Duration', 'User', 'Group'];
    const rows = filtered.map(r => [
      r.id,
      r.dateTime,
      r.direction,
      r.result,
      r.number,
      r.totalDuration.toString(),
      r.userName || '',
      r.groupName || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  async getCount(params?: CallReportQueryParams): Promise<number> {
    return this.filterReports(params).length;
  }

  // =========================================================================
  // Extended Export Methods
  // =========================================================================

  async exportCallLogs(options: {
    startDate?: string;
    endDate?: string;
    direction?: string;
    fields: string[];
    limit: number;
  }): Promise<Record<string, string | number>[]> {
    const labelMap: Record<string, string> = {
      'Name': 'Call ID',
      'DateTime__c': 'Date/Time',
      'Direction__c': 'Direction',
      'Number__c': 'Phone Number',
      'TimeTalking__c': 'Talk Time (seconds)',
      'TimeRinging__c': 'Ring Time (seconds)',
      'TimeInQueue__c': 'Queue Time (seconds)',
      'Result__c': 'Result',
      'User__r.Name': 'Agent',
      'Group__r.Name': 'Group',
      'CreatedDate': 'Created Date',
    };

    const directions = ['Inbound', 'Outbound', 'Internal'];
    const results = ['Answered', 'Missed', 'Voicemail'];
    const agents = ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown', 'Charlie Davis'];
    const groups = ['Sales', 'Support', 'Billing', 'Technical'];

    const data: Record<string, string | number>[] = [];

    for (let i = 0; i < Math.min(options.limit, 100); i++) {
      const row: Record<string, string | number> = {};
      const date = new Date(Date.now() - i * 3600000);

      options.fields.forEach(field => {
        const label = labelMap[field] || field;
        switch (field) {
          case 'Name':
            row[label] = `CL-${String(1000 + i).padStart(6, '0')}`;
            break;
          case 'DateTime__c':
            row[label] = date.toISOString();
            break;
          case 'Direction__c':
            row[label] = directions[i % 3];
            break;
          case 'Number__c':
            row[label] = `+44 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
            break;
          case 'TimeTalking__c':
            row[label] = Math.floor(Math.random() * 600);
            break;
          case 'TimeRinging__c':
            row[label] = Math.floor(Math.random() * 30);
            break;
          case 'TimeInQueue__c':
            row[label] = Math.floor(Math.random() * 120);
            break;
          case 'Result__c':
            row[label] = results[i % 3];
            break;
          case 'User__r.Name':
            row[label] = agents[i % 5];
            break;
          case 'Group__r.Name':
            row[label] = groups[i % 4];
            break;
          case 'CreatedDate':
            row[label] = date.toISOString();
            break;
        }
      });

      data.push(row);
    }

    return data;
  }

  async getReportData(
    _reportType: string,
    _dateRange: { start: string; end: string }
  ): Promise<import('$lib/repositories/call-reporting.repository').CallReportData> {
    const stats = await this.getStats();
    return {
      summary: {
        totalCalls: stats.totalCalls,
        answeredCalls: stats.answeredCalls,
        missedCalls: stats.missedCalls,
        avgDuration: stats.avgTalkTime,
        avgWaitTime: stats.avgWaitTime,
        answerRate: stats.answerRate,
      },
      byDirection: [
        { direction: 'Inbound', count: stats.byDirection.inbound, percentage: 56 },
        { direction: 'Outbound', count: stats.byDirection.outbound, percentage: 34 },
        { direction: 'Internal', count: stats.byDirection.internal, percentage: 10 },
      ],
      byResult: [
        { result: 'Answered', count: stats.answeredCalls, percentage: 94 },
        { result: 'Missed', count: stats.missedCalls, percentage: 6 },
      ],
    };
  }

  async getSummary(_dateRange: { start: string; end: string }): Promise<import('$lib/repositories/call-reporting.repository').CallLogSummary> {
    const stats = await this.getStats();
    return {
      totalCalls: stats.totalCalls,
      answeredCalls: stats.answeredCalls,
      missedCalls: stats.missedCalls,
      avgDuration: stats.avgTalkTime,
      avgWaitTime: stats.avgWaitTime,
      answerRate: stats.answerRate,
    };
  }
}
