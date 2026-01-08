import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { 
  canUseSapienApi,
  sapienApiRequest,
  getOrganizationId,
} from '$lib/server/gatekeeper';
import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';

interface SapienCall {
  id: string;
  state: string;
  direction: string;
  callerIdNumber?: string;
  destinationNumber?: string;
  timeStart?: string;
  timeRinging?: number;
  timeTalking?: number;
  user?: {
    id: number;
    name: string;
    extension: string;
  };
  queue?: {
    id: number;
    name: string;
  };
}

interface SalesforceUser {
  Id: string;
  Name: string;
  nbavs__Status__c: string;
  nbavs__CTI__c: boolean;
}

export interface WallboardStats {
  activeCalls: number;
  callsWaiting: number;
  agentsAvailable: number;
  agentsBusy: number;
  agentsOffline: number;
  totalCallsToday: number;
  avgCallDuration: number;
  avgWaitTime: number;
  longestWait: number;
  callsByQueue: { name: string; count: number }[];
  callsByDirection: { inbound: number; outbound: number; internal: number };
  timestamp: string;
}

export const GET: RequestHandler = async ({ locals }) => {
  // Check authentication
  if (!locals.accessToken || !locals.instanceUrl) {
    throw error(401, 'Not authenticated');
  }

  const sapienHost = env.SAPIEN_HOST;
  const stats: WallboardStats = {
    activeCalls: 0,
    callsWaiting: 0,
    agentsAvailable: 0,
    agentsBusy: 0,
    agentsOffline: 0,
    totalCallsToday: 0,
    avgCallDuration: 0,
    avgWaitTime: 0,
    longestWait: 0,
    callsByQueue: [],
    callsByDirection: { inbound: 0, outbound: 0, internal: 0 },
    timestamp: new Date().toISOString(),
  };

  // Try to get real-time call data from Sapien
  if (canUseSapienApi(locals)) {
    try {
      // Get org ID from cached settings
      const organizationId = getOrganizationId();
      if (!organizationId) {
        throw new Error('No organization ID configured');
      }

      // Fetch active calls using Sapien access token (same as RestClient in avs-sfdx)
      const calls = await sapienApiRequest<SapienCall[]>(
        locals.instanceUrl!,
        locals.accessToken!,
        'GET',
        `/organisation/${organizationId}/call`
      );

      if (Array.isArray(calls)) {
        stats.activeCalls = calls.length;
        stats.callsWaiting = calls.filter(c => c.state?.toLowerCase().includes('ring')).length;

        // Count by direction
        calls.forEach(call => {
          const dir = call.direction?.toLowerCase() || '';
          if (dir.includes('inbound') || dir.includes('in')) {
            stats.callsByDirection.inbound++;
          } else if (dir.includes('outbound') || dir.includes('out')) {
            stats.callsByDirection.outbound++;
          } else {
            stats.callsByDirection.internal++;
          }
        });

        // Group by queue
        const queueCounts: Record<string, number> = {};
        calls.forEach(call => {
          if (call.queue?.name) {
            queueCounts[call.queue.name] = (queueCounts[call.queue.name] || 0) + 1;
          }
        });
        stats.callsByQueue = Object.entries(queueCounts).map(([name, count]) => ({ name, count }));

        // Calculate wait times for ringing calls
        const ringingCalls = calls.filter(c => c.state?.toLowerCase().includes('ring'));
        if (ringingCalls.length > 0) {
          const now = Date.now();
          const waitTimes = ringingCalls.map(c => {
            const startTime = c.timeStart ? new Date(c.timeStart).getTime() : now;
            return Math.max(0, Math.floor((now - startTime) / 1000));
          });
          stats.avgWaitTime = Math.floor(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
          stats.longestWait = Math.max(...waitTimes);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Sapien calls for wallboard:', e);
    }
  }

  // Fetch agent statuses from Salesforce
  try {
    if (hasValidCredentials(locals)) {
      const userSoql = `
        SELECT Id, Name, nbavs__Status__c, nbavs__CTI__c
        FROM nbavs__User__c
        WHERE nbavs__CTI__c = true AND nbavs__Enabled__c = true
        LIMIT 500
      `;

      const userResult = await querySalesforce<SalesforceUser>(
        locals.instanceUrl!,
        locals.accessToken!,
        userSoql
      );

      userResult.records.forEach(u => {
        const status = u.nbavs__Status__c?.toLowerCase() || '';
        if (status.includes('available') || status.includes('ready')) {
          stats.agentsAvailable++;
        } else if (status.includes('busy') || status.includes('call')) {
          stats.agentsBusy++;
        } else {
          stats.agentsOffline++;
        }
      });

      // Also try to get today's call count
      const today = new Date().toISOString().split('T')[0];
      try {
        const callCountSoql = `
          SELECT COUNT() cnt
          FROM nbavs__CallLog__c
          WHERE nbavs__DateTime__c >= ${today}T00:00:00Z
        `;
        const countResult = await querySalesforce<{ cnt: number }>(
          locals.instanceUrl!,
          locals.accessToken!,
          callCountSoql
        );
        stats.totalCallsToday = countResult.totalSize || 0;
      } catch (e) {
        // Count query may fail on some orgs
      }
    }
  } catch (e) {
    console.error('Failed to fetch user statuses for wallboard:', e);
  }

  return json(stats);
};
