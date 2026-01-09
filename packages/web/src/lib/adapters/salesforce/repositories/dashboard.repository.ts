/**
 * Salesforce Dashboard Repository Implementation
 * 
 * Implements IDashboardRepository using Salesforce as the data source.
 */

import type { IDashboardRepository } from '$lib/repositories';
import type {
  DashboardInventory,
  DashboardMonitoring,
  ScheduledJob,
  OrganizationInfo,
} from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import { SalesforceClient } from '../client';
import {
  getSalesforceOrgId,
  fetchApiSettings,
  isCallReportingRunning,
} from '$lib/server/gatekeeper';

// =============================================================================
// Constants
// =============================================================================

const SCHEDULED_JOB_NAMES = [
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

// =============================================================================
// Salesforce Dashboard Repository
// =============================================================================

export class SalesforceDashboardRepository implements IDashboardRepository {
  private client: SalesforceClient;
  private ctx: SalesforceAdapterContext;
  private ns: string;

  constructor(ctx: SalesforceAdapterContext) {
    this.client = new SalesforceClient(ctx);
    this.ctx = ctx;
    this.ns = ctx.namespace;
  }

  async getInventoryCounts(): Promise<DashboardInventory> {
    const [
      usersResult,
      phoneNumbersResult,
      devicesResult,
      groupsResult,
      routingPoliciesResult,
    ] = await Promise.all([
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__User__c`),
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__PhoneNumber__c`),
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__Device__c`),
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__Group__c`),
      this.client.query<{ expr0: number }>(`SELECT COUNT() FROM ${this.ns}__CallFlow__c`),
    ]);

    return {
      users: usersResult.totalSize,
      phoneNumbers: phoneNumbersResult.totalSize,
      devices: devicesResult.totalSize,
      groups: groupsResult.totalSize,
      routingPolicies: routingPoliciesResult.totalSize,
    };
  }

  async getMonitoringCounts(): Promise<DashboardMonitoring> {
    const [eventLogsResult, errorLogsResult, recordingAccessResult] = await Promise.all([
      this.client.query<{ expr0: number }>(
        `SELECT COUNT() FROM ${this.ns}__EventLog__c WHERE CreatedDate = TODAY`
      ),
      this.client.query<{ expr0: number }>(
        `SELECT COUNT() FROM ${this.ns}__ErrorLog__c WHERE CreatedDate = TODAY`
      ),
      this.client.query<{ expr0: number }>(
        `SELECT COUNT() FROM ${this.ns}__RecordingAccess__c`
      ).catch(() => ({ totalSize: 0 })),
    ]);

    return {
      eventLogsToday: eventLogsResult.totalSize,
      errorLogsToday: errorLogsResult.totalSize,
      recordingAccessCount: recordingAccessResult.totalSize,
    };
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    // Ensure API settings are loaded (needed for isCallReportingRunning)
    await fetchApiSettings(this.ctx.instanceUrl, this.ctx.accessToken);

    // Query CronTrigger for scheduled jobs
    const cronResult = await this.client.query<{
      Id: string;
      CronJobDetail: { Name: string };
    }>(`
      SELECT Id, CronJobDetail.Name 
      FROM CronTrigger 
      WHERE CronJobDetail.Name IN ('${SCHEDULED_JOB_NAMES.join("','")}')
    `);

    const runningJobNames = new Set(cronResult.records.map(r => r.CronJobDetail?.Name));

    // CRO uses a different mechanism - checks ReportingPolicyId__c
    const croRunning = isCallReportingRunning();

    return [
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
      { id: 'wrapupEvents', name: 'Digital Channel Wrap-Ups', isRunning: false, canStart: true, canStop: true },
      { id: 'interactionReporting', name: 'Interaction Reporting Scheduled Job', isRunning: runningJobNames.has('Interaction Reporting'), canStart: true, canStop: true },
      { id: 'natterboxFixer', name: 'Natterbox Fixer Scheduled Job', isRunning: runningJobNames.has('Natterbox Fixer'), canStart: true, canStop: true },
    ];
  }

  async getOrganizationInfo(): Promise<OrganizationInfo> {
    const orgId = await getSalesforceOrgId(this.ctx.instanceUrl, this.ctx.accessToken);

    return {
      id: orgId,
      instanceUrl: this.ctx.instanceUrl,
    };
  }

  async startJob(_jobId: string): Promise<void> {
    // TODO: Implement job start via Apex REST endpoint
    console.log('[SalesforceDashboardRepository] Start job not yet implemented');
  }

  async stopJob(_jobId: string): Promise<void> {
    // TODO: Implement job stop via Apex REST endpoint
    console.log('[SalesforceDashboardRepository] Stop job not yet implemented');
  }
}
