/**
 * License Management Utilities
 * 
 * This module provides license validation and tracking functionality
 * based on the Salesforce LicenseManager.cls pattern.
 */

import { querySalesforce, getNamespace } from './salesforce';

// =============================================================================
// Types
// =============================================================================

export interface LicenseType {
  key: string;
  label: string;
  field: string;
  limitField: string;
}

export interface LicenseStatus {
  enabled: boolean;
  limit: number;
  used: number;
  available: number;
  percentUsed: number;
}

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

export interface LicenseValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// License Types Configuration
// =============================================================================

export const LICENSE_TYPES: LicenseType[] = [
  { key: 'pbx', label: 'PBX', field: 'PBX__c', limitField: 'PBX_Licenses__c' },
  { key: 'cti', label: 'CTI', field: 'CTI__c', limitField: 'CTI_Licenses__c' },
  { key: 'manager', label: 'Manager', field: 'Manager__c', limitField: 'Manager_Licenses__c' },
  { key: 'record', label: 'Record', field: 'Record__c', limitField: 'Record_Licenses__c' },
  { key: 'sms', label: 'SMS', field: 'SMS__c', limitField: 'SMS_Licenses__c' },
  { key: 'whatsApp', label: 'WhatsApp', field: 'WhatsApp__c', limitField: 'WhatsApp_Licenses__c' },
  { key: 'insights', label: 'Insights', field: 'Insights__c', limitField: 'Insights_Licenses__c' },
  { key: 'freedom', label: 'Freedom', field: 'Freedom__c', limitField: 'Freedom_Licenses__c' },
  { key: 'pci', label: 'PCI', field: 'PCI__c', limitField: 'PCI_Licenses__c' },
  { key: 'scv', label: 'Service Cloud Voice', field: 'SCV__c', limitField: 'SCV_Licenses__c' },
];

// =============================================================================
// License Fetching
// =============================================================================

/**
 * Get comprehensive license information for the organization
 */
