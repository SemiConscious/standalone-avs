/**
 * Call Status Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 * Note: Sapien API integration for real-time call data remains as external service.
 */

import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import { canUseSapienApi, sapienApiRequest, getOrganizationId } from '$lib/server/gatekeeper';
import type { PageServerLoad } from './$types';

interface SapienCall {
  id?: string;
  uuid?: string;
  direction?: string;
  state?: string;
  from?: string;
  to?: string;
  startTime?: string;
  answerTime?: string;
  userId?: number;
  feature?: string;
  channels?: Array<{
    uuid?: string;
    state?: string;
    from?: string;
    to?: string;
    userId?: number;
    createTime?: string;
    answerTime?: string;
    feature?: string;
  }>;
}

export interface ActiveCall {
  id: string;
  uuid: string;
  status: 'ringing' | 'connected' | 'on_hold' | 'transferring';
  direction: 'inbound' | 'outbound' | 'internal';
  fromNumber: string;
  toNumber: string;
  fromUserId?: number;
  toUserId?: number;
  fromUserName?: string;
  toUserName?: string;
  agentName?: string;
  agentExtension?: string;
  duration: number;
  queueName?: string;
  feature?: string;
  startTime: string;
  answerTime?: string;
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

export interface GroupOption {
  id: string;
  name: string;
  canListenIn: boolean;
}

export interface CallStatusPageData {
  stats: CallStatusStats;
  activeCalls: ActiveCall[];
  agents: AgentStatus[];
  groups: GroupOption[];
  selectedGroupId: string | null;
  isDemo: boolean;
  usingSapien: boolean;
  sapienConfigured: boolean;
  hasCallStatusPermission: boolean;
  canListenIn: boolean;
  sapienError?: string;
  permissionError?: string;
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
    fromUserName: 'External Caller',
    toUserName: 'John Smith',
    agentName: 'John Smith',
    agentExtension: '1001',
    duration: 225,
    queueName: 'Support',
    feature: 'Queue',
    startTime: new Date(Date.now() - 225000).toISOString(),
    answerTime: new Date(Date.now() - 200000).toISOString(),
  },
];

const DEMO_AGENTS: AgentStatus[] = [
  { id: 'a1', visibleId: 1001, name: 'John Smith', extension: '1001', status: 'on_call' },
  { id: 'a2', visibleId: 1002, name: 'Jane Doe', extension: '1002', status: 'available' },
];

const DEMO_GROUPS: GroupOption[] = [
  { id: 'g1', name: 'Support Queue', canListenIn: true },
  { id: 'g2', name: 'Sales Team', canListenIn: false },
];

