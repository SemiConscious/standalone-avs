/**
 * Demo Call Log Repository Implementation
 */

import type { ICallLogRepository, CallLogQueryParams } from '$lib/repositories';
import type { CallLog, CallDirection, UserCallSummary, PaginatedResult } from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import { DEMO_CALL_LOGS } from '../data/call-logs';

export class DemoCallLogRepository implements ICallLogRepository {
  private callLogs: CallLog[] = [...DEMO_CALL_LOGS];

  async findAll(params: CallLogQueryParams): Promise<PaginatedResult<CallLog>> {
    let filtered = [...this.callLogs];

    // Date range filter
    if (params.filters?.fromDate) {
      const from = new Date(params.filters.fromDate);
      filtered = filtered.filter(c => new Date(c.dateTime) >= from);
    }
    if (params.filters?.toDate) {
      const to = new Date(params.filters.toDate + 'T23:59:59Z');
      filtered = filtered.filter(c => new Date(c.dateTime) <= to);
    }

    // User filter
    if (params.filters?.userId) {
      const userId = params.filters.userId;
      filtered = filtered.filter(c => c.fromUserId === userId || c.toUserId === userId);
    }

    // Phone number filter
    if (params.filters?.phoneNumber) {
      const phone = params.filters.phoneNumber;
      filtered = filtered.filter(c =>
        c.fromNumber.includes(phone) || c.toNumber.includes(phone)
      );
    }

    // Direction filter
    if (params.filters?.direction) {
      filtered = filtered.filter(c => c.direction === params.filters!.direction);
    }

    // Recording filter
    if (params.filters?.hasRecording !== undefined) {
      filtered = filtered.filter(c => c.hasRecording === params.filters!.hasRecording);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    const totalCount = filtered.length;
    const start = (params.page - 1) * params.pageSize;
    const paginated = filtered.slice(start, start + params.pageSize);

    return {
      items: paginated,
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<CallLog | null> {
    return this.callLogs.find(c => c.id === id) || null;
  }

  async findByUser(userId: string, params: CallLogQueryParams): Promise<PaginatedResult<CallLog>> {
    return this.findAll({ ...params, filters: { ...params.filters, userId } });
  }

  async findByPhoneNumber(phoneNumber: string, params: CallLogQueryParams): Promise<PaginatedResult<CallLog>> {
    return this.findAll({ ...params, filters: { ...params.filters, phoneNumber } });
  }

  async getUserSummary(userId: string, fromDate: string, toDate: string): Promise<UserCallSummary> {
    const result = await this.findAll({
      page: 1,
      pageSize: 10000,
      filters: { userId, fromDate, toDate },
    });

    const calls = result.items;
    const totalDuration = calls.reduce((sum, c) => sum + c.duration, 0);

    return {
      userId,
      userName: calls[0]?.fromUserName || calls[0]?.toUserName || 'Demo User',
      totalCalls: calls.length,
      inboundCalls: calls.filter(c => c.direction === 'Inbound').length,
      outboundCalls: calls.filter(c => c.direction === 'Outbound').length,
      internalCalls: calls.filter(c => c.direction === 'Internal').length,
      totalDuration,
      averageDuration: calls.length > 0 ? Math.round(totalDuration / calls.length) : 0,
      recordedCalls: calls.filter(c => c.hasRecording).length,
    };
  }

  async getTotalCount(fromDate: string, toDate: string): Promise<number> {
    const result = await this.findAll({
      page: 1,
      pageSize: 1,
      filters: { fromDate, toDate },
    });
    return result.pagination.totalItems;
  }

  async getCountByDirection(fromDate: string, toDate: string): Promise<Map<CallDirection, number>> {
    const result = await this.findAll({
      page: 1,
      pageSize: 10000,
      filters: { fromDate, toDate },
    });

    const counts = new Map<CallDirection, number>();
    counts.set('Inbound', result.items.filter(c => c.direction === 'Inbound').length);
    counts.set('Outbound', result.items.filter(c => c.direction === 'Outbound').length);
    counts.set('Internal', result.items.filter(c => c.direction === 'Internal').length);

    return counts;
  }

  async getTotalDuration(fromDate: string, toDate: string): Promise<number> {
    const result = await this.findAll({
      page: 1,
      pageSize: 10000,
      filters: { fromDate, toDate },
    });
    return result.items.reduce((sum, c) => sum + c.duration, 0);
  }

  async hasRecording(callLogId: string): Promise<boolean> {
    const callLog = await this.findById(callLogId);
    return callLog?.hasRecording ?? false;
  }

  async getRecordingUrl(callLogId: string): Promise<string | null> {
    const callLog = await this.findById(callLogId);
    return callLog?.recordingId ? `/api/recordings/${callLog.recordingId}` : null;
  }
}
