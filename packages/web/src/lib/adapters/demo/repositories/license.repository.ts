/**
 * Demo License Repository Implementation
 */

import type { ILicenseRepository, OrganizationLicenses, GroupLicenseInfo, LicenseStatus } from '$lib/repositories';
import type { License, Subscription } from '$lib/domain';
import { DEMO_LICENSE, DEMO_SUBSCRIPTIONS } from '../data/license';

const DEMO_LICENSE_STATUS: LicenseStatus = {
  enabled: true,
  limit: 100,
  used: 45,
  available: 55,
  percentUsed: 45,
};

export class DemoLicenseRepository implements ILicenseRepository {
  async getLicense(): Promise<License> {
    return {
      ...DEMO_LICENSE,
      updatedAt: new Date().toISOString(),
    };
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return DEMO_SUBSCRIPTIONS.map(s => ({ ...s }));
  }

  async refreshLicense(): Promise<License> {
    // In demo mode, just return the same data with updated timestamp
    return this.getLicense();
  }

  async isFeatureEnabled(featureName: string): Promise<boolean> {
    const subscription = DEMO_SUBSCRIPTIONS.find(
      s => s.name.toLowerCase() === featureName.toLowerCase()
    );
    return subscription?.enabled ?? false;
  }

  async getFeatureCount(featureName: string): Promise<number> {
    const subscription = DEMO_SUBSCRIPTIONS.find(
      s => s.name.toLowerCase() === featureName.toLowerCase()
    );
    return subscription?.count ?? 0;
  }

  async getOrganizationLicenses(): Promise<OrganizationLicenses> {
    return {
      pbx: DEMO_LICENSE_STATUS,
      cti: DEMO_LICENSE_STATUS,
      manager: { ...DEMO_LICENSE_STATUS, used: 10, available: 90, percentUsed: 10 },
      record: { ...DEMO_LICENSE_STATUS, used: 30, available: 70, percentUsed: 30 },
      sms: { ...DEMO_LICENSE_STATUS, limit: 50, used: 20, available: 30, percentUsed: 40 },
      whatsApp: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
      insights: DEMO_LICENSE_STATUS,
      freedom: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
      pci: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
      scv: { enabled: false, limit: 0, used: 0, available: 0, percentUsed: 0 },
    };
  }

  async getGroupLicenseInfo(): Promise<GroupLicenseInfo> {
    return {
      pbx: { enabled: true },
      manager: { enabled: true },
      record: { enabled: true },
    };
  }
}
