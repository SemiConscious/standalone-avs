/**
 * Homepage Server
 * 
 * Platform-aware dashboard that shows stats for the current platform.
 */

import type { PageServerLoad } from './$types';
import { createAdapterContext, isSalesforceContext } from '$lib/adapters';

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
 * Demo mode stats
 */
const DEMO_STATS: DashboardStats = {
  totalUsers: 142,
  activeGroups: 24,
  registeredDevices: 89,
  activeCallFlows: 18,
};

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

  console.log(`[Salesforce Query] ${query}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Salesforce Error] ${objectName}: ${response.status} - ${errorText}`);
    return 0;
  }

  const result = (await response.json()) as SoqlCountResult;
  console.log(`[Salesforce Result] ${objectName}: ${result.totalSize} records`);
  return result.totalSize;
}

export const load: PageServerLoad = async ({ locals }) => {
  // Create adapter context
  let ctx;
  try {
    ctx = createAdapterContext(locals);
  } catch {
    // If context creation fails, return demo data
    return {
      stats: DEMO_STATS,
      isDemo: true,
    };
  }

  // Demo mode - return demo stats
  if (!isSalesforceContext(ctx)) {
    return {
      stats: DEMO_STATS,
      isDemo: true,
    };
  }

  // Salesforce mode - fetch real stats
  try {
    const ns = 'nbavs';

    const [users, groups, devices, callFlows] = await Promise.all([
      fetchSalesforceCount(ctx.instanceUrl, ctx.accessToken, `${ns}__User__c`),
      fetchSalesforceCount(ctx.instanceUrl, ctx.accessToken, `${ns}__Group__c`),
      fetchSalesforceCount(ctx.instanceUrl, ctx.accessToken, `${ns}__Device__c`),
      fetchSalesforceCount(ctx.instanceUrl, ctx.accessToken, `${ns}__CallFlow__c`),
    ]);

    return {
      stats: {
        totalUsers: users,
        activeGroups: groups,
        registeredDevices: devices,
        activeCallFlows: callFlows,
      } satisfies DashboardStats,
      isDemo: false,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return {
      stats: null,
      isDemo: false,
      error: 'Failed to load dashboard',
    };
  }
};
