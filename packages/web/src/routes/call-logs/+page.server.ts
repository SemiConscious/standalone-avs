import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { getSapienConfig, getSapienJwt, canGetSapienJwt } from '$lib/server/sapien';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface SalesforceCallLog {
  Id: string;
  nbavs__DateTime__c: string;
  nbavs__FromNumber__c: string;
  nbavs__ToNumber__c: string;
  nbavs__Direction__c: string;
  nbavs__TimeTalking__c: number;
  nbavs__TimeRinging__c: number;
  nbavs__TimeHunting__c: number;
  nbavs__Recorded_A__c: boolean;
  nbavs__Recorded_B__c: boolean;
  nbavs__aUUId__c: string;
  nbavs__bUUId__c: string;
  nbavs__FromUser__c: string;
  nbavs__FromUser__r?: { Id: string; Name: string };
  nbavs__ToUser__c: string;
  nbavs__ToUser__r?: { Id: string; Name: string };
}

interface SalesforceUser {
  Id: string;
  Name: string;
  nbavs__Id__c: number;
}

export interface CallLog {
  id: string;
  dateTime: string;
  fromNumber: string;
  toNumber: string;
  direction: 'Inbound' | 'Outbound' | 'Internal';
  duration: number;
  ringingTime: number;
  huntingTime: number;
  hasRecording: boolean;
  recordingId?: string;
  fromUserId?: string;
  fromUserName?: string;
  toUserId?: string;
  toUserName?: string;
}

export interface CallLogsPageData {
  callLogs: CallLog[];
  users: { id: string; name: string }[];
  isDemo: boolean;
  totalCount: number;
  canPlayRecordings: boolean;
  error?: string;
}

// Demo data
const DEMO_CALL_LOGS: CallLog[] = [
  {
    id: '1',
    dateTime: '2026-01-05T14:23:00Z',
    fromNumber: '+44 7700 900123',
    toNumber: '+44 20 3510 0500',
    direction: 'Inbound',
    duration: 225,
    ringingTime: 8,
    huntingTime: 0,
    hasRecording: true,
    recordingId: 'rec-001',
    toUserName: 'John Smith',
  },
  {
    id: '2',
    dateTime: '2026-01-05T13:15:00Z',
    fromNumber: '+44 20 3510 0501',
    toNumber: '+44 7700 900456',
    direction: 'Outbound',
    duration: 750,
    ringingTime: 12,
    huntingTime: 0,
    hasRecording: true,
    recordingId: 'rec-002',
    fromUserName: 'Jane Doe',
  },
  {
    id: '3',
    dateTime: '2026-01-05T11:42:00Z',
    fromNumber: '+44 7700 900789',
    toNumber: '+44 20 3510 0500',
    direction: 'Inbound',
    duration: 0,
    ringingTime: 30,
    huntingTime: 15,
    hasRecording: false,
  },
  {
    id: '4',
    dateTime: '2026-01-05T10:30:00Z',
    fromNumber: '+44 20 3510 0502',
    toNumber: '+44 20 3510 0501',
    direction: 'Internal',
    duration: 180,
    ringingTime: 5,
    huntingTime: 0,
    hasRecording: true,
    recordingId: 'rec-004',
    fromUserName: 'Bob Johnson',
    toUserName: 'Jane Doe',
  },
  {
    id: '5',
    dateTime: '2026-01-05T09:15:00Z',
    fromNumber: '+44 7700 900111',
    toNumber: '+44 20 3510 0503',
    direction: 'Inbound',
    duration: 420,
    ringingTime: 10,
    huntingTime: 20,
    hasRecording: true,
    recordingId: 'rec-005',
    toUserName: 'Sarah Connor',
  },
];

const DEMO_USERS = [
  { id: 'u1', name: 'John Smith' },
  { id: 'u2', name: 'Jane Doe' },
  { id: 'u3', name: 'Bob Johnson' },
  { id: 'u4', name: 'Sarah Connor' },
];

