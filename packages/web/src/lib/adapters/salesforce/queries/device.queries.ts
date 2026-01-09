/**
 * Salesforce Device SOQL Query Builders
 */

import type { DeviceQueryParams } from '$lib/repositories';

// =============================================================================
// Field Lists
// =============================================================================

export function getDeviceSelectFields(ns: string): string {
  return `
    Id, Name, ${ns}__Id__c, ${ns}__Extension__c, ${ns}__Location__c, ${ns}__Type__c,
    ${ns}__Description__c, ${ns}__Enabled__c, ${ns}__Model__c, ${ns}__Registered__c,
    ${ns}__RegistrationExpiry__c, ${ns}__MAC__c, LastModifiedDate,
    (SELECT Id, ${ns}__User__c, ${ns}__User__r.Id, ${ns}__User__r.Name FROM ${ns}__DeviceMappings__r)
  `.trim().replace(/\s+/g, ' ');
}

// =============================================================================
// Query Builders
// =============================================================================

export function buildDeviceListQuery(ns: string, params: DeviceQueryParams): string {
  const fields = getDeviceSelectFields(ns);
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(${ns}__Extension__c LIKE '%${searchTerm}%' OR ${ns}__Description__c LIKE '%${searchTerm}%' OR ${ns}__Location__c LIKE '%${searchTerm}%')`);
  }

  if (params.filters?.type) {
    conditions.push(`${ns}__Type__c = '${params.filters.type}'`);
  }
  if (params.filters?.enabled !== undefined) {
    conditions.push(`${ns}__Enabled__c = ${params.filters.enabled}`);
  }
  if (params.filters?.registered !== undefined) {
    conditions.push(`${ns}__Registered__c = ${params.filters.registered}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortField = params.sortBy === 'extension' ? `${ns}__Extension__c` : 'LastModifiedDate';
  const sortOrder = params.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (params.page - 1) * params.pageSize;

  return `SELECT ${fields} FROM ${ns}__Device__c ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${params.pageSize} OFFSET ${offset}`;
}

export function buildDeviceCountQuery(ns: string, params: DeviceQueryParams): string {
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(${ns}__Extension__c LIKE '%${searchTerm}%' OR ${ns}__Description__c LIKE '%${searchTerm}%')`);
  }
  if (params.filters?.type) {
    conditions.push(`${ns}__Type__c = '${params.filters.type}'`);
  }
  if (params.filters?.enabled !== undefined) {
    conditions.push(`${ns}__Enabled__c = ${params.filters.enabled}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return `SELECT COUNT() FROM ${ns}__Device__c ${whereClause}`;
}

export function buildDeviceByIdQuery(ns: string, id: string): string {
  const fields = getDeviceSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__Device__c WHERE Id = '${id}' LIMIT 1`;
}

export function buildDeviceByExtensionQuery(ns: string, extension: string): string {
  const fields = getDeviceSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__Device__c WHERE ${ns}__Extension__c = '${extension}' LIMIT 1`;
}

export function buildDeviceByMacQuery(ns: string, mac: string): string {
  const fields = getDeviceSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__Device__c WHERE ${ns}__MAC__c = '${mac}' LIMIT 1`;
}

export function buildDevicesForUserQuery(ns: string, userId: string): string {
  return `
    SELECT ${ns}__Device__c, ${ns}__Device__r.Id, ${ns}__Device__r.${ns}__Extension__c,
           ${ns}__Device__r.${ns}__Description__c, ${ns}__Device__r.${ns}__Type__c,
           ${ns}__Device__r.${ns}__Enabled__c, ${ns}__Device__r.${ns}__Registered__c
    FROM ${ns}__DeviceMapping__c
    WHERE ${ns}__User__c = '${userId}'
  `;
}
