import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { 
  getSapienJwt, 
  getSapienConfig, 
  canGetSapienJwt,
  sapienRequest,
  SAPIEN_SCOPES,
} from '$lib/server/sapien';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface SalesforceUser {
  Id: string;
  Name: string;
  nbavs__Status__c: string;
  nbavs__CTI__c: boolean;
  nbavs__SipExtension__c: string;
  nbavs__Id__c: number;
}

interface SapienCall {
  id?: string;
  uuid?: string;
  direction?: string;
  state?: string;
  from?: string;
  to?: string;
  startTime?: string;
  answerTime?: string;
  user?: string;
  userId?: number;
  channel?: {
    uuid?: string;
    state?: string;
    from?: string;
    to?: string;
  };
}

export interface ActiveCall {
  id: string;
  uuid: string;
  status: 'ringing' | 'connected' | 'on_hold' | 'transferring';
  direction: 'inbound' | 'outbound' | 'internal';
  fromNumber: string;
  toNumber: string;
  agentName?: string;
  agentExtension?: string;
  duration: number;
  queueName?: string;
  startTime: string;
}

export interface AgentStatus {
  id: string;
  visibleId: number;
  name: string;
  extension: string;
  status: 'available' | 'busy' | 'offline' | 'on_call' | 'wrap_up';
}

export interface CallStatusStats {
  activeCalls: number;
  callsWaiting: number;
  agentsAvailable: number;
  agentsBusy: number;
  avgWaitTime: number;
  longestWait: number;
}

export interface CallStatusPageData {
  stats: CallStatusStats;
  activeCalls: ActiveCall[];
  agents: AgentStatus[];
  isDemo: boolean;
  usingSapien: boolean;
  sapienError?: string;
  error?: string;
}

// Demo data
const DEMO_STATS: CallStatusStats = {
  activeCalls: 12,
  callsWaiting: 5,
  agentsAvailable: 28,
  agentsBusy: 12,
  avgWaitTime: 154,
  longestWait: 312,
};

const DEMO_ACTIVE_CALLS: ActiveCall[] = [
  {
    id: '1',
    uuid: 'demo-uuid-1',
    status: 'connected',
    direction: 'inbound',
    fromNumber: '+44 7700 900123',
    toNumber: '+44 20 3510 0500',
    agentName: 'John Smith',
    agentExtension: '1001',
    duration: 225,
    queueName: 'Support',
    startTime: new Date(Date.now() - 225000).toISOString(),
  },
  {
    id: '2',
    uuid: 'demo-uuid-2',
    status: 'ringing',
    direction: 'inbound',
    fromNumber: '+44 7700 900456',
    toNumber: '+44 20 3510 0501',
    agentName: 'Jane Doe',
    agentExtension: '1002',
    duration: 12,
    queueName: 'Sales',
    startTime: new Date(Date.now() - 12000).toISOString(),
  },
  {
    id: '3',
    uuid: 'demo-uuid-3',
    status: 'on_hold',
    direction: 'inbound',
    fromNumber: '+44 7700 900789',
    toNumber: '+44 20 3510 0502',
    agentName: 'Bob Johnson',
    agentExtension: '1003',
    duration: 90,
    queueName: 'Support',
    startTime: new Date(Date.now() - 90000).toISOString(),
  },
];

const DEMO_AGENTS: AgentStatus[] = [
  { id: 'a1', visibleId: 1001, name: 'John Smith', extension: '1001', status: 'on_call' },
  { id: 'a2', visibleId: 1002, name: 'Jane Doe', extension: '1002', status: 'on_call' },
  { id: 'a3', visibleId: 1003, name: 'Bob Johnson', extension: '1003', status: 'on_call' },
  { id: 'a4', visibleId: 1004, name: 'Alice Brown', extension: '1004', status: 'available' },
  { id: 'a5', visibleId: 1005, name: 'Charlie Green', extension: '1005', status: 'offline' },
];

function mapAgentStatus(status: string): AgentStatus['status'] {
  const s = status?.toLowerCase() || '';
  if (s.includes('available') || s.includes('ready')) return 'available';
  if (s.includes('busy') || s.includes('call')) return 'busy';
  if (s.includes('wrap')) return 'wrap_up';
  if (s.includes('offline') || s.includes('logged out')) return 'offline';
  return 'offline';
}

function mapCallState(state: string): ActiveCall['status'] {
  const s = state?.toLowerCase() || '';
  if (s.includes('ring')) return 'ringing';
  if (s.includes('hold')) return 'on_hold';
  if (s.includes('transfer')) return 'transferring';
  return 'connected';
}

