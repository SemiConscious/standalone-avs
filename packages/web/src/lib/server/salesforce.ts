/**
 * Salesforce API utilities for server-side data fetching
 */

import { env } from '$env/dynamic/private';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface SoqlQueryResult<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface SalesforceCreateResult {
  id: string;
  success: boolean;
  errors: SalesforceError[];
}

export interface SalesforceError {
  statusCode: string;
  message: string;
  fields?: string[];
}

export interface CompositeRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  referenceId: string;
  body?: Record<string, unknown>;
}

export interface CompositeResponse {
  compositeResponse: Array<{
    body: unknown;
    httpHeaders: Record<string, string>;
    httpStatusCode: number;
    referenceId: string;
  }>;
}

export class SalesforceApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors: SalesforceError[] = []
  ) {
    super(message);
    this.name = 'SalesforceApiError';
  }
}

// =============================================================================
// Namespace Utilities
// =============================================================================

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

/**
 * Add namespace prefix to a field name if not already prefixed
 */
export function namespaceField(fieldName: string): string {
  if (fieldName.includes('__c') || fieldName.includes('__r')) {
    if (!fieldName.startsWith(`${NAMESPACE}__`)) {
      return `${NAMESPACE}__${fieldName}`;
    }
  }
  return fieldName;
}

/**
 * Add namespace prefix to an object name
 */
export function namespaceObject(objectName: string): string {
  if (objectName.endsWith('__c') && !objectName.startsWith(`${NAMESPACE}__`)) {
    return `${NAMESPACE}__${objectName}`;
  }
  return objectName;
}

/**
 * Build a namespaced SOQL query
 */
export function buildNamespacedSoql(
  fields: string[],
  objectName: string,
  whereClause?: string,
  orderBy?: string,
  limit?: number
): string {
  const nsFields = fields.map(namespaceField).join(', ');
  const nsObject = namespaceObject(objectName);
  
  let soql = `SELECT ${nsFields} FROM ${nsObject}`;
  
  if (whereClause) {
    soql += ` WHERE ${whereClause}`;
  }
  if (orderBy) {
    soql += ` ORDER BY ${orderBy}`;
  }
  if (limit) {
    soql += ` LIMIT ${limit}`;
  }
  
  return soql;
}

/**
 * Get the configured namespace prefix
 */
export function getNamespace(): string {
  return NAMESPACE;
}

// =============================================================================
// Error Handling
// =============================================================================

async function handleSalesforceResponse(
  response: Response,
  operation: string
): Promise<void> {
  if (!response.ok) {
    let errors: SalesforceError[] = [];
    let errorMessage = '';
    
    try {
      const errorBody = await response.json();
      if (Array.isArray(errorBody)) {
        errors = errorBody;
        errorMessage = errorBody.map((e: SalesforceError) => e.message).join('; ');
      } else if (errorBody.message) {
        errorMessage = errorBody.message;
        errors = [{ statusCode: String(response.status), message: errorBody.message }];
      }
    } catch {
      errorMessage = await response.text();
    }
    
    console.error(`[Salesforce ${operation} Error] ${response.status} - ${errorMessage}`);
    throw new SalesforceApiError(
      `Salesforce ${operation} failed: ${errorMessage}`,
      response.status,
      errors
    );
  }
}

// =============================================================================
// Core CRUD Operations
// =============================================================================

/**
 * Execute a SOQL query against Salesforce
 */