export const load: PageServerLoad = async ({ locals, url }) => {
  // Check if we can play recordings (Sapien API configured)
  // We need SAPIEN_HOST to be set, and we'll get the org ID from the JWT when needed
  const sapienHost = env.SAPIEN_HOST;
  let canPlayRecordings = false;
  
  // If Sapien host is configured and we have Salesforce auth, try to verify Sapien access
  if (sapienHost && canGetSapienJwt(locals)) {
    try {
      // Get the JWT to verify we can access Sapien and extract org ID
      await getSapienJwt(
        locals.instanceUrl!,
        locals.accessToken!,
        'enduser:basic'
      );
      // If we got here, we can access Sapien
      const sapienConfig = getSapienConfig();
      canPlayRecordings = !!sapienConfig.organizationId;
    } catch (e) {
      console.warn('Could not verify Sapien access for recordings:', e);
      canPlayRecordings = false;
    }
  }

  // Demo mode
  if (env.PUBLIC_DEMO_MODE === 'true' || env.PUBLIC_DEMO_MODE === '1') {
    return {
      callLogs: DEMO_CALL_LOGS,
      users: DEMO_USERS,
      isDemo: true,
      totalCount: DEMO_CALL_LOGS.length,
      canPlayRecordings: false,
    } satisfies CallLogsPageData;
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return {
      callLogs: [],
      users: [],
      isDemo: false,
      totalCount: 0,
      canPlayRecordings: false,
      error: 'Not authenticated',
    } satisfies CallLogsPageData;
  }

  try {
    // Get search parameters
    const fromDate = url.searchParams.get('fromDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = url.searchParams.get('toDate') || new Date().toISOString().split('T')[0];
    const userId = url.searchParams.get('userId');
    const phoneNumber = url.searchParams.get('phoneNumber');
    const limit = parseInt(url.searchParams.get('limit') || '200', 10);

    // Build SOQL query with filters
    let whereClause = `WHERE nbavs__DateTime__c >= ${fromDate}T00:00:00Z AND nbavs__DateTime__c <= ${toDate}T23:59:59Z`;
    
    if (userId) {
      whereClause += ` AND (nbavs__FromUser__c = '${userId}' OR nbavs__ToUser__c = '${userId}')`;
    }
    
    if (phoneNumber) {
      whereClause += ` AND (nbavs__FromNumber__c LIKE '%${phoneNumber}%' OR nbavs__ToNumber__c LIKE '%${phoneNumber}%')`;
    }

    const callLogSoql = `
      SELECT Id, nbavs__DateTime__c, nbavs__FromNumber__c, nbavs__ToNumber__c,
             nbavs__Direction__c, nbavs__TimeTalking__c, nbavs__TimeRinging__c, nbavs__TimeHunting__c,
             nbavs__Recorded_A__c, nbavs__Recorded_B__c, nbavs__aUUId__c, nbavs__bUUId__c,
             nbavs__FromUser__c, nbavs__FromUser__r.Id, nbavs__FromUser__r.Name,
             nbavs__ToUser__c, nbavs__ToUser__r.Id, nbavs__ToUser__r.Name
      FROM nbavs__CallLog__c
      ${whereClause}
      ORDER BY nbavs__DateTime__c DESC
      LIMIT ${limit}
    `;

    const callLogResult = await querySalesforce<SalesforceCallLog>(
      locals.instanceUrl!,
      locals.accessToken!,
      callLogSoql
    );

    // Fetch users for the filter dropdown
    const userSoql = `
      SELECT Id, Name, nbavs__Id__c
      FROM nbavs__User__c
      ORDER BY Name
      LIMIT 5000
    `;

    const userResult = await querySalesforce<SalesforceUser>(
      locals.instanceUrl!,
      locals.accessToken!,
      userSoql
    );

    const callLogs: CallLog[] = callLogResult.records.map((cl) => ({
      id: cl.Id,
      dateTime: cl.nbavs__DateTime__c,
      fromNumber: cl.nbavs__FromNumber__c || '',
      toNumber: cl.nbavs__ToNumber__c || '',
      direction: (cl.nbavs__Direction__c as CallLog['direction']) || 'Inbound',
      duration: cl.nbavs__TimeTalking__c || 0,
      ringingTime: cl.nbavs__TimeRinging__c || 0,
      huntingTime: cl.nbavs__TimeHunting__c || 0,
      hasRecording: cl.nbavs__Recorded_A__c || cl.nbavs__Recorded_B__c || false,
      recordingId: cl.nbavs__aUUId__c || cl.nbavs__bUUId__c,
      fromUserId: cl.nbavs__FromUser__r?.Id,
      fromUserName: cl.nbavs__FromUser__r?.Name,
      toUserId: cl.nbavs__ToUser__r?.Id,
      toUserName: cl.nbavs__ToUser__r?.Name,
    }));

    const users = userResult.records.map((u) => ({
      id: u.Id,
      name: u.Name,
    }));

    return {
      callLogs,
      users,
      isDemo: false,
      totalCount: callLogResult.totalSize,
      canPlayRecordings,
    } satisfies CallLogsPageData;
  } catch (error) {
    console.error('Failed to fetch call logs:', error);
    return {
      callLogs: [],
      users: [],
      isDemo: false,
      totalCount: 0,
      canPlayRecordings,
      error: 'Failed to load call logs',
    } satisfies CallLogsPageData;
  }
};

