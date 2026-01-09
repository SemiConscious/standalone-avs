/**
 * Salesforce Monitoring Repository Implementation
 * 
 * Implements IMonitoringRepository using Salesforce as the data source.
 */

import type { IMonitoringRepository } from '$lib/repositories';
import type {
  EventLog,
  ErrorLog,
  MonitoringStats,
  MonitoringQueryParams,
  ServiceInfo,
  PaginatedResult,
  LogSeverity,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';

// =============================================================================
// Salesforce Types
// =============================================================================

interface SalesforceEventLogRecord {
  Id: string;
  Name: string;
  [key: string]: unknown;
}

interface SalesforceErrorLogRecord {
  Id: string;
  Name: string;
  [key: string]: unknown;
}

// =============================================================================
// Mappers
// =============================================================================

function mapSeverity(sfSeverity: string | undefined): LogSeverity {
  switch (sfSeverity?.toLowerCase()) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'critical';
    default:
      return 'info';
  }
}

function mapEventLog(record: SalesforceEventLogRecord, ns: string): EventLog {
  return {
    id: record.Id,
    type: String(record[`${ns}__Type__c`] || record.Name || 'Unknown'),
    message: String(record[`${ns}__Message__c`] || ''),
    severity: mapSeverity(record[`${ns}__Severity__c`] as string),
    timestamp: String(record.CreatedDate || new Date().toISOString()),
    source: String(record[`${ns}__Source__c`] || ''),
    userId: record[`${ns}__User__c`] as string | undefined,
    userName: (record[`${ns}__User__r`] as { Name?: string })?.Name,
  };
}

function mapErrorLog(record: SalesforceErrorLogRecord, ns: string): ErrorLog {
  return {
    id: record.Id,
    type: String(record[`${ns}__Type__c`] || record.Name || 'Unknown'),
    message: String(record[`${ns}__Message__c`] || ''),
    stackTrace: record[`${ns}__StackTrace__c`] as string | undefined,
    timestamp: String(record.CreatedDate || new Date().toISOString()),
    source: String(record[`${ns}__Source__c`] || ''),
    userId: record[`${ns}__User__c`] as string | undefined,
    userName: (record[`${ns}__User__r`] as { Name?: string })?.Name,
    resolved: record[`${ns}__Resolved__c`] as boolean | undefined,
  };
}

// =============================================================================
// Salesforce Monitoring Repository
// =============================================================================