function mapCallDirection(direction: string): ActiveCall['direction'] {
  const d = direction?.toLowerCase() || '';
  if (d.includes('in')) return 'inbound';
  if (d.includes('out')) return 'outbound';
  return 'internal';
}

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      stats: DEMO_STATS,
      activeCalls: DEMO_ACTIVE_CALLS,
      agents: DEMO_AGENTS,
      isDemo: true,
      usingSapien: false,
    } satisfies CallStatusPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      stats: { activeCalls: 0, callsWaiting: 0, agentsAvailable: 0, agentsBusy: 0, avgWaitTime: 0, longestWait: 0 },
      activeCalls: [],
      agents: [],
      isDemo: false,
      usingSapien: false,
      error: 'Not authenticated',
    } satisfies CallStatusPageData;
  }

  let activeCalls: ActiveCall[] = [];
  let agents: AgentStatus[] = [];
  let usingSapien = false;
  let sapienError: string | undefined;

  // Check if Sapien API is configured
  const sapienHost = env.SAPIEN_HOST;
  const canUseSapien = !!sapienHost && canGetSapienJwt(locals);

  // Try to get real-time call data from Sapien API
  if (canUseSapien && sapienHost) {
    try {
      // Get JWT with flightdeck:basic scope (same as Salesforce wallboards use)
      const jwt = await getSapienJwt(
        locals.instanceUrl!,
        locals.accessToken!,
        SAPIEN_SCOPES.FLIGHTDECK_BASIC
      );

      // Get org ID from cached JWT
      const sapienConfig = getSapienConfig();
      
      if (!sapienConfig.organizationId) {
        console.warn('No organization ID found in JWT');
        throw new Error('No organization ID in JWT');
      }

      console.log(`Fetching calls from Sapien: ${sapienHost}/organisation/${sapienConfig.organizationId}/call`);
      
      // Fetch active calls from Sapien (same endpoint as Salesforce APIController.getCalls())
      const calls = await sapienRequest<SapienCall[]>(
        sapienHost,
        jwt,
        'GET',
        `/organisation/${sapienConfig.organizationId}/call`
      );

      if (calls && Array.isArray(calls)) {
        usingSapien = true;
        activeCalls = calls.map((call, index) => ({
          id: call.id || call.uuid || String(index),
          uuid: call.uuid || call.id || '',
          status: mapCallState(call.state || ''),
          direction: mapCallDirection(call.direction || ''),
          fromNumber: call.from || call.channel?.from || '',
          toNumber: call.to || call.channel?.to || '',
          duration: call.startTime 
            ? Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000)
            : 0,
          startTime: call.startTime || new Date().toISOString(),
        }));
        console.log(`Got ${activeCalls.length} active calls from Sapien`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Failed to fetch from Sapien:', errorMessage);
      
      // Set user-friendly error message
      if (errorMessage.includes('403')) {
        sapienError = 'Access denied to Sapien call data (may require Manager license)';
      } else if (errorMessage.includes('401')) {
        sapienError = 'Sapien authentication failed';
      } else if (errorMessage.includes('404')) {
        sapienError = 'Sapien call endpoint not found';
      } else {
        sapienError = `Sapien API error: ${errorMessage.substring(0, 100)}`;
      }
    }
  }

  // Fetch agent statuses from Salesforce (always do this)
  try {
    const userSoql = `
      SELECT Id, Name, nbavs__Status__c, nbavs__CTI__c, nbavs__SipExtension__c, nbavs__Id__c
      FROM nbavs__User__c
      WHERE nbavs__CTI__c = true AND nbavs__Enabled__c = true
      ORDER BY Name
      LIMIT 200
    `;

    const userResult = await querySalesforce<SalesforceUser>(
      locals.instanceUrl!,
      locals.accessToken!,
      userSoql
    );

    agents = userResult.records.map((u) => ({
      id: u.Id,
      visibleId: u.nbavs__Id__c,
      name: u.Name,
      extension: u.nbavs__SipExtension__c || '',
      status: mapAgentStatus(u.nbavs__Status__c),
    }));
  } catch (e) {
    console.warn('Failed to fetch user statuses:', e);
  }

  // Calculate stats
  const agentsAvailable = agents.filter(a => a.status === 'available').length;
  const agentsBusy = agents.filter(a => a.status === 'busy' || a.status === 'on_call').length;

  const stats: CallStatusStats = {
    activeCalls: activeCalls.length,
    callsWaiting: activeCalls.filter(c => c.status === 'ringing').length,
    agentsAvailable,
    agentsBusy,
    avgWaitTime: 0,
    longestWait: 0,
  };

  return {
    stats,
    activeCalls,
    agents,
    isDemo: false,
    usingSapien,
    sapienError,
  } satisfies CallStatusPageData;
};
