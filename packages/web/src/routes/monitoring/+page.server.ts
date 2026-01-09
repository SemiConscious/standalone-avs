/**
 * Monitoring Page Server
 * 
 * Refactored to use the platform-agnostic repository pattern.
 */

import type { PageServerLoad } from './$types';
import { createAdapterContext, getRepositories } from '$lib/adapters';
import type { ServiceInfo, EventLog } from '$lib/domain';

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  lastChecked: string;
  message?: string;
}

export interface SystemEvent {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source: string;
  timestamp: string;
}

export interface MonitoringPageData {
  overallStatus: 'operational' | 'degraded' | 'outage';
  services: ServiceStatus[];
  recentEvents: SystemEvent[];
  errorCount24h: number;
  warningCount24h: number;
  isDemo: boolean;
  error?: string;
}

function mapServiceStatus(service: ServiceInfo): ServiceStatus {
  return {
    name: service.name,
    status: service.status === 'healthy' ? 'operational' : service.status === 'degraded' ? 'degraded' : 'outage',
    lastChecked: service.lastChecked || new Date().toISOString(),
    message: service.status !== 'healthy' ? `Response time: ${service.responseTime}ms` : undefined,
  };
}

function mapEventToSystemEvent(event: EventLog): SystemEvent {
  return {
    id: event.id,
    type: event.severity === 'error' || event.severity === 'critical' ? 'error' 
        : event.severity === 'warning' ? 'warning' 
        : 'info',
    message: event.message,
    source: event.source || 'System',
    timestamp: event.timestamp,
  };
}

export const load: PageServerLoad = async ({ locals }) => {
  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    return {
      overallStatus: 'operational' as const,
      services: [],
      recentEvents: [],
      errorCount24h: 0,
      warningCount24h: 0,
      isDemo: false,
      error: 'Not authenticated',
    } satisfies MonitoringPageData;
  }

  try {
    const repos = getRepositories(ctx);

    // Fetch monitoring data using repositories
    const [stats, eventLogsResult, errorLogsResult] = await Promise.all([
      repos.monitoring.getStats(),
      repos.monitoring.getEventLogs({ pageSize: 30 }),
      repos.monitoring.getErrorLogs({ pageSize: 20 }),
    ]);

    // Combine and sort events
    const allEvents: SystemEvent[] = [
      ...eventLogsResult.items.map(mapEventToSystemEvent),
      ...errorLogsResult.items.map(e => ({
        id: e.id,
        type: 'error' as const,
        message: e.message,
        source: e.source || 'Error',
        timestamp: e.timestamp,
      })),
    ];

    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentEvents = allEvents.slice(0, 20);

    // Determine overall status based on error counts
    let overallStatus: MonitoringPageData['overallStatus'] = 'operational';
    if (stats.errorsLast24h > 0) {
      overallStatus = 'degraded';
    }
    if (stats.errorsLast24h > 10) {
      overallStatus = 'outage';
    }

    return {
      overallStatus,
      services: stats.services.map(mapServiceStatus),
      recentEvents,
      errorCount24h: stats.errorsLast24h,
      warningCount24h: stats.warningsLast24h,
      isDemo: ctx.platform === 'demo',
    } satisfies MonitoringPageData;
  } catch (error) {
    console.error('Failed to fetch monitoring data:', error);
    return {
      overallStatus: 'operational' as const,
      services: [],
      recentEvents: [],
      errorCount24h: 0,
      warningCount24h: 0,
      isDemo: false,
      error: 'Failed to load monitoring data',
    } satisfies MonitoringPageData;
  }
};
