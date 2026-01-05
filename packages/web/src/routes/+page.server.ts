import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

interface DashboardStats {
  totalUsers: number;
  activeGroups: number;
  registeredDevices: number;
  activeCallFlows: number;
}

interface SoqlCountResult {
  totalSize: number;
  done: boolean;
  records: Array<{ expr0: number }>;
}

/**
 * Demo mode stats - used when DEMO_MODE=true or when not authenticated
 */
const DEMO_STATS: DashboardStats = {
  totalUsers: 142,
  activeGroups: 24,
  registeredDevices: 89,
  activeCallFlows: 18,
};

/**
 * Check if demo mode is enabled
 */
function isDemoMode(): boolean {
  return env.DEMO_MODE === 'true' || env.DEMO_MODE === '1';
}

async function fetchSalesforceCount(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  whereClause?: string
): Promise<number> {
  const query = whereClause
    ? `SELECT COUNT() FROM ${objectName} WHERE ${whereClause}`
    : `SELECT COUNT() FROM ${objectName}`;

  const url = `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch count for ${objectName}:`, await response.text());
    return 0;
  }

  const result = (await response.json()) as SoqlCountResult;
  return result.totalSize;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Demo mode - return mock data without authentication
  if (isDemoMode()) {
    return {
      stats: DEMO_STATS,
      isDemo: true,
    };
  }

  // If not authenticated, return null stats
  if (!locals.accessToken || !locals.instanceUrl) {
    return {
      stats: null,
    };
  }

  try {
    // Fetch counts from Salesforce in parallel
    const [totalUsers, activeGroups, registeredDevices, activeCallFlows] = await Promise.all([
      fetchSalesforceCount(locals.instanceUrl, locals.accessToken, 'User__c'),
      fetchSalesforceCount(locals.instanceUrl, locals.accessToken, 'Group__c'),
      fetchSalesforceCount(locals.instanceUrl, locals.accessToken, 'Device__c'),
      fetchSalesforceCount(locals.instanceUrl, locals.accessToken, 'CallFlow__c', "Status__c = 'Active'"),
    ]);

    const stats: DashboardStats = {
      totalUsers,
      activeGroups,
      registeredDevices,
      activeCallFlows,
    };

    return {
      stats,
      isDemo: false,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return {
      stats: null,
      error: 'Failed to load dashboard data',
    };
  }
};

