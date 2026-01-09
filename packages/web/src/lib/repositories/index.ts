/**
 * Repositories Index
 * Re-exports all repository interfaces from a single entry point
 */

// Common types
export * from './types';

// Repository interfaces
export type { IUserRepository, UserQueryParams } from './user.repository';
export type { IGroupRepository, GroupQueryParams } from './group.repository';
export type { IDeviceRepository, DeviceQueryParams } from './device.repository';
export type { IPhoneNumberRepository, PhoneNumberQueryParams } from './phone-number.repository';
export type { IRoutingPolicyRepository, RoutingPolicyQueryParams } from './routing-policy.repository';
export type { ICallLogRepository, CallLogQueryParams } from './call-log.repository';
export type { ISoundRepository, SoundQueryParams } from './sound.repository';
export type { IInsightRepository, InsightQueryParams } from './insight.repository';
export type { ISettingsRepository } from './settings.repository';
export type { IDashboardRepository } from './dashboard.repository';
export type { ILicenseRepository, OrganizationLicenses, GroupLicenseInfo, LicenseStatus } from './license.repository';
export type { IMonitoringRepository } from './monitoring.repository';
export type { ICallReportingRepository } from './call-reporting.repository';
export type { IWallboardRepository, WallboardQueryParams } from './wallboard.repository';
export type { ISkillRepository, SkillQueryParams } from './skill.repository';

// =============================================================================
// Repositories Collection Interface
// =============================================================================

import type { IUserRepository } from './user.repository';
import type { IGroupRepository } from './group.repository';
import type { IDeviceRepository } from './device.repository';
import type { IPhoneNumberRepository } from './phone-number.repository';
import type { IRoutingPolicyRepository } from './routing-policy.repository';
import type { ICallLogRepository } from './call-log.repository';
import type { ISoundRepository } from './sound.repository';
import type { IInsightRepository } from './insight.repository';
import type { ISettingsRepository } from './settings.repository';
import type { IDashboardRepository } from './dashboard.repository';
import type { ILicenseRepository } from './license.repository';
import type { IMonitoringRepository } from './monitoring.repository';
import type { ICallReportingRepository } from './call-reporting.repository';
import type { IWallboardRepository } from './wallboard.repository';
import type { ISkillRepository } from './skill.repository';

/**
 * Collection of all repositories
 * Returned by the adapter factory
 */
export interface Repositories {
  users: IUserRepository;
  groups: IGroupRepository;
  devices: IDeviceRepository;
  phoneNumbers: IPhoneNumberRepository;
  routingPolicies: IRoutingPolicyRepository;
  callLogs: ICallLogRepository;
  sounds: ISoundRepository;
  insights: IInsightRepository;
  settings: ISettingsRepository;
  dashboard: IDashboardRepository;
  license: ILicenseRepository;
  monitoring: IMonitoringRepository;
  callReporting: ICallReportingRepository;
  wallboards: IWallboardRepository;
  skills: ISkillRepository;
}
