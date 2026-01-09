/**
 * Admin Page Server
 * 
 * Uses repository pattern for platform-agnostic data loading.
 */

import { tryCreateContextAndRepositories, isSalesforceContext } from '$lib/adapters';
import { getLicenseFromSapien, isCallReportingRunning, fetchApiSettings, clearAllCaches, getSalesforceOrgId } from '$lib/server/gatekeeper';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

interface ScheduledJob {
  id: string;
  name: string;
  isRunning: boolean;
  canStart: boolean;
  canStop: boolean;
}

interface Subscription {
  name: string;
  enabled: boolean;
  count: number;
  icon: string;
  color: string;
}

export interface AdminData {
  inventory: {
    users: number;
    phoneNumbers: number;
    devices: number;
    groups: number;
    routingPolicies: number;
  };
  monitoring: {
    recordingAccessCount: number;
    eventLogsToday: number;
    errorLogsToday: number;
  };
  subscriptions: Subscription[];
  subscriptionsUpdated?: string;
  scheduledJobs: ScheduledJob[];
  jobsRunning: number;
  organizationId: string;
  instanceUrl: string;
  isDemo: boolean;
  error?: string;
}

// Demo data
const DEMO_DATA: AdminData = {
  inventory: {
    users: 311,
    phoneNumbers: 903,
    devices: 539,
    groups: 36,
    routingPolicies: 63,
  },
  monitoring: {
    recordingAccessCount: 33,
    eventLogsToday: 6,
    errorLogsToday: 2,
  },
  subscriptions: [
    { name: 'Voice', enabled: true, count: 250, icon: 'phone', color: 'blue' },
    { name: 'Contact Centre', enabled: true, count: 250, icon: 'headset', color: 'green' },
    { name: 'Record', enabled: true, count: 250, icon: 'mic', color: 'red' },
    { name: 'CTI', enabled: true, count: 250, icon: 'monitor', color: 'purple' },
    { name: 'PCI', enabled: true, count: 250, icon: 'shield', color: 'orange' },
    { name: 'Legacy Insight', enabled: true, count: 250, icon: 'chart', color: 'cyan' },
    { name: 'Freedom', enabled: true, count: 250, icon: 'globe', color: 'indigo' },
    { name: 'Service Cloud Voice', enabled: true, count: 3, icon: 'cloud', color: 'sky' },
    { name: 'SMS', enabled: true, count: 250, icon: 'message', color: 'emerald' },
    { name: 'WhatsApp', enabled: true, count: 250, icon: 'whatsapp', color: 'green' },
    { name: 'AI Advisor', enabled: true, count: 250, icon: 'sparkles', color: 'violet' },
    { name: 'AI Agents', enabled: true, count: 1, icon: 'bot', color: 'fuchsia' },
    { name: 'AI Assistants', enabled: true, count: 1, icon: 'brain', color: 'rose' },
    { name: 'AI Agents Call Allowance', enabled: true, count: 5000, icon: 'phone-call', color: 'amber' },
    { name: 'AI Assistants Call Allowance', enabled: true, count: 5000, icon: 'phone-incoming', color: 'lime' },
    { name: 'AI Agents Digital Message Allowance', enabled: true, count: 20000, icon: 'messages', color: 'teal' },
    { name: 'AI Assistants Digital Message Allowance', enabled: true, count: 10000, icon: 'message-circle', color: 'pink' },
  ],
  subscriptionsUpdated: new Date().toLocaleString(),
  scheduledJobs: [
    { id: 'cro', name: 'Call Reporting Scheduled Job', isRunning: true, canStart: true, canStop: true },
    { id: 'hcro', name: 'HCRO Processing Scheduled Job', isRunning: true, canStart: true, canStop: true },
    { id: 'availability', name: 'Availability Logs Scheduled Job', isRunning: true, canStart: true, canStop: true },
    { id: 'cq', name: 'Call Queue Logs Scheduled Job', isRunning: true, canStart: true, canStop: true },
    { id: 'userServicePresGroupSync', name: 'Omni-Channel Status and Group Login Synchroniser Scheduled Job', isRunning: false, canStart: true, canStop: true },
    { id: 'crFixer', name: 'Wrap-Up Fixer Scheduled Job', isRunning: true, canStart: true, canStop: true },
    { id: 'ddlProcessor', name: 'Dynamic Dial List Processor Scheduled Job', isRunning: true, canStart: true, canStop: true },
    { id: 'insights', name: 'AI Advisor Scheduled Job', isRunning: true, canStart: true, canStop: true },
    { id: 'ddlReport', name: 'Dynamic Dial List Report Generator Scheduled Job', isRunning: false, canStart: true, canStop: true },
    { id: 'croTransfers', name: 'Transferred Calls for Reporting Scheduled Job', isRunning: false, canStart: true, canStop: true },
    { id: 'wrapupEvents', name: 'Digital Channel Wrap-Ups', isRunning: false, canStart: true, canStop: true },
    { id: 'interactionReporting', name: 'Interaction Reporting Scheduled Job', isRunning: false, canStart: true, canStop: true },
    { id: 'natterboxFixer', name: 'Natterbox Fixer Scheduled Job', isRunning: false, canStart: true, canStop: true },
  ],
  jobsRunning: 7,
  organizationId: '00D0000000bKE9MA2',
  instanceUrl: 'https://demo.salesforce.com',
  isDemo: true,
};

