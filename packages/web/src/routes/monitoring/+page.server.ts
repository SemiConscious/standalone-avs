import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface SalesforceEventLog {
  Id: string;
  Name: string;
  nbavs__Type__c: string;
  nbavs__Severity__c: string;
  nbavs__Message__c: string;
  nbavs__Source__c: string;
  CreatedDate: string;
}

interface SalesforceErrorLog {
  Id: string;
  Name: string;
  nbavs__ErrorType__c: string;
  nbavs__Message__c: string;
  nbavs__StackTrace__c: string;
  CreatedDate: string;
}

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

// Demo data
const DEMO_SERVICES: ServiceStatus[] = [
  { name: 'Voice Services', status: 'operational', lastChecked: new Date().toISOString() },
  { name: 'API Gateway', status: 'operational', lastChecked: new Date().toISOString() },
  { name: 'Recording Services', status: 'operational', lastChecked: new Date().toISOString() },
  { name: 'AI Services', status: 'degraded', lastChecked: new Date().toISOString(), message: 'High latency detected' },
  { name: 'SMS Gateway', status: 'operational', lastChecked: new Date().toISOString() },
  { name: 'WebRTC Services', status: 'operational', lastChecked: new Date().toISOString() },
];

const DEMO_EVENTS: SystemEvent[] = [
  { id: '1', type: 'success', message: 'API deployment completed successfully', source: 'Deployment', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: '2', type: 'warning', message: 'AI Services experiencing high latency', source: 'AI Services', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: '3', type: 'success', message: 'Scheduled maintenance completed', source: 'Maintenance', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
  { id: '4', type: 'info', message: 'New recording archival policy applied', source: 'Storage', timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
  { id: '5', type: 'error', message: 'Failed to sync user data', source: 'Sync Service', timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() },
];

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      overallStatus: 'degraded' as const,
      services: DEMO_SERVICES,
      recentEvents: DEMO_EVENTS,
      errorCount24h: 3,
      warningCount24h: 7,
      isDemo: true,
    } satisfies MonitoringPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
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
    // Fetch recent event logs
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let recentEvents: SystemEvent[] = [];
    let errorCount24h = 0;
    let warningCount24h = 0;

    try {
      const eventLogSoql = `
        SELECT Id, Name, nbavs__Type__c, nbavs__Severity__c, nbavs__Message__c, nbavs__Source__c, CreatedDate
        FROM nbavs__EventLog__c
        WHERE CreatedDate >= ${yesterday}
        ORDER BY CreatedDate DESC
        LIMIT 50
      `;

      const result = await querySalesforce<SalesforceEventLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        eventLogSoql
      );

      recentEvents = result.records.map((e) => ({
        id: e.Id,
        type: mapSeverityToType(e.nbavs__Severity__c),
        message: e.nbavs__Message__c || e.Name,
        source: e.nbavs__Source__c || 'System',
        timestamp: e.CreatedDate,
      }));

      errorCount24h = result.records.filter((e) => e.nbavs__Severity__c === 'Error').length;
      warningCount24h = result.records.filter((e) => e.nbavs__Severity__c === 'Warning').length;
    } catch (e) {
      console.warn('Failed to fetch event logs:', e);
    }

    // Fetch error logs for additional context
    try {
      const errorLogSoql = `
        SELECT Id, Name, nbavs__ErrorType__c, nbavs__Message__c, CreatedDate
        FROM nbavs__ErrorLog__c
        WHERE CreatedDate >= ${yesterday}
        LIMIT 10
      `;

      const errorResult = await querySalesforce<SalesforceErrorLog>(
        locals.instanceUrl!,
        locals.accessToken!,
        errorLogSoql
      );

      errorResult.records.forEach((e) => {
        recentEvents.push({
          id: e.Id,
          type: 'error',
          message: e.nbavs__Message__c || e.Name,
          source: e.nbavs__ErrorType__c || 'Error',
          timestamp: e.CreatedDate,
        });
      });

      errorCount24h += errorResult.records.length;
    } catch (e) {
      console.warn('Failed to fetch error logs:', e);
    }

    // Sort events by timestamp
    recentEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    recentEvents = recentEvents.slice(0, 20);

    // Determine overall status based on error/warning counts
    let overallStatus: MonitoringPageData['overallStatus'] = 'operational';
    if (errorCount24h > 0) {
      overallStatus = 'degraded';
    }
    if (errorCount24h > 10) {
      overallStatus = 'outage';
    }

    // Note: Service status would typically come from a health check API
    const services: ServiceStatus[] = [
      { name: 'Voice Services', status: 'operational', lastChecked: new Date().toISOString() },
      { name: 'API Gateway', status: 'operational', lastChecked: new Date().toISOString() },
      { name: 'Recording Services', status: 'operational', lastChecked: new Date().toISOString() },
      { name: 'AI Services', status: 'operational', lastChecked: new Date().toISOString() },
      { name: 'SMS Gateway', status: 'operational', lastChecked: new Date().toISOString() },
    ];

    return {
      overallStatus,
      services,
      recentEvents,
      errorCount24h,
      warningCount24h,
      isDemo: false,
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

function mapSeverityToType(severity: string): SystemEvent['type'] {
  switch (severity?.toLowerCase()) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'success':
      return 'success';
    default:
      return 'info';
  }
}