export async function querySalesforce<T>(
  instanceUrl: string,
  accessToken: string,
  soql: string
): Promise<SoqlQueryResult<T>> {
  const url = `${instanceUrl}/services/data/v62.0/query?q=${encodeURIComponent(soql)}`;

  console.log(`[Salesforce Query] ${soql.slice(0, 200)}...`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  await handleSalesforceResponse(response, 'Query');

  const result = (await response.json()) as SoqlQueryResult<T>;
  console.log(`[Salesforce Result] ${result.totalSize} records`);
  return result;
}

/**
 * Execute a SOQL query and fetch all pages
 */
export async function queryAllSalesforce<T>(
  instanceUrl: string,
  accessToken: string,
  soql: string
): Promise<T[]> {
  const allRecords: T[] = [];
  let result = await querySalesforce<T>(instanceUrl, accessToken, soql);
  allRecords.push(...result.records);

  while (!result.done && result.nextRecordsUrl) {
    const response = await fetch(`${instanceUrl}${result.nextRecordsUrl}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    await handleSalesforceResponse(response, 'Query Next');
    result = (await response.json()) as SoqlQueryResult<T>;
    allRecords.push(...result.records);
  }

  console.log(`[Salesforce QueryAll] Total ${allRecords.length} records`);
  return allRecords;
}

/**
 * Check if we're in demo mode or have valid credentials
 */
export function hasValidCredentials(locals: App.Locals): boolean {
  return !!(locals.accessToken && locals.instanceUrl);
}

/**
 * Update a Salesforce record using PATCH
 */
export async function updateSalesforce(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<void> {
  const url = `${instanceUrl}/services/data/v62.0/sobjects/${objectName}/${recordId}`;

  console.log(`[Salesforce Update] ${objectName}/${recordId}`, JSON.stringify(data).slice(0, 500));

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  await handleSalesforceResponse(response, 'Update');
  console.log(`[Salesforce Update] Success`);
}

/**
 * Create a Salesforce record using POST
 */
export async function createSalesforce(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  data: Record<string, unknown>
): Promise<SalesforceCreateResult> {
  const url = `${instanceUrl}/services/data/v62.0/sobjects/${objectName}`;

  console.log(`[Salesforce Create] ${objectName}`, JSON.stringify(data).slice(0, 500));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  await handleSalesforceResponse(response, 'Create');

  const result = (await response.json()) as SalesforceCreateResult;
  console.log(`[Salesforce Create] Success - ${result.id}`);
  return result;
}

/**
 * Delete a Salesforce record
 */
export async function deleteSalesforce(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  recordId: string
): Promise<void> {
  const url = `${instanceUrl}/services/data/v62.0/sobjects/${objectName}/${recordId}`;

  console.log(`[Salesforce Delete] ${objectName}/${recordId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleSalesforceResponse(response, 'Delete');
  console.log(`[Salesforce Delete] Success`);
}

// =============================================================================
// Bulk Operations (using Composite API)
// =============================================================================

/**
 * Execute multiple operations in a single request using Composite API
 * Maximum 25 requests per composite call
 */
export async function compositeRequest(
  instanceUrl: string,
  accessToken: string,
  requests: CompositeRequest[]
): Promise<CompositeResponse> {
  const url = `${instanceUrl}/services/data/v62.0/composite`;

  console.log(`[Salesforce Composite] ${requests.length} requests`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      allOrNone: false,
      compositeRequest: requests,
    }),
  });

  await handleSalesforceResponse(response, 'Composite');
  
  const result = (await response.json()) as CompositeResponse;
  console.log(`[Salesforce Composite] Success`);
  return result;
}

/**
 * Bulk create records (up to 200 per call using SObject Collections)
 */
export async function bulkCreateSalesforce(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  records: Record<string, unknown>[]
): Promise<SalesforceCreateResult[]> {
  if (records.length === 0) return [];
  if (records.length > 200) {
    throw new Error('bulkCreateSalesforce: Maximum 200 records per call');
  }

  const url = `${instanceUrl}/services/data/v62.0/composite/sobjects`;

  console.log(`[Salesforce Bulk Create] ${objectName} - ${records.length} records`);

  // Add attributes to each record
  const recordsWithType = records.map(record => ({
    attributes: { type: objectName },
    ...record,
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      allOrNone: false,
      records: recordsWithType,
    }),
  });

  await handleSalesforceResponse(response, 'Bulk Create');
  
  const results = (await response.json()) as SalesforceCreateResult[];
  const successCount = results.filter(r => r.success).length;
  console.log(`[Salesforce Bulk Create] ${successCount}/${records.length} successful`);
  
  return results;
}