function mapAgentStatus(status: string): AgentStatus['status'] {
  const s = status?.toLowerCase() || '';
  if (s.includes('available') || s.includes('ready')) return 'available';
  if (s.includes('busy') || s.includes('call')) return 'busy';
  if (s.includes('wrap')) return 'wrap_up';
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

export const load: PageServerLoad = async ({ locals, url }) => {
  const selectedGroupId = url.searchParams.get('group');
  
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return {
      stats: DEMO_STATS,
      activeCalls: DEMO_ACTIVE_CALLS,
      agents: DEMO_AGENTS,
      groups: DEMO_GROUPS,
      selectedGroupId: null,
      isDemo: true,
      usingSapien: false,
      sapienConfigured: true,
      hasCallStatusPermission: true,
      canListenIn: true,
    } satisfies CallStatusPageData;
  }

  const { repos, ctx, isDemo } = result;

  if (isDemo || !isSalesforceContext(ctx)) {
    return {
      stats: DEMO_STATS,
      activeCalls: DEMO_ACTIVE_CALLS,
      agents: DEMO_AGENTS,
      groups: DEMO_GROUPS,
      selectedGroupId: null,
      isDemo: true,
      usingSapien: false,
      sapienConfigured: true,
      hasCallStatusPermission: true,
      canListenIn: true,
    } satisfies CallStatusPageData;
  }

  let activeCalls: ActiveCall[] = [];
  let agents: AgentStatus[] = [];
  let groups: GroupOption[] = [];
  let usingSapien = false;
  let sapienError: string | undefined;
  let permissionError: string | undefined;
  let hasCallStatusPermission = false;
  let canListenIn = false;

  const sapienConfigured = canUseSapienApi(locals);
  const userIdToNameMap = new Map<number, { name: string; extension: string }>();

  // Find current user's Natterbox User using repository
  let currentNbUser = null;
  try {
    const sfUserId = locals.user?.id;
    if (sfUserId) {
      currentNbUser = await repos.users.findBySalesforceUserId(sfUserId);
    }
  } catch (e) {
    console.warn('Failed to find current Natterbox user:', e);
  }

  // Get groups with LiveCallStatus permission using repository
  if (currentNbUser) {
    try {
      const adminGroups = await repos.groups.getAdminGroupsForUser(currentNbUser.id);
      
      for (const group of adminGroups) {
        if (group.liveCallStatus) {
          groups.push({
            id: group.groupId,
            name: group.groupName,
            canListenIn: group.listenIn || false,
          });
          if (group.listenIn) {
            canListenIn = true;
          }
        }
      }

      hasCallStatusPermission = groups.length > 0;

      if (!hasCallStatusPermission) {
        permissionError = 'You do not have permission to view live call status.';
      }
    } catch (e) {
      console.warn('Failed to check group permissions:', e);
      hasCallStatusPermission = true;
    }
  } else {
    permissionError = 'Your Salesforce user is not linked to a Natterbox User.';
  }

  // Fetch agents using repository
  try {
    const usersResult = await repos.users.findAll({ 
      page: 1, 
      pageSize: 200,
      filters: { enabled: true }
    });

    agents = usersResult.items
      .filter(u => u.licenses.cti)
      .map((u) => {
        if (u.platformId) {
          userIdToNameMap.set(u.platformId, { name: u.name, extension: u.sipExtension || '' });
        }
        return {
          id: u.id,
          visibleId: u.platformId || 0,
          name: u.name,
          extension: u.sipExtension || '',
          status: mapAgentStatus(u.status),
        };
      });
  } catch (e) {
    console.warn('Failed to fetch user statuses:', e);
  }

  // Fetch real-time calls from Sapien (external API - not part of repository pattern)
  if (sapienConfigured && hasCallStatusPermission) {
    try {
      const organizationId = getOrganizationId();
      if (!organizationId) throw new Error('Organization ID not configured');

      const calls = await sapienApiRequest<{ data: SapienCall[] } | SapienCall[]>(
        ctx.instanceUrl,
        ctx.accessToken,
        'GET',
        `/organisation/${organizationId}/call`
      );

      const callsArray = Array.isArray(calls) ? calls : (calls?.data || []);

      if (callsArray && Array.isArray(callsArray)) {
        usingSapien = true;
        
        for (const call of callsArray) {
          let fromNumber = call.from || '';
          let toNumber = call.to || '';
          let fromUserId: number | undefined;
          let toUserId: number | undefined;
          let startTime = call.startTime || new Date().toISOString();
          let answerTime = call.answerTime;
          let feature = call.feature || '';

          if (call.channels && call.channels.length >= 1) {
            const ch1 = call.channels[0];
            fromNumber = ch1.from || fromNumber;
            fromUserId = ch1.userId;
            startTime = ch1.createTime || startTime;
            answerTime = ch1.answerTime || answerTime;
            feature = ch1.feature || feature;

            if (call.channels.length >= 2) {
              const ch2 = call.channels[1];
              toNumber = ch2.to || toNumber;
              toUserId = ch2.userId;
            }
          }

          const activeCall: ActiveCall = {
            id: call.id || call.uuid || String(activeCalls.length),
            uuid: call.uuid || call.id || '',
            status: mapCallState(call.state || ''),
            direction: mapCallDirection(call.direction || ''),
            fromNumber,
            toNumber,
            fromUserId,
            toUserId,
            fromUserName: fromUserId ? userIdToNameMap.get(fromUserId)?.name : undefined,
            toUserName: toUserId ? userIdToNameMap.get(toUserId)?.name : undefined,
            duration: startTime 
              ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
              : 0,
            startTime,
            answerTime,
            feature,
          };

          if (toUserId && userIdToNameMap.has(toUserId)) {
            const user = userIdToNameMap.get(toUserId)!;
            activeCall.agentName = user.name;
            activeCall.agentExtension = user.extension;
          }

          activeCalls.push(activeCall);
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Failed to fetch from Sapien:', errorMessage);
      sapienError = `Unable to fetch call data: ${errorMessage.substring(0, 80)}`;
    }
  }

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

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const currentCanListenIn = selectedGroup?.canListenIn ?? canListenIn;

  return {
    stats,
    activeCalls,
    agents,
    groups,
    selectedGroupId,
    isDemo: false,
    usingSapien,
    sapienConfigured,
    hasCallStatusPermission,
    canListenIn: currentCanListenIn,
    sapienError,
    permissionError,
  } satisfies CallStatusPageData;
};
