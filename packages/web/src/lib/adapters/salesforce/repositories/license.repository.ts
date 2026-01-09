/**
 * Salesforce License Repository Implementation
 * 
 * Implements ILicenseRepository using Sapien API as the data source.
 */

import type { ILicenseRepository, OrganizationLicenses, GroupLicenseInfo, LicenseStatus } from '$lib/repositories';
import type { License, Subscription } from '$lib/domain';
import type { SalesforceAdapterContext } from '../../types';
import {
  getLicenseFromSapien,
  fetchApiSettings,
  clearAllCaches,
  type LicenseData,
} from '$lib/server/gatekeeper';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Map Sapien license data to domain Subscriptions
 */
function mapLicenseToSubscriptions(license: LicenseData): Subscription[] {
  return [
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
    { name: 'Manager', enabled: license.Manager__c || false, count: license.Manager_Count__c || 0, icon: 'user-cog', color: 'slate' },
  ];
}

// =============================================================================
// Salesforce License Repository
// =============================================================================

export class SalesforceLicenseRepository implements ILicenseRepository {
  private ctx: SalesforceAdapterContext;

  constructor(ctx: SalesforceAdapterContext) {
    this.ctx = ctx;
  }

  async getLicense(): Promise<License> {
    // Ensure API settings are loaded
    await fetchApiSettings(this.ctx.instanceUrl, this.ctx.accessToken);

    const licenseData = await getLicenseFromSapien(this.ctx.instanceUrl, this.ctx.accessToken);

    if (!licenseData) {
      return {
        subscriptions: [],
        isValid: false,
      };
    }

    return {
      subscriptions: mapLicenseToSubscriptions(licenseData),
      updatedAt: new Date().toISOString(),
      isValid: true,
    };
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const license = await this.getLicense();
    return license.subscriptions;
  }

  async refreshLicense(): Promise<License> {
    // Clear all caches to force a fresh fetch
    clearAllCaches();

    // Re-fetch API settings
    await fetchApiSettings(this.ctx.instanceUrl, this.ctx.accessToken);

    // Get fresh license
    return this.getLicense();
  }

  async isFeatureEnabled(featureName: string): Promise<boolean> {
    const subscriptions = await this.getSubscriptions();
    const subscription = subscriptions.find(
      s => s.name.toLowerCase() === featureName.toLowerCase()
    );
    return subscription?.enabled ?? false;
  }

  async getFeatureCount(featureName: string): Promise<number> {
    const subscriptions = await this.getSubscriptions();
    const subscription = subscriptions.find(
      s => s.name.toLowerCase() === featureName.toLowerCase()
    );
    return subscription?.count ?? 0;
  }

  async getOrganizationLicenses(): Promise<OrganizationLicenses> {
    // Get license data from Sapien
    await fetchApiSettings(this.ctx.instanceUrl, this.ctx.accessToken);
    const licenseData = await getLicenseFromSapien(this.ctx.instanceUrl, this.ctx.accessToken);

    // Helper to create license status
    const createLicenseStatus = (enabled: boolean, limit: number, used: number): LicenseStatus => ({
      enabled,
      limit,
      used,
      available: Math.max(0, limit - used),
      percentUsed: limit > 0 ? Math.round((used / limit) * 100) : 0,
    });

    // We need to get actual usage counts from Salesforce
    // For now, use the license counts as limits and set used to 0
    // A complete implementation would query User__c counts by license type
    const defaultStatus = createLicenseStatus(false, 0, 0);

    if (!licenseData) {
      return {
        pbx: defaultStatus,
        cti: defaultStatus,
        manager: defaultStatus,
        record: defaultStatus,
        sms: defaultStatus,
        whatsApp: defaultStatus,
        insights: defaultStatus,
        freedom: defaultStatus,
        pci: defaultStatus,
        scv: defaultStatus,
      };
    }

    return {
      pbx: createLicenseStatus(licenseData.Voice__c || false, licenseData.Voice_Count__c || 0, 0),
      cti: createLicenseStatus(licenseData.CTI__c || false, licenseData.CTI_Count__c || 0, 0),
      manager: createLicenseStatus(licenseData.Manager__c || false, licenseData.Manager_Count__c || 0, 0),
      record: createLicenseStatus(licenseData.Record__c || false, licenseData.Record_Count__c || 0, 0),
      sms: createLicenseStatus(licenseData.SMS__c || false, licenseData.SMS_Count__c || 0, 0),
      whatsApp: createLicenseStatus(licenseData.WhatsApp__c || false, licenseData.WhatsApp_Count__c || 0, 0),
      insights: createLicenseStatus(licenseData.Insights__c || false, licenseData.Insights_Count__c || 0, 0),
      freedom: createLicenseStatus(licenseData.Freedom__c || false, licenseData.Freedom_Count__c || 0, 0),
      pci: createLicenseStatus(licenseData.PCI__c || false, licenseData.PCI_Count__c || 0, 0),
      scv: createLicenseStatus(licenseData.ServiceCloudVoice__c || false, licenseData.ServiceCloudVoice_Count__c || 0, 0),
    };
  }

  async getGroupLicenseInfo(): Promise<GroupLicenseInfo> {
    await fetchApiSettings(this.ctx.instanceUrl, this.ctx.accessToken);
    const licenseData = await getLicenseFromSapien(this.ctx.instanceUrl, this.ctx.accessToken);

    return {
      pbx: { enabled: licenseData?.Voice__c || false },
      manager: { enabled: licenseData?.Manager__c || false },
      record: { enabled: licenseData?.Record__c || false },
    };
  }
}