export async function getOrganizationLicenses(
  instanceUrl: string,
  accessToken: string
): Promise<OrganizationLicenses> {
  const ns = getNamespace();
  
  // Build dynamic fields list for license query
  const licenseFields = LICENSE_TYPES.flatMap(lt => [
    `${ns}__${lt.field}`,
    `${ns}__${lt.limitField}`,
  ]).join(', ');
  
  const licenseSoql = `SELECT ${licenseFields} FROM ${ns}__License_v1__c LIMIT 1`;
  
  // Query license usage - count enabled users with each license type
  const usagePromises = LICENSE_TYPES.map(async (lt) => {
    const countSoql = `
      SELECT COUNT() FROM ${ns}__User__c 
      WHERE ${ns}__Enabled__c = true AND ${ns}__${lt.field} = true
    `;
    try {
      const result = await querySalesforce<Record<string, unknown>>(instanceUrl, accessToken, countSoql);
      return { key: lt.key, count: result.totalSize };
    } catch {
      return { key: lt.key, count: 0 };
    }
  });
  
  try {
    const licenseResult = await querySalesforce<Record<string, unknown>>(instanceUrl, accessToken, licenseSoql);
    const license = licenseResult.records[0] || {};
    
    const usageResults = await Promise.all(usagePromises);
    const usageMap = Object.fromEntries(usageResults.map(r => [r.key, r.count]));
    
    const buildStatus = (lt: LicenseType): LicenseStatus => {
      const enabled = Boolean(license[`${ns}__${lt.field}`]);
      const limit = Number(license[`${ns}__${lt.limitField}`]) || 0;
      const used = usageMap[lt.key] || 0;
      const available = Math.max(0, limit - used);
      const percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0;
      
      return { enabled, limit, used, available, percentUsed };
    };
    
    return {
      pbx: buildStatus(LICENSE_TYPES[0]),
      cti: buildStatus(LICENSE_TYPES[1]),
      manager: buildStatus(LICENSE_TYPES[2]),
      record: buildStatus(LICENSE_TYPES[3]),
      sms: buildStatus(LICENSE_TYPES[4]),
      whatsApp: buildStatus(LICENSE_TYPES[5]),
      insights: buildStatus(LICENSE_TYPES[6]),
      freedom: buildStatus(LICENSE_TYPES[7]),
      pci: buildStatus(LICENSE_TYPES[8]),
      scv: buildStatus(LICENSE_TYPES[9]),
    };
  } catch (error) {
    console.error('Failed to fetch organization licenses:', error);
    
    // Return default unlicensed state
    const defaultStatus: LicenseStatus = {
      enabled: false,
      limit: 0,
      used: 0,
      available: 0,
      percentUsed: 0,
    };
    
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
}

// =============================================================================
// License Validation
// =============================================================================

/**
 * Validate that a user can be assigned specific licenses
 */
export function validateUserLicenses(
  requestedLicenses: { [key: string]: boolean },
  orgLicenses: OrganizationLicenses,
  isNewUser: boolean = true
): LicenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const [key, requested] of Object.entries(requestedLicenses)) {
    if (!requested) continue;
    
    const licenseType = LICENSE_TYPES.find(lt => lt.key === key);
    if (!licenseType) continue;
    
    const orgLicense = orgLicenses[key as keyof OrganizationLicenses];
    
    if (!orgLicense.enabled) {
      errors.push(`${licenseType.label} license is not enabled for this organization`);
      continue;
    }
    
    // For new users, check if there's available capacity
    if (isNewUser && orgLicense.available <= 0) {
      errors.push(`No ${licenseType.label} licenses available (${orgLicense.used}/${orgLicense.limit} in use)`);
    }
    
    // Warn if approaching limit
    if (orgLicense.percentUsed >= 90 && orgLicense.percentUsed < 100) {
      warnings.push(`${licenseType.label} licenses are ${orgLicense.percentUsed}% utilized`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that a group can have specific purposes assigned
 */
export function validateGroupPurposes(
  requestedPurposes: { pbx: boolean; manager: boolean; record: boolean },
  currentPurposes: { pbx: boolean; manager: boolean; record: boolean },
  memberLicenses: Array<{ name: string; pbx: boolean; manager: boolean; record: boolean }>,
  orgLicenses: OrganizationLicenses
): LicenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Rule 1: Cannot remove a purpose once set
  if (currentPurposes.pbx && !requestedPurposes.pbx) {
    errors.push('Cannot remove PBX purpose from group');
  }
  if (currentPurposes.manager && !requestedPurposes.manager) {
    errors.push('Cannot remove Manager purpose from group');
  }
  if (currentPurposes.record && !requestedPurposes.record) {
    errors.push('Cannot remove Record purpose from group');
  }
  
  // Rule 2: Check organization license when adding new purpose
  if (requestedPurposes.pbx && !currentPurposes.pbx && !orgLicenses.pbx.enabled) {
    errors.push('PBX license is not enabled for this organization');
  }
  if (requestedPurposes.manager && !currentPurposes.manager && !orgLicenses.manager.enabled) {
    errors.push('Manager license is not enabled for this organization');
  }
  if (requestedPurposes.record && !currentPurposes.record && !orgLicenses.record.enabled) {
    errors.push('Record license is not enabled for this organization');
  }
  
  // Rule 3: When adding a purpose, all members must have the corresponding license
  const purposeChecks = [
    { purpose: 'pbx', current: currentPurposes.pbx, requested: requestedPurposes.pbx, label: 'PBX' },
    { purpose: 'manager', current: currentPurposes.manager, requested: requestedPurposes.manager, label: 'Manager' },
    { purpose: 'record', current: currentPurposes.record, requested: requestedPurposes.record, label: 'Record' },
  ];
  
  for (const check of purposeChecks) {
    if (check.requested && !check.current) {
      for (const member of memberLicenses) {
        const hasLicense = member[check.purpose as keyof typeof member];
        if (!hasLicense) {
          errors.push(`User ${member.name} does not have ${check.label} license`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that a user can be added to a group
 */
export function validateGroupMembership(
  userLicenses: { pbx: boolean; manager: boolean; record: boolean },
  groupPurposes: { pbx: boolean; manager: boolean; record: boolean },
  userName: string
): LicenseValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // User must have all licenses that the group requires
  if (groupPurposes.pbx && !userLicenses.pbx) {
    errors.push(`${userName} does not have PBX license required by this group`);
  }
  if (groupPurposes.manager && !userLicenses.manager) {
    errors.push(`${userName} does not have Manager license required by this group`);
  }
  if (groupPurposes.record && !userLicenses.record) {
    errors.push(`${userName} does not have Record license required by this group`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

