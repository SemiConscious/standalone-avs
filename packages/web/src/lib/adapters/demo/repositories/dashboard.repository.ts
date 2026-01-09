/**
 * Demo Dashboard Repository Implementation
 */

import type { IDashboardRepository } from '$lib/repositories';
import type {
  DashboardInventory,
  DashboardMonitoring,
  ScheduledJob,
  OrganizationInfo,
} from '$lib/domain';
import {
  DEMO_INVENTORY,
  DEMO_MONITORING,
  DEMO_SCHEDULED_JOBS,
  DEMO_ORGANIZATION,
} from '../data/dashboard';

export class DemoDashboardRepository implements IDashboardRepository {
  private scheduledJobs: ScheduledJob[] = [...DEMO_SCHEDULED_JOBS];

  async getInventoryCounts(): Promise<DashboardInventory> {
    return { ...DEMO_INVENTORY };
  }

  async getMonitoringCounts(): Promise<DashboardMonitoring> {
    return { ...DEMO_MONITORING };
  }

  async getScheduledJobs(): Promise<ScheduledJob[]> {
    return this.scheduledJobs.map(j => ({ ...j }));
  }

  async getOrganizationInfo(): Promise<OrganizationInfo> {
    return { ...DEMO_ORGANIZATION };
  }

  async startJob(jobId: string): Promise<void> {
    const job = this.scheduledJobs.find(j => j.id === jobId);
    if (job) {
      job.isRunning = true;
    }
  }

  async stopJob(jobId: string): Promise<void> {
    const job = this.scheduledJobs.find(j => j.id === jobId);
    if (job) {
      job.isRunning = false;
    }
  }
}
