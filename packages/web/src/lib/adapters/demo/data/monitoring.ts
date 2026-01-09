/**
 * Demo Monitoring Data
 */

import type { EventLog, ErrorLog, ServiceInfo, MonitoringStats } from '$lib/domain';

export const DEMO_EVENT_LOGS: EventLog[] = [
  {
    id: 'evt-001',
    type: 'Call Started',
    message: 'Inbound call started from +44 20 7123 4567',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    source: 'Sapien',
    userName: 'John Smith',
  },
  {
    id: 'evt-002',
    type: 'Call Ended',
    message: 'Call ended after 5 minutes 23 seconds',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    source: 'Sapien',
    userName: 'John Smith',
  },
  {
    id: 'evt-003',
    type: 'User Login',
    message: 'User logged in via CTI',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    source: 'CTI',
    userName: 'Jane Doe',
  },
  {
    id: 'evt-004',
    type: 'Configuration Change',
    message: 'Routing policy "Sales Queue" updated',
    severity: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    source: 'Admin',
    userName: 'Admin User',
  },
  {
    id: 'evt-005',
    type: 'Recording Started',
    message: 'Call recording initiated for compliance',
    severity: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    source: 'Recording Service',
    userName: 'Bob Wilson',
  },
];

export const DEMO_ERROR_LOGS: ErrorLog[] = [
  {
    id: 'err-001',
    type: 'API Error',
    message: 'Failed to connect to Sapien API - timeout after 30 seconds',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    source: 'Gatekeeper',
    resolved: false,
  },
  {
    id: 'err-002',
    type: 'Authentication Error',
    message: 'Invalid OAuth token - token expired',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    source: 'Auth Service',
    resolved: true,
  },
];

export const DEMO_SERVICES: ServiceInfo[] = [
  {
    id: 'sapien',
    name: 'Sapien API',
    status: 'healthy',
    lastChecked: new Date().toISOString(),
    responseTime: 45,
  },
  {
    id: 'gatekeeper',
    name: 'Gatekeeper',
    status: 'healthy',
    lastChecked: new Date().toISOString(),
    responseTime: 23,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    status: 'healthy',
    lastChecked: new Date().toISOString(),
    responseTime: 120,
  },
  {
    id: 'recording',
    name: 'Recording Service',
    status: 'healthy',
    lastChecked: new Date().toISOString(),
    responseTime: 67,
  },
];

export const DEMO_MONITORING_STATS: MonitoringStats = {
  totalEvents: 156,
  totalErrors: 12,
  totalWarnings: 8,
  eventsLast24h: 45,
  errorsLast24h: 2,
  warningsLast24h: 3,
  services: DEMO_SERVICES,
};
