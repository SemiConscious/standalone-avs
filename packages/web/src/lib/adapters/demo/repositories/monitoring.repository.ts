/**
 * Demo Monitoring Repository Implementation
 */

import type { IMonitoringRepository } from '$lib/repositories';
import type {
  EventLog,
  ErrorLog,
  MonitoringStats,
  MonitoringQueryParams,
  ServiceInfo,
  PaginatedResult,
} from '$lib/domain';
import { createPaginationMeta } from '$lib/domain';
import {
  DEMO_EVENT_LOGS,
  DEMO_ERROR_LOGS,
  DEMO_SERVICES,
  DEMO_MONITORING_STATS,
} from '../data/monitoring';

export class DemoMonitoringRepository implements IMonitoringRepository {
  async getEventLogs(params?: MonitoringQueryParams): Promise<PaginatedResult<EventLog>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;

    let filtered = [...DEMO_EVENT_LOGS];

    // Apply filters
    if (params?.severity && params.severity.length > 0) {
      filtered = filtered.filter(e => params.severity!.includes(e.severity));
    }
    if (params?.source) {
      filtered = filtered.filter(e => e.source === params.source);
    }
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.message.toLowerCase().includes(search) ||
          e.type.toLowerCase().includes(search)
      );
    }

    const totalItems = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      pagination: createPaginationMeta(page, pageSize, totalItems),
    };
  }

  async getEventLogById(id: string): Promise<EventLog | null> {
    return DEMO_EVENT_LOGS.find(e => e.id === id) ?? null;
  }

  async getErrorLogs(params?: MonitoringQueryParams): Promise<PaginatedResult<ErrorLog>> {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 25;

    let filtered = [...DEMO_ERROR_LOGS];

    // Apply filters
    if (params?.source) {
      filtered = filtered.filter(e => e.source === params.source);
    }
    if (params?.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.message.toLowerCase().includes(search) ||
          e.type.toLowerCase().includes(search)
      );
    }

    const totalItems = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      pagination: createPaginationMeta(page, pageSize, totalItems),
    };
  }

  async getErrorLogById(id: string): Promise<ErrorLog | null> {
    return DEMO_ERROR_LOGS.find(e => e.id === id) ?? null;
  }

  async getStats(): Promise<MonitoringStats> {
    return { ...DEMO_MONITORING_STATS };
  }

  async getServices(): Promise<ServiceInfo[]> {
    return DEMO_SERVICES.map(s => ({ ...s }));
  }

  async getServiceStatus(serviceId: string): Promise<ServiceInfo | null> {
    return DEMO_SERVICES.find(s => s.id === serviceId) ?? null;
  }

  async getAdminCounts(): Promise<import('$lib/repositories/monitoring.repository').AdminMonitoringCounts> {
    return {
      eventLogsToday: 6,
      errorLogsToday: 2,
      recordingAccessCount: 33,
    };
  }

  async getScheduledJobs(): Promise<import('$lib/repositories/monitoring.repository').ScheduledJobInfo[]> {
    return [
      { id: 'cro', name: 'Call Reporting Scheduled Job', isRunning: true, canStart: true, canStop: true },
      { id: 'hcro', name: 'HCRO Processing Scheduled Job', isRunning: true, canStart: true, canStop: true },
      { id: 'availability', name: 'Availability Logs Scheduled Job', isRunning: true, canStart: true, canStop: true },
    ];
  }
}
