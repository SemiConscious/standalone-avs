/**
 * Salesforce Adapter Index
 * 
 * Exports the Salesforce adapter factory and related utilities.
 */

import type { Repositories } from '$lib/repositories';
import type { SalesforceAdapterContext } from '../types';

// Repository implementations
import { SalesforceUserRepository } from './repositories/user.repository';
import { SalesforceGroupRepository } from './repositories/group.repository';
import { SalesforceDeviceRepository } from './repositories/device.repository';
import { SalesforcePhoneNumberRepository } from './repositories/phone-number.repository';
import { SalesforceRoutingPolicyRepository } from './repositories/routing-policy.repository';
import { SalesforceCallLogRepository } from './repositories/call-log.repository';
import { SalesforceSoundRepository } from './repositories/sound.repository';
import { SalesforceInsightRepository } from './repositories/insight.repository';
import { SalesforceSettingsRepository } from './repositories/settings.repository';
import { SalesforceDashboardRepository } from './repositories/dashboard.repository';
import { SalesforceLicenseRepository } from './repositories/license.repository';
import { SalesforceMonitoringRepository } from './repositories/monitoring.repository';
import { SalesforceCallReportingRepository } from './repositories/call-reporting.repository';
import { SalesforceWallboardRepository } from './repositories/wallboard.repository';
import { SalesforceSkillRepository } from './repositories/skill.repository';

// Re-export types
export * from './types';
export * from './client';
export * from './mappers';
export * from './queries';

// =============================================================================
// Repository Factory
// =============================================================================

/**
 * Create all Salesforce repositories
 */
export function createSalesforceRepositories(ctx: SalesforceAdapterContext): Repositories {
  return {
    users: new SalesforceUserRepository(ctx),
    groups: new SalesforceGroupRepository(ctx),
    devices: new SalesforceDeviceRepository(ctx),
    phoneNumbers: new SalesforcePhoneNumberRepository(ctx),
    routingPolicies: new SalesforceRoutingPolicyRepository(ctx),
    callLogs: new SalesforceCallLogRepository(ctx),
    sounds: new SalesforceSoundRepository(ctx),
    insights: new SalesforceInsightRepository(ctx),
    settings: new SalesforceSettingsRepository(ctx),
    dashboard: new SalesforceDashboardRepository(ctx),
    license: new SalesforceLicenseRepository(ctx),
    monitoring: new SalesforceMonitoringRepository(ctx),
    callReporting: new SalesforceCallReportingRepository(ctx),
    wallboards: new SalesforceWallboardRepository(ctx),
    skills: new SalesforceSkillRepository(ctx),
  };
}
