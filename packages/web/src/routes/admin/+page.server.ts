import { querySalesforce, hasValidCredentials } from '$lib/server/salesforce';
import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

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

    // Fetch license/subscription settings
    let subscriptions: Subscription[] = [];
    let subscriptionsUpdated = '';
    
    try {
      const licenseResult = await querySalesforce<{
        nbavs__Voice__c: boolean;
        nbavs__Voice_Count__c: number;
        nbavs__ContactCentre__c: boolean;
        nbavs__ContactCentre_Count__c: number;
        nbavs__Record__c: boolean;
        nbavs__Record_Count__c: number;
        nbavs__CTI__c: boolean;
        nbavs__CTI_Count__c: number;
        nbavs__PCI__c: boolean;
        nbavs__PCI_Count__c: number;
        nbavs__Insights__c: boolean;
        nbavs__Insights_Count__c: number;
        nbavs__Freedom__c: boolean;
        nbavs__Freedom_Count__c: number;
        nbavs__ServiceCloudVoice__c: boolean;
        nbavs__ServiceCloudVoice_Count__c: number;
        nbavs__SMS__c: boolean;
        nbavs__SMS_Count__c: number;
        nbavs__WhatsApp__c: boolean;
        nbavs__WhatsApp_Count__c: number;
        nbavs__AIAdvisor__c: boolean;
        nbavs__AIAdvisor_Count__c: number;
        nbavs__AIAgents__c: number;
        nbavs__AIAssistants__c: number;
        nbavs__AIAgentsCallAllowance__c: number;
        nbavs__AIAssistantsCallAllowance__c: number;
        nbavs__AIAgentsDigitalMessageAllowance__c: number;
        nbavs__AIAssistantsDigitalMessageAllowance__c: number;
        LastModifiedDate: string;
      }>(locals.instanceUrl!, locals.accessToken!, `
        SELECT 
          nbavs__Voice__c, nbavs__Voice_Count__c,
          nbavs__ContactCentre__c, nbavs__ContactCentre_Count__c,
          nbavs__Record__c, nbavs__Record_Count__c,
          nbavs__CTI__c, nbavs__CTI_Count__c,
          nbavs__PCI__c, nbavs__PCI_Count__c,
          nbavs__Insights__c, nbavs__Insights_Count__c,
          nbavs__Freedom__c, nbavs__Freedom_Count__c,
          nbavs__ServiceCloudVoice__c, nbavs__ServiceCloudVoice_Count__c,
          nbavs__SMS__c, nbavs__SMS_Count__c,
          nbavs__WhatsApp__c, nbavs__WhatsApp_Count__c,
          nbavs__AIAdvisor__c, nbavs__AIAdvisor_Count__c,
          nbavs__AIAgents__c, nbavs__AIAssistants__c,
          nbavs__AIAgentsCallAllowance__c, nbavs__AIAssistantsCallAllowance__c,
          nbavs__AIAgentsDigitalMessageAllowance__c, nbavs__AIAssistantsDigitalMessageAllowance__c,
          LastModifiedDate
        FROM nbavs__License_v1__c LIMIT 1
      `);
      
      if (licenseResult.records.length > 0) {
        const l = licenseResult.records[0];
        subscriptionsUpdated = l.LastModifiedDate ? new Date(l.LastModifiedDate).toLocaleString() : '';
        
        subscriptions = [
          { name: 'Voice', enabled: l.nbavs__Voice__c || false, count: l.nbavs__Voice_Count__c || 0, icon: 'phone', color: 'blue' },
          { name: 'Contact Centre', enabled: l.nbavs__ContactCentre__c || false, count: l.nbavs__ContactCentre_Count__c || 0, icon: 'headset', color: 'green' },
          { name: 'Record', enabled: l.nbavs__Record__c || false, count: l.nbavs__Record_Count__c || 0, icon: 'mic', color: 'red' },
          { name: 'CTI', enabled: l.nbavs__CTI__c || false, count: l.nbavs__CTI_Count__c || 0, icon: 'monitor', color: 'purple' },
          { name: 'PCI', enabled: l.nbavs__PCI__c || false, count: l.nbavs__PCI_Count__c || 0, icon: 'shield', color: 'orange' },
          { name: 'Legacy Insight', enabled: l.nbavs__Insights__c || false, count: l.nbavs__Insights_Count__c || 0, icon: 'chart', color: 'cyan' },
          { name: 'Freedom', enabled: l.nbavs__Freedom__c || false, count: l.nbavs__Freedom_Count__c || 0, icon: 'globe', color: 'indigo' },
          { name: 'Service Cloud Voice', enabled: l.nbavs__ServiceCloudVoice__c || false, count: l.nbavs__ServiceCloudVoice_Count__c || 0, icon: 'cloud', color: 'sky' },
          { name: 'SMS', enabled: l.nbavs__SMS__c || false, count: l.nbavs__SMS_Count__c || 0, icon: 'message', color: 'emerald' },
          { name: 'WhatsApp', enabled: l.nbavs__WhatsApp__c || false, count: l.nbavs__WhatsApp_Count__c || 0, icon: 'whatsapp', color: 'green' },
          { name: 'AI Advisor', enabled: l.nbavs__AIAdvisor__c || false, count: l.nbavs__AIAdvisor_Count__c || 0, icon: 'sparkles', color: 'violet' },
          { name: 'AI Agents', enabled: (l.nbavs__AIAgents__c || 0) > 0, count: l.nbavs__AIAgents__c || 0, icon: 'bot', color: 'fuchsia' },
          { name: 'AI Assistants', enabled: (l.nbavs__AIAssistants__c || 0) > 0, count: l.nbavs__AIAssistants__c || 0, icon: 'brain', color: 'rose' },
          { name: 'AI Agents Call Allowance', enabled: (l.nbavs__AIAgentsCallAllowance__c || 0) > 0, count: l.nbavs__AIAgentsCallAllowance__c || 0, icon: 'phone-call', color: 'amber' },
          { name: 'AI Assistants Call Allowance', enabled: (l.nbavs__AIAssistantsCallAllowance__c || 0) > 0, count: l.nbavs__AIAssistantsCallAllowance__c || 0, icon: 'phone-incoming', color: 'lime' },
          { name: 'AI Agents Digital Message Allowance', enabled: (l.nbavs__AIAgentsDigitalMessageAllowance__c || 0) > 0, count: l.nbavs__AIAgentsDigitalMessageAllowance__c || 0, icon: 'messages', color: 'teal' },
          { name: 'AI Assistants Digital Message Allowance', enabled: (l.nbavs__AIAssistantsDigitalMessageAllowance__c || 0) > 0, count: l.nbavs__AIAssistantsDigitalMessageAllowance__c || 0, icon: 'message-circle', color: 'pink' },
        ];
      }
    } catch (e) {
      console.error('Failed to fetch license:', e);
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
      
      scheduledJobs = [
        { id: 'cro', name: 'Call Reporting Scheduled Job', isRunning: runningJobNames.has('Call Reporting'), canStart: true, canStop: true },
        { id: 'hcro', name: 'HCRO Processing Scheduled Job', isRunning: runningJobNames.has('HCRO Processing'), canStart: true, canStop: true },
        { id: 'availability', name: 'Availability Logs Scheduled Job', isRunning: runningJobNames.has('Availability Logs'), canStart: true, canStop: true },
        { id: 'cq', name: 'Call Queue Logs Scheduled Job', isRunning: runningJobNames.has('Call Queue Logs'), canStart: true, canStop: true },
        { id: 'userServicePresGroupSync', name: 'Omni-Channel Status and Group Login Synchroniser Scheduled Job', isRunning: runningJobNames.has('Omni-Channel Status and Group Login Synchroniser'), canStart: true, canStop: true },
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

    // Get organization ID from the instance URL
    const orgId = locals.instanceUrl?.match(/https:\/\/([^.]+)/)?.[1] || '';

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
      isDemo: false,
    };

    return { data };
  } catch (error) {
    console.error('Failed to fetch admin data:', error);
    return { data: { ...DEMO_DATA, isDemo: false, error: 'Failed to load admin data' } };
  }
};
