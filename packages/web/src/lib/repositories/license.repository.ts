/**
 * License Repository Interface
 * Defines operations for fetching license/subscription data
 */

import type { License, Subscription } from '$lib/domain';

/**
 * License status for a single feature
 */
export interface LicenseStatus {
  enabled: boolean;
  limit: number;
  used: number;
  available: number;
  percentUsed: number;
}

/**
 * Organization-wide license usage information
 */
export interface OrganizationLicenses {
  pbx: LicenseStatus;
  cti: LicenseStatus;
  manager: LicenseStatus;
  record: LicenseStatus;
  sms: LicenseStatus;
  whatsApp: LicenseStatus;
  insights: LicenseStatus;
  freedom: LicenseStatus;
  pci: LicenseStatus;
  scv: LicenseStatus;
}

/**
 * Simple license info for groups (PBX, Manager, Record enabled status)
 */
export interface GroupLicenseInfo {
  pbx: { enabled: boolean };
  manager: { enabled: boolean };
  record: { enabled: boolean };
}

/**
 * Repository for license data operations
 */
export interface ILicenseRepository {
  /**
   * Get the current license information
   */
  getLicense(): Promise<License>;

  /**
   * Get all subscriptions/features
   */
  getSubscriptions(): Promise<Subscription[]>;

  /**
   * Refresh the license cache and fetch fresh data
   */
  refreshLicense(): Promise<License>;

  /**
   * Check if a specific feature is enabled
   * @param featureName - Name of the feature to check
   */
  isFeatureEnabled(featureName: string): Promise<boolean>;

  /**
   * Get the count/quantity for a specific feature
   * @param featureName - Name of the feature
   */
  getFeatureCount(featureName: string): Promise<number>;

  /**
   * Get organization-wide license usage (for user management)
   */
  getOrganizationLicenses(): Promise<OrganizationLicenses>;

  /**
   * Get simple license info for group management
   */
  getGroupLicenseInfo(): Promise<GroupLicenseInfo>;
}
