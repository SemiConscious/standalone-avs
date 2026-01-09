/**
 * Salesforce Phone Number SOQL Query Builders
 */

import type { PhoneNumberQueryParams } from '$lib/repositories';

// =============================================================================
// Field Lists
// =============================================================================

export function getPhoneNumberSelectFields(ns: string): string {
  // Fields verified from original working implementation
  return `
    Id, Name, ${ns}__Number__c,
    ${ns}__Country__c, ${ns}__CountryCode__c,
    ${ns}__AreaCode__c, ${ns}__Area__c, ${ns}__LocalNumber__c,
    ${ns}__DDI_Number__c, ${ns}__Geographic__c,
    ${ns}__Capability_SMS__c, ${ns}__Capability_MMS__c, ${ns}__Capability_Voice__c,
    ${ns}__Local_Presence_Enabled__c, LastModifiedDate,
    ${ns}__CallFlow__c, ${ns}__CallFlow__r.Id, ${ns}__CallFlow__r.Name,
    ${ns}__User__c, ${ns}__User__r.Id, ${ns}__User__r.Name
  `.trim().replace(/\s+/g, ' ');
}

// =============================================================================
// Query Builders
// =============================================================================

export function buildPhoneNumberListQuery(ns: string, params: PhoneNumberQueryParams): string {
  const fields = getPhoneNumberSelectFields(ns);
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(${ns}__Number__c LIKE '%${searchTerm}%' OR ${ns}__Description__c LIKE '%${searchTerm}%' OR Name LIKE '%${searchTerm}%')`);
  }

  if (params.filters?.type) {
    conditions.push(`${ns}__Type__c = '${params.filters.type}'`);
  }
  if (params.filters?.status) {
    conditions.push(`${ns}__Status__c = '${params.filters.status}'`);
  }
  if (params.filters?.countryCode) {
    conditions.push(`${ns}__CountryCode__c = '${params.filters.countryCode}'`);
  }
  if (params.filters?.assigned !== undefined) {
    if (params.filters.assigned) {
      conditions.push(`${ns}__CallFlow__c != null`);
    } else {
      conditions.push(`${ns}__CallFlow__c = null`);
    }
  }
  if (params.filters?.routingPolicyId) {
    conditions.push(`${ns}__CallFlow__c = '${params.filters.routingPolicyId}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortField = params.sortBy === 'number' ? `${ns}__Number__c` : 'Name';
  const sortOrder = params.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const offset = (params.page - 1) * params.pageSize;

  return `SELECT ${fields} FROM ${ns}__PhoneNumber__c ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${params.pageSize} OFFSET ${offset}`;
}

export function buildPhoneNumberCountQuery(ns: string, params: PhoneNumberQueryParams): string {
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(${ns}__Number__c LIKE '%${searchTerm}%' OR Name LIKE '%${searchTerm}%')`);
  }
  if (params.filters?.type) {
    conditions.push(`${ns}__Type__c = '${params.filters.type}'`);
  }
  if (params.filters?.status) {
    conditions.push(`${ns}__Status__c = '${params.filters.status}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return `SELECT COUNT() FROM ${ns}__PhoneNumber__c ${whereClause}`;
}

export function buildPhoneNumberByIdQuery(ns: string, id: string): string {
  const fields = getPhoneNumberSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__PhoneNumber__c WHERE Id = '${id}' LIMIT 1`;
}

export function buildPhoneNumberByNumberQuery(ns: string, number: string): string {
  const fields = getPhoneNumberSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__PhoneNumber__c WHERE ${ns}__Number__c = '${number}' LIMIT 1`;
}

export function buildPhoneNumbersByPolicyQuery(ns: string, policyId: string): string {
  const fields = getPhoneNumberSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__PhoneNumber__c WHERE ${ns}__CallFlow__c = '${policyId}'`;
}

export function buildUnassignedPhoneNumbersQuery(ns: string): string {
  const fields = getPhoneNumberSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__PhoneNumber__c WHERE ${ns}__CallFlow__c = null ORDER BY ${ns}__Number__c`;
}
