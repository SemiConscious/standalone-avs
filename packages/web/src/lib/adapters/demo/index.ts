/**
 * Demo Adapter Index
 * 
 * Exports the Demo adapter factory.
 */

import type { Repositories } from '$lib/repositories';

// Repository implementations
import { DemoUserRepository } from './repositories/user.repository';
import { DemoGroupRepository } from './repositories/group.repository';
import { DemoDeviceRepository } from './repositories/device.repository';
import { DemoPhoneNumberRepository } from './repositories/phone-number.repository';
import { DemoRoutingPolicyRepository } from './repositories/routing-policy.repository';
import { DemoCallLogRepository } from './repositories/call-log.repository';
import { DemoSoundRepository } from './repositories/sound.repository';
import { DemoInsightRepository } from './repositories/insight.repository';
import { DemoSettingsRepository } from './repositories/settings.repository';
import { DemoDashboardRepository } from './repositories/dashboard.repository';
import { DemoLicenseRepository } from './repositories/license.repository';
import { DemoMonitoringRepository } from './repositories/monitoring.repository';
import { DemoCallReportingRepository } from './repositories/call-reporting.repository';
import { DemoWallboardRepository } from './repositories/wallboard.repository';
import { DemoSkillRepository } from './repositories/skill.repository';

// =============================================================================
// Repository Singletons
// =============================================================================

// Singleton instances for demo mode (preserves state across requests)
let demoUserRepository: DemoUserRepository | null = null;
let demoGroupRepository: DemoGroupRepository | null = null;
let demoDeviceRepository: DemoDeviceRepository | null = null;
let demoPhoneNumberRepository: DemoPhoneNumberRepository | null = null;
let demoRoutingPolicyRepository: DemoRoutingPolicyRepository | null = null;
let demoCallLogRepository: DemoCallLogRepository | null = null;
let demoSoundRepository: DemoSoundRepository | null = null;
let demoInsightRepository: DemoInsightRepository | null = null;
let demoSettingsRepository: DemoSettingsRepository | null = null;
let demoDashboardRepository: DemoDashboardRepository | null = null;
let demoLicenseRepository: DemoLicenseRepository | null = null;
let demoMonitoringRepository: DemoMonitoringRepository | null = null;
let demoCallReportingRepository: DemoCallReportingRepository | null = null;
let demoWallboardRepository: DemoWallboardRepository | null = null;
let demoSkillRepository: DemoSkillRepository | null = null;

// =============================================================================
// Repository Factory
// =============================================================================

/**
 * Create all Demo repositories
 */
export function createDemoRepositories(): Repositories {
  // Use singletons to preserve state
  if (!demoUserRepository) demoUserRepository = new DemoUserRepository();
  if (!demoGroupRepository) demoGroupRepository = new DemoGroupRepository();
  if (!demoDeviceRepository) demoDeviceRepository = new DemoDeviceRepository();
  if (!demoPhoneNumberRepository) demoPhoneNumberRepository = new DemoPhoneNumberRepository();
  if (!demoRoutingPolicyRepository) demoRoutingPolicyRepository = new DemoRoutingPolicyRepository();
  if (!demoCallLogRepository) demoCallLogRepository = new DemoCallLogRepository();
  if (!demoSoundRepository) demoSoundRepository = new DemoSoundRepository();
  if (!demoInsightRepository) demoInsightRepository = new DemoInsightRepository();
  if (!demoSettingsRepository) demoSettingsRepository = new DemoSettingsRepository();
  if (!demoDashboardRepository) demoDashboardRepository = new DemoDashboardRepository();
  if (!demoLicenseRepository) demoLicenseRepository = new DemoLicenseRepository();
  if (!demoMonitoringRepository) demoMonitoringRepository = new DemoMonitoringRepository();
  if (!demoCallReportingRepository) demoCallReportingRepository = new DemoCallReportingRepository();
  if (!demoWallboardRepository) demoWallboardRepository = new DemoWallboardRepository();
  if (!demoSkillRepository) demoSkillRepository = new DemoSkillRepository();

  return {
    users: demoUserRepository,
    groups: demoGroupRepository,
    devices: demoDeviceRepository,
    phoneNumbers: demoPhoneNumberRepository,
    routingPolicies: demoRoutingPolicyRepository,
    callLogs: demoCallLogRepository,
    sounds: demoSoundRepository,
    insights: demoInsightRepository,
    settings: demoSettingsRepository,
    dashboard: demoDashboardRepository,
    license: demoLicenseRepository,
    monitoring: demoMonitoringRepository,
    callReporting: demoCallReportingRepository,
    wallboards: demoWallboardRepository,
    skills: demoSkillRepository,
  };
}

/**
 * Reset demo data (useful for testing)
 */
export function resetDemoData(): void {
  demoUserRepository = null;
  demoGroupRepository = null;
  demoDeviceRepository = null;
  demoPhoneNumberRepository = null;
  demoRoutingPolicyRepository = null;
  demoCallLogRepository = null;
  demoSoundRepository = null;
  demoInsightRepository = null;
  demoSettingsRepository = null;
  demoDashboardRepository = null;
  demoLicenseRepository = null;
  demoMonitoringRepository = null;
  demoCallReportingRepository = null;
  demoWallboardRepository = null;
  demoSkillRepository = null;
}
