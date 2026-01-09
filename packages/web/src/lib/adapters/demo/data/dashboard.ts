/**
 * Demo Dashboard Data
 */

import type { DashboardInventory, DashboardMonitoring, ScheduledJob, OrganizationInfo } from '$lib/domain';

export const DEMO_INVENTORY: DashboardInventory = {
  users: 311,
  phoneNumbers: 903,
  devices: 539,
  groups: 36,
  routingPolicies: 63,
};

export const DEMO_MONITORING: DashboardMonitoring = {
  recordingAccessCount: 33,
  eventLogsToday: 6,
  errorLogsToday: 2,
};

export const DEMO_SCHEDULED_JOBS: ScheduledJob[] = [
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
];

export const DEMO_ORGANIZATION: OrganizationInfo = {
  id: '00D0000000bKE9MA2',
  instanceUrl: 'https://demo.salesforce.com',
  name: 'Demo Organization',
};
