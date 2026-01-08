import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { 
  canUseSapienApi,
  sapienApiRequest,
  getOrganizationId,
} from '$lib/server/gatekeeper';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

interface SalesforceUser {
  Id: string;
  Name: string;
  nbavs__Status__c: string;
  nbavs__CTI__c: boolean;
  nbavs__SipExtension__c: string;
  nbavs__Id__c: number;
  User__c?: string;
}

interface SalesforceGroup {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
  nbavs__PBX__c: boolean;
  nbavs__Manager__c: boolean;
}

interface SalesforceGroupAdministrator {
  nbavs__Group__c: string;
  nbavs__LiveCallStatus__c: boolean;
  nbavs__ListenIn__c: boolean;
}

interface SalesforceGroupMember {
  nbavs__Group__c: string;
  nbavs__User__c: string;
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
  {
    id: '2',
    uuid: 'demo-uuid-2',
    status: 'ringing',
    direction: 'inbound',
    fromNumber: '+44 7700 900456',
    toNumber: '+44 20 3510 0501',
    toUserName: 'Jane Doe',
    agentName: 'Jane Doe',
    agentExtension: '1002',
    duration: 12,
    queueName: 'Sales',
    feature: 'Hunt Group',
    startTime: new Date(Date.now() - 12000).toISOString(),
  },
  {
    id: '3',
    uuid: 'demo-uuid-3',
    status: 'on_hold',
    direction: 'inbound',
    fromNumber: '+44 7700 900789',
    toNumber: '+44 20 3510 0502',
    toUserName: 'Bob Johnson',
    agentName: 'Bob Johnson',
    agentExtension: '1003',
    duration: 90,
    queueName: 'Support',
    feature: 'Queue',
    startTime: new Date(Date.now() - 90000).toISOString(),
    answerTime: new Date(Date.now() - 85000).toISOString(),
  },
];