/**
 * Bulk update records (up to 200 per call using SObject Collections)
 */
export async function bulkUpdateSalesforce(
  instanceUrl: string,
  accessToken: string,
  objectName: string,
  records: Array<{ Id: string } & Record<string, unknown>>
): Promise<SalesforceCreateResult[]> {
  if (records.length === 0) return [];
  if (records.length > 200) {
    throw new Error('bulkUpdateSalesforce: Maximum 200 records per call');
  }

  const url = `${instanceUrl}/services/data/v62.0/composite/sobjects`;

  console.log(`[Salesforce Bulk Update] ${objectName} - ${records.length} records`);

  // Add attributes to each record
  const recordsWithType = records.map(record => ({
    attributes: { type: objectName },
    ...record,
  }));

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      allOrNone: false,
      records: recordsWithType,
    }),
  });

  await handleSalesforceResponse(response, 'Bulk Update');
  
  const results = (await response.json()) as SalesforceCreateResult[];
  const successCount = results.filter(r => r.success).length;
  console.log(`[Salesforce Bulk Update] ${successCount}/${records.length} successful`);
  
  return results;
}

/**
 * Bulk delete records (up to 200 per call)
 */
export async function bulkDeleteSalesforce(
  instanceUrl: string,
  accessToken: string,
  recordIds: string[]
): Promise<SalesforceCreateResult[]> {
  if (recordIds.length === 0) return [];
  if (recordIds.length > 200) {
    throw new Error('bulkDeleteSalesforce: Maximum 200 records per call');
  }

  const url = `${instanceUrl}/services/data/v62.0/composite/sobjects?ids=${recordIds.join(',')}&allOrNone=false`;

  console.log(`[Salesforce Bulk Delete] ${recordIds.length} records`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await handleSalesforceResponse(response, 'Bulk Delete');
  
  const results = (await response.json()) as SalesforceCreateResult[];
  const successCount = results.filter(r => r.success).length;
  console.log(`[Salesforce Bulk Delete] ${successCount}/${recordIds.length} successful`);
  
  return results;
}

// =============================================================================
// License Utilities
// =============================================================================

export interface LicenseInfo {
  pbx: { enabled: boolean; limit: number; used: number };
  cti: { enabled: boolean; limit: number; used: number };
  manager: { enabled: boolean; limit: number; used: number };
  record: { enabled: boolean; limit: number; used: number };
  sms: { enabled: boolean; limit: number; used: number };
  whatsApp: { enabled: boolean; limit: number; used: number };
  insights: { enabled: boolean; limit: number; used: number };
  freedom: { enabled: boolean; limit: number; used: number };
  pci: { enabled: boolean; limit: number; used: number };
  scv: { enabled: boolean; limit: number; used: number };
}

/**
 * Get organization license information
 */
export async function getLicenseInfo(
  instanceUrl: string,
  accessToken: string
): Promise<LicenseInfo> {
  const ns = getNamespace();
  
  // Query license settings
  const licenseSoql = `
    SELECT 
      ${ns}__PBX__c, ${ns}__CTI__c, ${ns}__Manager__c, ${ns}__Record__c,
      ${ns}__SMS__c, ${ns}__WhatsApp__c, ${ns}__Insights__c, ${ns}__Freedom__c,
      ${ns}__PCI__c, ${ns}__SCV__c,
      ${ns}__PBX_Licenses__c, ${ns}__CTI_Licenses__c, ${ns}__Manager_Licenses__c,
      ${ns}__Record_Licenses__c, ${ns}__SMS_Licenses__c, ${ns}__WhatsApp_Licenses__c,
      ${ns}__Insights_Licenses__c, ${ns}__Freedom_Licenses__c
    FROM ${ns}__License_v1__c
    LIMIT 1
  `;
  
  // Query current license usage from users
  const usageSoql = `
    SELECT 
      COUNT(Id) total,
      COUNT_DISTINCT(CASE WHEN ${ns}__PBX__c = true THEN Id END) pbxCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__CTI__c = true THEN Id END) ctiCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__Manager__c = true THEN Id END) managerCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__Record__c = true THEN Id END) recordCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__SMS__c = true THEN Id END) smsCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__WhatsApp__c = true THEN Id END) whatsAppCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__Insights__c = true THEN Id END) insightsCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__Freedom__c = true THEN Id END) freedomCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__PCI__c = true THEN Id END) pciCount,
      COUNT_DISTINCT(CASE WHEN ${ns}__SCV__c = true THEN Id END) scvCount
    FROM ${ns}__User__c
    WHERE ${ns}__Enabled__c = true
  `;
  
  try {
    const licenseResult = await querySalesforce<Record<string, unknown>>(instanceUrl, accessToken, licenseSoql);
    const license = licenseResult.records[0] || {};
    
    // For now, return a simplified version - usage counting via aggregate queries
    // is complex, so we'll count manually if needed
    return {
      pbx: { enabled: Boolean(license[`${ns}__PBX__c`]), limit: Number(license[`${ns}__PBX_Licenses__c`]) || 0, used: 0 },
      cti: { enabled: Boolean(license[`${ns}__CTI__c`]), limit: Number(license[`${ns}__CTI_Licenses__c`]) || 0, used: 0 },
      manager: { enabled: Boolean(license[`${ns}__Manager__c`]), limit: Number(license[`${ns}__Manager_Licenses__c`]) || 0, used: 0 },
      record: { enabled: Boolean(license[`${ns}__Record__c`]), limit: Number(license[`${ns}__Record_Licenses__c`]) || 0, used: 0 },
      sms: { enabled: Boolean(license[`${ns}__SMS__c`]), limit: Number(license[`${ns}__SMS_Licenses__c`]) || 0, used: 0 },
      whatsApp: { enabled: Boolean(license[`${ns}__WhatsApp__c`]), limit: Number(license[`${ns}__WhatsApp_Licenses__c`]) || 0, used: 0 },
      insights: { enabled: Boolean(license[`${ns}__Insights__c`]), limit: Number(license[`${ns}__Insights_Licenses__c`]) || 0, used: 0 },
      freedom: { enabled: Boolean(license[`${ns}__Freedom__c`]), limit: Number(license[`${ns}__Freedom_Licenses__c`]) || 0, used: 0 },
      pci: { enabled: false, limit: 0, used: 0 },
      scv: { enabled: false, limit: 0, used: 0 },
    };
  } catch (error) {
    console.warn('Failed to fetch license info:', error);
    // Return defaults if license query fails
    return {
      pbx: { enabled: true, limit: 999, used: 0 },
      cti: { enabled: true, limit: 999, used: 0 },
      manager: { enabled: true, limit: 999, used: 0 },
      record: { enabled: true, limit: 999, used: 0 },
      sms: { enabled: true, limit: 999, used: 0 },
      whatsApp: { enabled: true, limit: 999, used: 0 },
      insights: { enabled: true, limit: 999, used: 0 },
      freedom: { enabled: true, limit: 999, used: 0 },
      pci: { enabled: true, limit: 999, used: 0 },
      scv: { enabled: true, limit: 999, used: 0 },
    };
  }
}

/**
 * Count license usage for a specific license type
 */
export async function countLicenseUsage(
  instanceUrl: string,
  accessToken: string,
  licenseField: string
): Promise<number> {
  const ns = getNamespace();
  const soql = `SELECT COUNT() FROM ${ns}__User__c WHERE ${ns}__Enabled__c = true AND ${ns}__${licenseField}__c = true`;
  
  const result = await querySalesforce<Record<string, unknown>>(instanceUrl, accessToken, soql);
  return result.totalSize;
}

