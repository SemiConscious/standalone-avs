import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { getLicenseFromSapien, isCallReportingRunning, fetchApiSettings, clearAllCaches, getSalesforceOrgId } from '$lib/server/gatekeeper';
import { env } from '$env/dynamic/private';
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
  // Demo mode
  if (env.DEMO_MODE === 'true' || env.DEMO_MODE === '1') {
    return { data: DEMO_DATA };
  }

  // Check credentials
  if (!hasValidCredentials(locals)) {
    return { data: { ...DEMO_DATA, isDemo: false, error: 'Not authenticated' } };
  }

  try {
    // Fetch inventory counts in parallel
    const [
      usersResult,
      phoneNumbersResult,
      devicesResult,
      groupsResult,
      routingPoliciesResult,
      eventLogsResult,
      errorLogsResult,
      recordingAccessResult,
    ] = await Promise.all([
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__User__c'),
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__PhoneNumber__c'),
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__Device__c'),
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__Group__c'),
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__CallFlow__c'),
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__EventLog__c WHERE CreatedDate = TODAY'),
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__ErrorLog__c WHERE CreatedDate = TODAY'),
      querySalesforce<{ expr0: number }>(locals.instanceUrl!, locals.accessToken!, 'SELECT COUNT() FROM nbavs__RecordingAccess__c').catch(() => ({ totalSize: 0 })),
    ]);

    // Fetch license/subscription settings from Sapien API
    // (License_v1__c is a protected custom setting that can't be queried via SOQL API)
    let subscriptions: Subscription[] = [];
    let subscriptionsUpdated = '';
    
    try {
      // First ensure API settings are loaded (this is needed for isCallReportingRunning)
      await fetchApiSettings(locals.instanceUrl!, locals.accessToken!);
      
      const license = await getLicenseFromSapien(locals.instanceUrl!, locals.accessToken!);
      
      if (license) {
        subscriptionsUpdated = new Date().toLocaleString();
        
        subscriptions = [
          { name: 'Voice', enabled: license.Voice__c || false, count: license.Voice_Count__c || 0, icon: 'phone', color: 'blue' },
          { name: 'Contact Centre', enabled: license.ContactCentre__c || false, count: license.ContactCentre_Count__c || 0, icon: 'headset', color: 'green' },
          { name: 'Record', enabled: license.Record__c || false, count: license.Record_Count__c || 0, icon: 'mic', color: 'red' },
          { name: 'CTI', enabled: license.CTI__c || false, count: license.CTI_Count__c || 0, icon: 'monitor', color: 'purple' },
          { name: 'PCI', enabled: license.PCI__c || false, count: license.PCI_Count__c || 0, icon: 'shield', color: 'orange' },
          { name: 'Legacy Insight', enabled: license.Insights__c || false, count: license.Insights_Count__c || 0, icon: 'chart', color: 'cyan' },
          { name: 'Freedom', enabled: license.Freedom__c || false, count: license.Freedom_Count__c || 0, icon: 'globe', color: 'indigo' },
          { name: 'Service Cloud Voice', enabled: license.ServiceCloudVoice__c || false, count: license.ServiceCloudVoice_Count__c || 0, icon: 'cloud', color: 'sky' },
          { name: 'SMS', enabled: license.SMS__c || false, count: license.SMS_Count__c || 0, icon: 'message', color: 'emerald' },
          { name: 'WhatsApp', enabled: license.WhatsApp__c || false, count: license.WhatsApp_Count__c || 0, icon: 'whatsapp', color: 'green' },
          { name: 'AI Advisor', enabled: license.AIAdvisor__c || false, count: license.AIAdvisor_Count__c || 0, icon: 'sparkles', color: 'violet' },
          { name: 'AI Agents', enabled: (license.AIAgents__c || 0) > 0, count: license.AIAgents__c || 0, icon: 'bot', color: 'fuchsia' },
          { name: 'AI Assistants', enabled: (license.AIAssistants__c || 0) > 0, count: license.AIAssistants__c || 0, icon: 'brain', color: 'rose' },
          { name: 'AI Agents Call Allowance', enabled: (license.AIAgentsCallAllowance__c || 0) > 0, count: license.AIAgentsCallAllowance__c || 0, icon: 'phone-call', color: 'amber' },
          { name: 'AI Assistants Call Allowance', enabled: (license.AIAssistantsCallAllowance__c || 0) > 0, count: license.AIAssistantsCallAllowance__c || 0, icon: 'phone-incoming', color: 'lime' },
          { name: 'AI Agents Digital Message Allowance', enabled: (license.AIAgentsDigitalMessageAllowance__c || 0) > 0, count: license.AIAgentsDigitalMessageAllowance__c || 0, icon: 'messages', color: 'teal' },
          { name: 'AI Assistants Digital Message Allowance', enabled: (license.AIAssistantsDigitalMessageAllowance__c || 0) > 0, count: license.AIAssistantsDigitalMessageAllowance__c || 0, icon: 'message-circle', color: 'pink' },
        ];
      } else {
        console.log('[Admin] License not available from Sapien, using demo data');
        subscriptions = DEMO_DATA.subscriptions;
      }
    } catch (e) {
      console.error('Failed to fetch license from Sapien:', e);
      subscriptions = DEMO_DATA.subscriptions;
    }

    // Fetch scheduled job status from CronTrigger
    const jobNames = [
      'Call Reporting',
      'HCRO Processing', 
      'Availability Logs',
      'Call Queue Logs',
      'Omni-Channel Status and Group Login Synchroniser',
      'Wrap-Up Fixer',
      'Dynamic Dial List Processor',
      'AI Advisor',
      'Dynamic Dial List Report Generator',
      'Transferred Calls for Reporting',
      'Interaction Reporting',
      'Natterbox Fixer',
    ];

    let scheduledJobs: ScheduledJob[] = DEMO_DATA.scheduledJobs;
    let jobsRunning = 0;

    try {
      const cronResult = await querySalesforce<{
        Id: string;
        CronJobDetail: { Name: string };
      }>(locals.instanceUrl!, locals.accessToken!, `
        SELECT Id, CronJobDetail.Name 
        FROM CronTrigger 
        WHERE CronJobDetail.Name IN ('${jobNames.join("','")}')
      `);

      const runningJobNames = new Set(cronResult.records.map(r => r.CronJobDetail?.Name));
      
      // CRO (Call Reporting) uses a different mechanism - it checks API_v1__c.ReportingPolicyId__c
      // instead of CronTrigger. If ReportingPolicyId__c is set, CRO is running.
      const croRunning = isCallReportingRunning();
      
      scheduledJobs = [
        { id: 'cro', name: 'Call Reporting Scheduled Job', isRunning: croRunning, canStart: true, canStop: true },
        { id: 'hcro', name: 'HCRO Processing Scheduled Job', isRunning: runningJobNames.has('HCRO Processing'), canStart: true, canStop: true },
        { id: 'availability', name: 'Availability Logs Scheduled Job', isRunning: runningJobNames.has('Availability Logs'), canStart: true, canStop: true },
        { id: 'cq', name: 'Call Queue Logs Scheduled Job', isRunning: runningJobNames.has('Call Queue Logs'), canStart: true, canStop: true },
        { id: 'userServicePresGroupSync', name: 'Omni-Channel Status and Group Login Synchroniser Scheduled Job', isRunning: runningJobNames.has('User Service Presence Group Sync'), canStart: true, canStop: true },
        { id: 'crFixer', name: 'Wrap-Up Fixer Scheduled Job', isRunning: runningJobNames.has('Wrap-Up Fixer'), canStart: true, canStop: true },
        { id: 'ddlProcessor', name: 'Dynamic Dial List Processor Scheduled Job', isRunning: runningJobNames.has('Dynamic Dial List Processor'), canStart: true, canStop: true },
        { id: 'insights', name: 'AI Advisor Scheduled Job', isRunning: runningJobNames.has('AI Advisor'), canStart: true, canStop: true },
        { id: 'ddlReport', name: 'Dynamic Dial List Report Generator Scheduled Job', isRunning: runningJobNames.has('Dynamic Dial List Report Generator'), canStart: true, canStop: true },
        { id: 'croTransfers', name: 'Transferred Calls for Reporting Scheduled Job', isRunning: runningJobNames.has('Transferred Calls for Reporting'), canStart: true, canStop: true },
        { id: 'wrapupEvents', name: 'Digital Channel Wrap-Ups', isRunning: false, canStart: true, canStop: true }, // This checks Session_v1__c.WrapupSubscriptionId__c
        { id: 'interactionReporting', name: 'Interaction Reporting Scheduled Job', isRunning: runningJobNames.has('Interaction Reporting'), canStart: true, canStop: true },
        { id: 'natterboxFixer', name: 'Natterbox Fixer Scheduled Job', isRunning: runningJobNames.has('Natterbox Fixer'), canStart: true, canStop: true },
      ];

      jobsRunning = scheduledJobs.filter(j => j.isRunning).length;
    } catch (e) {
      console.error('Failed to fetch cron jobs:', e);
    }

    // Get the actual Salesforce Organization ID (15-char ID like 00D0000000xxxxx)
    let orgId = '';
    try {
      orgId = await getSalesforceOrgId(locals.instanceUrl!, locals.accessToken!);
    } catch (e) {
      console.error('Failed to fetch Salesforce Org ID:', e);
      // Fallback to subdomain from instance URL
      orgId = locals.instanceUrl?.match(/https:\/\/([^.]+)/)?.[1] || '';
    }

    const data: AdminData = {
      inventory: {
        users: usersResult.totalSize,
        phoneNumbers: phoneNumbersResult.totalSize,
        devices: devicesResult.totalSize,
        groups: groupsResult.totalSize,
        routingPolicies: routingPoliciesResult.totalSize,
      },
      monitoring: {
        recordingAccessCount: recordingAccessResult.totalSize,
        eventLogsToday: eventLogsResult.totalSize,
        errorLogsToday: errorLogsResult.totalSize,
      },
      subscriptions,
      subscriptionsUpdated,
      scheduledJobs,
      jobsRunning,
      organizationId: orgId,
      instanceUrl: locals.instanceUrl || '',
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
    if (!hasValidCredentials(locals)) {
      return fail(401, { error: 'Not authenticated' });
    }

    try {
      // Clear all caches to force a fresh fetch
      clearAllCaches();
      
      // Re-fetch API settings
      await fetchApiSettings(locals.instanceUrl!, locals.accessToken!);
      
      // Fetch fresh license from Sapien
      const license = await getLicenseFromSapien(locals.instanceUrl!, locals.accessToken!);
      
      if (!license) {
        return fail(500, { error: 'Failed to fetch license from Sapien' });
      }

      console.log('[Admin] License refreshed successfully');
      
      // Return success - the page will reload with fresh data
      return { success: true, message: 'License refreshed successfully' };
    } catch (error) {
      console.error('[Admin] Failed to refresh license:', error);
      return fail(500, { error: error instanceof Error ? error.message : 'Failed to refresh license' });
    }
  },
};