export class SalesforceMonitoringRepository implements IMonitoringRepository {
  private client: SalesforceClient;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ns = ctx.namespace;
  }

  async getEventLogs(params?: MonitoringQueryParams): Promise<PaginatedResult<EventLog>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;
    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const conditions: string[] = [];
    if (params?.startDate) {
      conditions.push(`CreatedDate >= ${params.startDate}`);
    }
    if (params?.endDate) {
      conditions.push(`CreatedDate <= ${params.endDate}`);
    }
    if (params?.source) {
      conditions.push(`${this.ns}__Source__c = '${params.source}'`);
    }
    if (params?.type) {
      conditions.push(`${this.ns}__Type__c = '${params.type}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT() FROM ${this.ns}__EventLog__c ${whereClause}`;
    const countResult = await this.client.query<Record<string, unknown>>(countQuery);
    const totalItems = countResult.totalSize;

    // Get records - using only fields that are guaranteed to exist
    const query = `
      SELECT Id, Name, CreatedDate
      FROM ${this.ns}__EventLog__c
      ${whereClause}
      ORDER BY CreatedDate DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const result = await this.client.query<SalesforceEventLogRecord>(query);

    return {
      items: result.records.map(r => ({
        id: r.Id,
        type: r.Name || 'Event',
        message: r.Name || '',
        severity: 'info' as const,
        timestamp: String(r.CreatedDate || new Date().toISOString()),
        source: 'System',
      })),
      pagination: createPaginationMeta(page, pageSize, totalItems),
    };
  }

  async getEventLogById(id: string): Promise<EventLog | null> {
    const query = `
      SELECT Id, Name, CreatedDate
      FROM ${this.ns}__EventLog__c
      WHERE Id = '${id}'
    `;
    const result = await this.client.query<SalesforceEventLogRecord>(query);

    if (result.records.length === 0) {
      return null;
    }

    const r = result.records[0];
    return {
      id: r.Id,
      type: r.Name || 'Event',
      message: r.Name || '',
      severity: 'info' as const,
      timestamp: String(r.CreatedDate || new Date().toISOString()),
      source: 'System',
    };
  }

  async getErrorLogs(params?: MonitoringQueryParams): Promise<PaginatedResult<ErrorLog>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;
    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const conditions: string[] = [];
    if (params?.startDate) {
      conditions.push(`CreatedDate >= ${params.startDate}`);
    }
    if (params?.endDate) {
      conditions.push(`CreatedDate <= ${params.endDate}`);
    }
    if (params?.source) {
      conditions.push(`${this.ns}__Source__c = '${params.source}'`);
    }
    if (params?.type) {
      conditions.push(`${this.ns}__Type__c = '${params.type}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT() FROM ${this.ns}__ErrorLog__c ${whereClause}`;
    const countResult = await this.client.query<Record<string, unknown>>(countQuery);
    const totalItems = countResult.totalSize;

    // Get records - using only fields that are guaranteed to exist
    const query = `
      SELECT Id, Name, CreatedDate
      FROM ${this.ns}__ErrorLog__c
      ${whereClause}
      ORDER BY CreatedDate DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const result = await this.client.query<SalesforceErrorLogRecord>(query);

    return {
      items: result.records.map(r => ({
        id: r.Id,
        type: r.Name || 'Error',
        message: r.Name || '',
        timestamp: String(r.CreatedDate || new Date().toISOString()),
        source: 'System',
      })),
      pagination: createPaginationMeta(page, pageSize, totalItems),
    };
  }

  async getErrorLogById(id: string): Promise<ErrorLog | null> {
    const query = `
      SELECT Id, Name, CreatedDate
      FROM ${this.ns}__ErrorLog__c
      WHERE Id = '${id}'
    `;
    const result = await this.client.query<SalesforceErrorLogRecord>(query);

    if (result.records.length === 0) {
      return null;
    }

    const r = result.records[0];
    return {
      id: r.Id,
      type: r.Name || 'Error',
      message: r.Name || '',
      timestamp: String(r.CreatedDate || new Date().toISOString()),
      source: 'System',
    };
  }

  async getStats(): Promise<MonitoringStats> {
    const [eventsToday, errorsToday, warningsToday] = await Promise.all([
      this.client.query<{ expr0: number }>(
        `SELECT COUNT() FROM ${this.ns}__EventLog__c WHERE CreatedDate = TODAY`
      ),
      this.client.query<{ expr0: number }>(
        `SELECT COUNT() FROM ${this.ns}__ErrorLog__c WHERE CreatedDate = TODAY`
      ),
      this.client.query<{ expr0: number }>(
        `SELECT COUNT() FROM ${this.ns}__EventLog__c WHERE CreatedDate = TODAY AND ${this.ns}__Severity__c = 'Warning'`
      ).catch(() => ({ totalSize: 0 })),
    ]);

    return {
      totalEvents: eventsToday.totalSize,
      totalErrors: errorsToday.totalSize,
      totalWarnings: warningsToday.totalSize,
      eventsLast24h: eventsToday.totalSize,
      errorsLast24h: errorsToday.totalSize,
      warningsLast24h: warningsToday.totalSize,
      services: await this.getServices(),
    };
  }

  async getServices(): Promise<ServiceInfo[]> {
    // For now, return a static list of services
    // In the future, this could query an actual service registry
    return [
      { id: 'sapien', name: 'Sapien API', status: 'healthy' },
      { id: 'gatekeeper', name: 'Gatekeeper', status: 'healthy' },
      { id: 'salesforce', name: 'Salesforce', status: 'healthy' },
    ];
  }

  async getServiceStatus(serviceId: string): Promise<ServiceInfo | null> {
    const services = await this.getServices();
    return services.find(s => s.id === serviceId) ?? null;
  }

  async getAdminCounts(): Promise<import('$lib/repositories/monitoring.repository').AdminMonitoringCounts> {
    const [eventResult, errorResult, recordingResult] = await Promise.all([
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__EventLog__c WHERE CreatedDate = TODAY`).catch(() => ({ totalSize: 0 })),
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__ErrorLog__c WHERE CreatedDate = TODAY`).catch(() => ({ totalSize: 0 })),
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__RecordingAccess__c`).catch(() => ({ totalSize: 0 })),
    ]);

    return {
      eventLogsToday: eventResult.totalSize,
      errorLogsToday: errorResult.totalSize,
      recordingAccessCount: recordingResult.totalSize,
    };
  }

  async getScheduledJobs(): Promise<import('$lib/repositories/monitoring.repository').ScheduledJobInfo[]> {
    const jobNames = [
      'Call Reporting',
      'HCRO Processing',
      'Availability Logs',
      'Call Queue Logs',
      'Omni-Channel Status and Group Login Synchroniser',
      'Wrap-Up Fixer',
      'Dynamic Dial List Processor',
      'AI Advisor',
      'Dynamic Dial List Report Generator',
      'Transferred Calls for Reporting',
      'Interaction Reporting',
      'Natterbox Fixer',
    ];
    
    try {
      const result = await this.client.query<{
        Id: string;
        CronJobDetail: { Name: string };
      }>(`
        SELECT Id, CronJobDetail.Name 
        FROM CronTrigger 
        WHERE CronJobDetail.Name IN ('${jobNames.join("','")}')
      `);

      const runningJobNames = new Set(result.records.map(r => r.CronJobDetail?.Name));

      return [
        { id: 'cro', name: 'Call Reporting Scheduled Job', isRunning: runningJobNames.has('Call Reporting'), canStart: true, canStop: true },
        { id: 'hcro', name: 'HCRO Processing Scheduled Job', isRunning: runningJobNames.has('HCRO Processing'), canStart: true, canStop: true },
        { id: 'availability', name: 'Availability Logs Scheduled Job', isRunning: runningJobNames.has('Availability Logs'), canStart: true, canStop: true },
        { id: 'cq', name: 'Call Queue Logs Scheduled Job', isRunning: runningJobNames.has('Call Queue Logs'), canStart: true, canStop: true },
        { id: 'userServicePresGroupSync', name: 'Omni-Channel Status and Group Login Synchroniser Scheduled Job', isRunning: runningJobNames.has('Omni-Channel Status and Group Login Synchroniser'), canStart: true, canStop: true },
        { id: 'crFixer', name: 'Wrap-Up Fixer Scheduled Job', isRunning: runningJobNames.has('Wrap-Up Fixer'), canStart: true, canStop: true },
        { id: 'ddlProcessor', name: 'Dynamic Dial List Processor Scheduled Job', isRunning: runningJobNames.has('Dynamic Dial List Processor'), canStart: true, canStop: true },
        { id: 'insights', name: 'AI Advisor Scheduled Job', isRunning: runningJobNames.has('AI Advisor'), canStart: true, canStop: true },
        { id: 'ddlReport', name: 'Dynamic Dial List Report Generator Scheduled Job', isRunning: runningJobNames.has('Dynamic Dial List Report Generator'), canStart: true, canStop: true },
        { id: 'croTransfers', name: 'Transferred Calls for Reporting Scheduled Job', isRunning: runningJobNames.has('Transferred Calls for Reporting'), canStart: true, canStop: true },
        { id: 'wrapupEvents', name: 'Digital Channel Wrap-Ups', isRunning: false, canStart: true, canStop: true }, // This checks Session_v1__c.WrapupSubscriptionId__c
        { id: 'interactionReporting', name: 'Interaction Reporting Scheduled Job', isRunning: runningJobNames.has('Interaction Reporting'), canStart: true, canStop: true },
        { id: 'natterboxFixer', name: 'Natterbox Fixer Scheduled Job', isRunning: runningJobNames.has('Natterbox Fixer'), canStart: true, canStop: true },
      ];
    } catch (e) {
      console.warn('Failed to fetch scheduled jobs:', e);
      return [
        { id: 'cro', name: 'Call Reporting Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'hcro', name: 'HCRO Processing Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'availability', name: 'Availability Logs Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'cq', name: 'Call Queue Logs Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'userServicePresGroupSync', name: 'Omni-Channel Status and Group Login Synchroniser Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'crFixer', name: 'Wrap-Up Fixer Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'ddlProcessor', name: 'Dynamic Dial List Processor Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'insights', name: 'AI Advisor Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'ddlReport', name: 'Dynamic Dial List Report Generator Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'croTransfers', name: 'Transferred Calls for Reporting Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'wrapupEvents', name: 'Digital Channel Wrap-Ups', isRunning: false, canStart: true, canStop: true },
        { id: 'interactionReporting', name: 'Interaction Reporting Scheduled Job', isRunning: false, canStart: true, canStop: true },
        { id: 'natterboxFixer', name: 'Natterbox Fixer Scheduled Job', isRunning: false, canStart: true, canStop: true },
      ];
    }
  }
}