const DEMO_AGENTS: AgentStatus[] = [
  { id: 'a1', visibleId: 1001, name: 'John Smith', extension: '1001', status: 'on_call' },
  { id: 'a2', visibleId: 1002, name: 'Jane Doe', extension: '1002', status: 'on_call' },
  { id: 'a3', visibleId: 1003, name: 'Bob Johnson', extension: '1003', status: 'on_call' },
  { id: 'a4', visibleId: 1004, name: 'Alice Brown', extension: '1004', status: 'available' },
  { id: 'a5', visibleId: 1005, name: 'Charlie Green', extension: '1005', status: 'offline' },
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

export const load: PageServerLoad = async ({ locals, url }) => {
  const selectedGroupId = url.searchParams.get('group');
  
  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
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

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      stats: { activeCalls: 0, callsWaiting: 0, agentsAvailable: 0, agentsBusy: 0, avgWaitTime: 0, longestWait: 0 },
      activeCalls: [],
      agents: [],
      groups: [],
      selectedGroupId: null,
      isDemo: false,
      usingSapien: false,
      sapienConfigured: false,
      hasCallStatusPermission: false,
      canListenIn: false,
      error: 'Not authenticated',
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

  // Check if Sapien API is configured
  const sapienConfigured = canUseSapienApi(locals);

  // Build a map of user IDs to names for call display
  const userIdToNameMap = new Map<number, { name: string; extension: string }>();

  // ===== STEP 1: Find the current user's Natterbox User ID =====
  let currentNbUserId: string | null = null;
  try {
    const currentUserSoql = `
      SELECT Id FROM ${NAMESPACE}__User__c 
      WHERE ${NAMESPACE}__User__c = '${locals.user?.id}'
      LIMIT 1
    `;
    const currentUserResult = await querySalesforce<{ Id: string }>(
      locals.instanceUrl!,
      locals.accessToken!,
      currentUserSoql
    );
    if (currentUserResult.records.length > 0) {
      currentNbUserId = currentUserResult.records[0].Id;
    }
  } catch (e) {
    console.warn('Failed to find current Natterbox user:', e);
  }

  // ===== STEP 2: Get groups where user has LiveCallStatus permission =====
  if (currentNbUserId) {
    try {
      // Get groups where user is a GroupAdministrator with LiveCallStatus enabled
      const adminGroupsSoql = `
        SELECT ${NAMESPACE}__Group__c, ${NAMESPACE}__Group__r.Name, ${NAMESPACE}__Group__r.${NAMESPACE}__Id__c,
               ${NAMESPACE}__ListenIn__c
        FROM ${NAMESPACE}__GroupAdministrator__c
        WHERE ${NAMESPACE}__User__c = '${currentNbUserId}'
          AND ${NAMESPACE}__LiveCallStatus__c = true
          AND (${NAMESPACE}__Group__r.${NAMESPACE}__PBX__c = true OR ${NAMESPACE}__Group__r.${NAMESPACE}__Manager__c = true)
      `;
      
      const adminResult = await querySalesforce<{
        nbavs__Group__c: string;
        nbavs__Group__r: { Name: string; nbavs__Id__c: number };
        nbavs__ListenIn__c: boolean;
      }>(locals.instanceUrl!, locals.accessToken!, adminGroupsSoql);

      const adminGroupIds = new Set<string>();
      for (const rec of adminResult.records) {
        adminGroupIds.add(rec.nbavs__Group__c);
        groups.push({
          id: rec.nbavs__Group__c,
          name: rec.nbavs__Group__r?.Name || 'Unknown Group',
          canListenIn: rec.nbavs__ListenIn__c || false,
        });
        if (rec.nbavs__ListenIn__c) {
          canListenIn = true;
        }
      }

      // Also check for "All Members" permission on groups where user is a member
      const memberGroupsSoql = `
        SELECT ${NAMESPACE}__Group__c, ${NAMESPACE}__Group__r.Name, ${NAMESPACE}__Group__r.${NAMESPACE}__Id__c
        FROM ${NAMESPACE}__GroupMember__c
        WHERE ${NAMESPACE}__User__c = '${currentNbUserId}'
          AND (${NAMESPACE}__Group__r.${NAMESPACE}__PBX__c = true OR ${NAMESPACE}__Group__r.${NAMESPACE}__Manager__c = true)
      `;
      
      const memberResult = await querySalesforce<{
        nbavs__Group__c: string;
        nbavs__Group__r: { Name: string; nbavs__Id__c: number };
      }>(locals.instanceUrl!, locals.accessToken!, memberGroupsSoql);

      const memberGroupIds = memberResult.records.map(r => r.nbavs__Group__c);
      
      if (memberGroupIds.length > 0) {
        // Check if "All Members" has LiveCallStatus permission for these groups
        const allMembersCheckSoql = `
          SELECT ${NAMESPACE}__Group__c, ${NAMESPACE}__Group__r.Name, ${NAMESPACE}__Group__r.${NAMESPACE}__Id__c,
                 ${NAMESPACE}__ListenIn__c
          FROM ${NAMESPACE}__GroupAdministrator__c
          WHERE ${NAMESPACE}__Name__c = 'All Members'
            AND ${NAMESPACE}__LiveCallStatus__c = true
            AND ${NAMESPACE}__Group__c IN ('${memberGroupIds.join("','")}')
        `;
        
        const allMembersResult = await querySalesforce<{
          nbavs__Group__c: string;
          nbavs__Group__r: { Name: string; nbavs__Id__c: number };
          nbavs__ListenIn__c: boolean;
        }>(locals.instanceUrl!, locals.accessToken!, allMembersCheckSoql);

        for (const rec of allMembersResult.records) {
          if (!adminGroupIds.has(rec.nbavs__Group__c)) {
            groups.push({
              id: rec.nbavs__Group__c,
              name: rec.nbavs__Group__r?.Name || 'Unknown Group',
              canListenIn: rec.nbavs__ListenIn__c || false,
            });
            if (rec.nbavs__ListenIn__c) {
              canListenIn = true;
            }
          }
        }
      }

      hasCallStatusPermission = groups.length > 0;

      if (!hasCallStatusPermission) {
        permissionError = 'You do not have permission to view live call status. Contact your administrator to enable Live Call Status access via Group Administrator settings.';
      }
    } catch (e) {
      console.warn('Failed to check group permissions:', e);
      // Fall back to showing all agents without group filtering
      hasCallStatusPermission = true;
    }
  } else {
    permissionError = 'Your Salesforce user is not linked to a Natterbox User. Contact your administrator.';
  }

  // ===== STEP 3: Fetch agents (filtered by group if selected) =====
  try {
    let userSoql: string;
    
    if (selectedGroupId && groups.some(g => g.id === selectedGroupId)) {
      // Filter by selected group members
      userSoql = `
        SELECT Id, Name, ${NAMESPACE}__Status__c, ${NAMESPACE}__CTI__c, ${NAMESPACE}__SipExtension__c, ${NAMESPACE}__Id__c
        FROM ${NAMESPACE}__User__c
        WHERE ${NAMESPACE}__CTI__c = true 
          AND ${NAMESPACE}__Enabled__c = true
          AND Id IN (SELECT ${NAMESPACE}__User__c FROM ${NAMESPACE}__GroupMember__c WHERE ${NAMESPACE}__Group__c = '${selectedGroupId}')
        ORDER BY Name
        LIMIT 200
      `;
    } else {
      // Show all CTI-enabled agents
      userSoql = `
        SELECT Id, Name, ${NAMESPACE}__Status__c, ${NAMESPACE}__CTI__c, ${NAMESPACE}__SipExtension__c, ${NAMESPACE}__Id__c
        FROM ${NAMESPACE}__User__c
        WHERE ${NAMESPACE}__CTI__c = true AND ${NAMESPACE}__Enabled__c = true
        ORDER BY Name
        LIMIT 200
      `;
    }

    const userResult = await querySalesforce<SalesforceUser>(
      locals.instanceUrl!,
      locals.accessToken!,
      userSoql
    );

    agents = userResult.records.map((u) => {
      // Build the user map for call display
      if (u.nbavs__Id__c) {
        userIdToNameMap.set(u.nbavs__Id__c, { name: u.Name, extension: u.nbavs__SipExtension__c || '' });
      }
      return {
        id: u.Id,
        visibleId: u.nbavs__Id__c,
        name: u.Name,
        extension: u.nbavs__SipExtension__c || '',
        status: mapAgentStatus(u.nbavs__Status__c),
      };
    });
  } catch (e) {
    console.warn('Failed to fetch user statuses:', e);
  }

  // ===== STEP 4: Try to get real-time call data from Sapien API =====
  if (sapienConfigured && hasCallStatusPermission) {
    try {
      const organizationId = getOrganizationId();
      
      if (!organizationId) {
        throw new Error('Organization ID not configured');
      }

      const calls = await sapienApiRequest<{ data: SapienCall[] } | SapienCall[]>(
        locals.instanceUrl!,
        locals.accessToken!,
        'GET',
        `/organisation/${organizationId}/call`
      );

      // Handle both { data: [...] } and [...] response formats
      const callsArray = Array.isArray(calls) ? calls : (calls?.data || []);

      if (callsArray && Array.isArray(callsArray)) {
        usingSapien = true;
        
        // Get user IDs involved in calls (for filtering by group)
        const groupUserIds = selectedGroupId 
          ? new Set(agents.map(a => a.visibleId))
          : null;

        for (const call of callsArray) {
          // Parse channels if present (like avs-sfdx does)
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

          // Filter by group if selected
          if (groupUserIds) {
            const fromInGroup = fromUserId && groupUserIds.has(fromUserId);
            const toInGroup = toUserId && groupUserIds.has(toUserId);
            if (!fromInGroup && !toInGroup) {
              continue; // Skip calls not involving group members
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

          // Set agent info from either from or to user
          if (toUserId && userIdToNameMap.has(toUserId)) {
            const user = userIdToNameMap.get(toUserId)!;
            activeCall.agentName = user.name;
            activeCall.agentExtension = user.extension;
          } else if (fromUserId && userIdToNameMap.has(fromUserId)) {
            const user = userIdToNameMap.get(fromUserId)!;
            activeCall.agentName = user.name;
            activeCall.agentExtension = user.extension;
          }

          activeCalls.push(activeCall);
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Failed to fetch from Sapien:', errorMessage);
      
      if (errorMessage.includes('403')) {
        sapienError = 'Access denied to call data. You may need a Manager license or Live Call Status permission.';
      } else if (errorMessage.includes('401')) {
        sapienError = 'Sapien authentication failed. Please try logging out and back in.';
      } else if (errorMessage.includes('404')) {
        sapienError = 'Call data endpoint not found. The Sapien API may be unavailable.';
      } else if (errorMessage.includes('Organization ID')) {
        sapienError = 'Organization not configured. Contact your administrator.';
      } else {
        sapienError = `Unable to fetch call data: ${errorMessage.substring(0, 80)}`;
      }
    }
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

  // Check if Listen In is allowed for selected group
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
