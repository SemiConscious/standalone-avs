/**
 * Salesforce Call Log Repository Implementation
 */

import type { ICallLogRepository, CallLogQueryParams } from '$lib/repositories';
import type { CallLog, CallDirection, UserCallSummary, PaginatedResult } from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';
import type { SalesforceCallLogRecord } from '../types';
import { mapSalesforceCallLog } from '../mappers/call-log.mapper';
import { buildCallLogListQuery, buildCallLogCountQuery, buildCallLogByIdQuery } from '../queries/call-log.queries';

export class SalesforceCallLogRepository implements ICallLogRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  async findAll(params: CallLogQueryParams): Promise<PaginatedResult<CallLog>> {
    const countSoql = buildCallLogCountQuery(this.ns, params);
    const countResult = await this.client.query<Record<string, unknown>>(countSoql);
    const totalCount = countResult.totalSize;

    const listSoql = buildCallLogListQuery(this.ns, params);
    const listResult = await this.client.query<SalesforceCallLogRecord>(listSoql);

    return {
      items: listResult.records.map(mapSalesforceCallLog),
      pagination: createPaginationMeta(params.page, params.pageSize, totalCount),
    };
  }

  async findById(id: string): Promise<CallLog | null> {
    const soql = buildCallLogByIdQuery(this.ns, id);
    const result = await this.client.query<SalesforceCallLogRecord>(soql);
    return result.records.length > 0 ? mapSalesforceCallLog(result.records[0]) : null;
  }

  async findByUser(userId: string, params: CallLogQueryParams): Promise<PaginatedResult<CallLog>> {
    const paramsWithUser = {
      ...params,
      filters: { ...params.filters, userId },
    };
    return this.findAll(paramsWithUser);
  }

  async findByPhoneNumber(phoneNumber: string, params: CallLogQueryParams): Promise<PaginatedResult<CallLog>> {
    const paramsWithPhone = {
      ...params,
      filters: { ...params.filters, phoneNumber },
    };
    return this.findAll(paramsWithPhone);
  }

  async getUserSummary(userId: string, fromDate: string, toDate: string): Promise<UserCallSummary> {
    // Simplified implementation - in production would use aggregate queries
    const params: CallLogQueryParams = {
      page: 1,
      pageSize: 10000,
      filters: { userId, fromDate, toDate },
    };
    const result = await this.findAll(params);

    const calls = result.items;
    const totalDuration = calls.reduce((sum, c) => sum + c.duration, 0);

    return {
      userId,
      userName: calls[0]?.fromUserName || calls[0]?.toUserName || '',
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
    const params: CallLogQueryParams = {
      page: 1,
      pageSize: 1,
      filters: { fromDate, toDate },
    };
    const soql = buildCallLogCountQuery(this.ns, params);
    const result = await this.client.query<Record<string, unknown>>(soql);
    return result.totalSize;
  }

  async getCountByDirection(fromDate: string, toDate: string): Promise<Map<CallDirection, number>> {
    // Simplified - in production would use GROUP BY
    const params: CallLogQueryParams = {
      page: 1,
      pageSize: 10000,
      filters: { fromDate, toDate },
    };
    const result = await this.findAll(params);

    const counts = new Map<CallDirection, number>();
    counts.set('Inbound', result.items.filter(c => c.direction === 'Inbound').length);
    counts.set('Outbound', result.items.filter(c => c.direction === 'Outbound').length);
    counts.set('Internal', result.items.filter(c => c.direction === 'Internal').length);

    return counts;
  }

  async getTotalDuration(fromDate: string, toDate: string): Promise<number> {
    const params: CallLogQueryParams = {
      page: 1,
      pageSize: 10000,
      filters: { fromDate, toDate },
    };
    const result = await this.findAll(params);
    return result.items.reduce((sum, c) => sum + c.duration, 0);
  }

  async hasRecording(callLogId: string): Promise<boolean> {
    const callLog = await this.findById(callLogId);
    return callLog?.hasRecording ?? false;
  }

  async getRecordingUrl(callLogId: string): Promise<string | null> {
    const callLog = await this.findById(callLogId);
    if (!callLog?.recordingId) return null;
    return `/api/recordings/${callLog.recordingId}`;
  }
}