export const load: PageServerLoad = async ({ locals }) => {
  const result = tryCreateContextAndRepositories(locals);

  if (!result) {
    return { data: DEMO_DATA };
  }

  const { repos, ctx, isDemo } = result;

  if (isDemo) {
    return { data: DEMO_DATA };
  }

  if (!isSalesforceContext(ctx)) {
    return { data: DEMO_DATA };
  }

  try {
    // Fetch inventory counts using repositories
    const [
      usersResult,
      phoneNumbersResult,
      devicesResult,
      groupsResult,
      routingPoliciesResult,
    ] = await Promise.all([
      repos.users.findAll({ page: 1, pageSize: 1 }),
      repos.phoneNumbers.findAll({ page: 1, pageSize: 1 }),
      repos.devices.findAll({ page: 1, pageSize: 1 }),
      repos.groups.findAll({ page: 1, pageSize: 1 }),
      repos.routingPolicies.findAll({ page: 1, pageSize: 1 }),
    ]);

    // Fetch monitoring stats using repository
    let eventLogsToday = 0;
    let errorLogsToday = 0;
    let recordingAccessCount = 0;

    try {
      const adminCounts = await repos.monitoring.getAdminCounts();
      eventLogsToday = adminCounts.eventLogsToday;
      errorLogsToday = adminCounts.errorLogsToday;
      recordingAccessCount = adminCounts.recordingAccessCount;
    } catch (e) {
      console.warn('Failed to fetch monitoring stats:', e);
    }

    // Fetch license/subscription settings from Sapien API
    let subscriptions: Subscription[] = [];
    let subscriptionsUpdated = '';
    
    try {
      await fetchApiSettings(ctx.instanceUrl, ctx.accessToken);
      const license = await getLicenseFromSapien(ctx.instanceUrl, ctx.accessToken);
      
      if (license) {
        subscriptionsUpdated = new Date().toLocaleString();
        subscriptions = [
          { name: 'Voice', enabled: license.PBX__c || false, count: license.PBX_Count__c || 0, icon: 'phone', color: 'blue' },
          { name: 'Contact Centre', enabled: license.Manager__c || false, count: license.Manager_Count__c || 0, icon: 'headset', color: 'green' },
          { name: 'Record', enabled: license.Record__c || false, count: license.Record_Count__c || 0, icon: 'mic', color: 'red' },
          { name: 'CTI', enabled: license.CTI__c || false, count: license.CTI_Count__c || 0, icon: 'monitor', color: 'purple' },
          { name: 'PCI', enabled: license.PCI__c || false, count: license.PCI_Count__c || 0, icon: 'shield', color: 'orange' },
          { name: 'Legacy Insight', enabled: license.Insights__c || false, count: license.Insights_Count__c || 0, icon: 'chart', color: 'cyan' },
          { name: 'Freedom', enabled: license.Freedom__c || false, count: license.Freedom_Count__c || 0, icon: 'globe', color: 'indigo' },
          { name: 'Service Cloud Voice', enabled: license.SCV__c || false, count: license.SCV_Count__c || 0, icon: 'cloud', color: 'sky' },
          { name: 'SMS', enabled: license.SMS__c || false, count: license.SMS_Count__c || 0, icon: 'message', color: 'emerald' },
          { name: 'WhatsApp', enabled: license.WhatsApp__c || false, count: license.WhatsApp_Count__c || 0, icon: 'whatsapp', color: 'green' },
          { name: 'AI Advisor', enabled: license.AICallCoaching__c || false, count: license.AICallCoaching_Count__c || 0, icon: 'sparkles', color: 'violet' },
          { name: 'AI Agents', enabled: Boolean(license.AIAgents__c), count: license.AIAgents__c || 0, icon: 'bot', color: 'fuchsia' },
          { name: 'AI Assistants', enabled: Boolean(license.AIAssistants__c), count: license.AIAssistants__c || 0, icon: 'brain', color: 'rose' },
          { name: 'AI Agents Call Allowance', enabled: Boolean(license.AIAgentsCallAllowance__c), count: license.AIAgentsCallAllowance__c || 0, icon: 'phone-call', color: 'amber' },
          { name: 'AI Assistants Call Allowance', enabled: Boolean(license.AIAssistantsCallAllowance__c), count: license.AIAssistantsCallAllowance__c || 0, icon: 'phone-incoming', color: 'lime' },
          { name: 'AI Agents Digital Message Allowance', enabled: Boolean(license.AIAgentsDigitalMessageAllowance__c), count: license.AIAgentsDigitalMessageAllowance__c || 0, icon: 'messages', color: 'teal' },
          { name: 'AI Assistants Digital Message Allowance', enabled: Boolean(license.AIAssistantsDigitalMessageAllowance__c), count: license.AIAssistantsDigitalMessageAllowance__c || 0, icon: 'message-circle', color: 'pink' },
        ];
      } else {
        subscriptions = DEMO_DATA.subscriptions;
      }
    } catch (e) {
      console.error('Failed to fetch license from Sapien:', e);
      subscriptions = DEMO_DATA.subscriptions;
    }

    // Fetch scheduled job status using repository
    let scheduledJobs: ScheduledJob[] = DEMO_DATA.scheduledJobs;
    let jobsRunning = 0;

    try {
      const repoJobs = await repos.monitoring.getScheduledJobs();
      const croRunning = isCallReportingRunning();
      
      // Override CRO status with real-time check from Sapien
      scheduledJobs = repoJobs.map(job => ({
        ...job,
        isRunning: job.id === 'cro' ? croRunning : job.isRunning,
      }));

      jobsRunning = scheduledJobs.filter(j => j.isRunning).length;
    } catch (e) {
      console.error('Failed to fetch cron jobs:', e);
    }

    // Get the actual Salesforce Organization ID
    let orgId = '';
    try {
      orgId = await getSalesforceOrgId(ctx.instanceUrl, ctx.accessToken);
    } catch (e) {
      console.error('Failed to fetch Salesforce Org ID:', e);
      orgId = ctx.instanceUrl?.match(/https:\/\/([^.]+)/)?.[1] || '';
    }

    const data: AdminData = {
      inventory: {
        users: usersResult.pagination.totalItems,
        phoneNumbers: phoneNumbersResult.pagination.totalItems,
        devices: devicesResult.pagination.totalItems,
        groups: groupsResult.pagination.totalItems,
        routingPolicies: routingPoliciesResult.pagination.totalItems,
      },
      monitoring: {
        recordingAccessCount,
        eventLogsToday,
        errorLogsToday,
      },
      subscriptions,
      subscriptionsUpdated,
      scheduledJobs,
      jobsRunning,
      organizationId: orgId,
      instanceUrl: ctx.instanceUrl || '',
      isDemo: false,
    };

    return { data };
  } catch (error) {
    console.error('Failed to fetch admin data:', error);
    return { data: { ...DEMO_DATA, isDemo: false, error: 'Failed to load admin data' } };
  }
};

export const actions: Actions = {
  refreshLicense: async ({ locals }) => {
    const result = tryCreateContextAndRepositories(locals);
    if (!result) {
      return fail(401, { error: 'Not authenticated' });
    }

    const { ctx, isDemo } = result;
    if (isDemo || !isSalesforceContext(ctx)) {
      return fail(400, { error: 'Not available in demo mode' });
    }

    try {
      clearAllCaches();
      await fetchApiSettings(ctx.instanceUrl, ctx.accessToken);
      const license = await getLicenseFromSapien(ctx.instanceUrl, ctx.accessToken);
      
      if (!license) {
        return fail(500, { error: 'Failed to fetch license from Sapien' });
      }

      return { success: true, message: 'License refreshed successfully' };
    } catch (error) {
      console.error('[Admin] Failed to refresh license:', error);
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to refresh license' });
    }
  },
};
