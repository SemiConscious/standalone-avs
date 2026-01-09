/**
 * Salesforce Routing Policy SOQL Query Builders
 */

import type { RoutingPolicyQueryParams } from '$lib/repositories';

// =============================================================================
// Field Lists
// =============================================================================

export function getRoutingPolicySelectFields(ns: string): string {
  return `
    Id, Name, ${ns}__Id__c, ${ns}__Source__c, ${ns}__Type__c, ${ns}__Status__c,
    ${ns}__Description__c, ${ns}__Body__c, CreatedById, CreatedBy.Id, CreatedBy.Name, CreatedDate,
    LastModifiedById, LastModifiedBy.Id, LastModifiedBy.Name, LastModifiedDate
  `.trim().replace(/\s+/g, ' ');
}

// =============================================================================
// Query Builders
// =============================================================================

export function buildRoutingPolicyListQuery(ns: string, params: RoutingPolicyQueryParams): string {
  const fields = getRoutingPolicySelectFields(ns);
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(Name LIKE '%${searchTerm}%' OR ${ns}__Description__c LIKE '%${searchTerm}%')`);
  }

  if (params.filters?.type) {
    conditions.push(`${ns}__Type__c = '${params.filters.type}'`);
  }
  if (params.filters?.status) {
    conditions.push(`${ns}__Status__c = '${params.filters.status}'`);
  }
  if (params.filters?.source) {
    conditions.push(`${ns}__Source__c = '${params.filters.source}'`);
  }
  if (params.filters?.createdById) {
    conditions.push(`CreatedById = '${params.filters.createdById}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortOrder = params.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const offset = (params.page - 1) * params.pageSize;

  return `SELECT ${fields} FROM ${ns}__CallFlow__c ${whereClause} ORDER BY ${ns}__Source__c, ${ns}__Type__c, Name ${sortOrder} LIMIT ${params.pageSize} OFFSET ${offset}`;
}

export function buildRoutingPolicyCountQuery(ns: string, params: RoutingPolicyQueryParams): string {
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(Name LIKE '%${searchTerm}%' OR ${ns}__Description__c LIKE '%${searchTerm}%')`);
  }
  if (params.filters?.type) {
    conditions.push(`${ns}__Type__c = '${params.filters.type}'`);
  }
  if (params.filters?.status) {
    conditions.push(`${ns}__Status__c = '${params.filters.status}'`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return `SELECT COUNT() FROM ${ns}__CallFlow__c ${whereClause}`;
}

export function buildRoutingPolicyByIdQuery(ns: string, id: string): string {
  const fields = getRoutingPolicySelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__CallFlow__c WHERE Id = '${id}' LIMIT 1`;
}

export function buildRoutingPolicyByNameQuery(ns: string, name: string): string {
  const fields = getRoutingPolicySelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__CallFlow__c WHERE Name = '${name}' LIMIT 1`;
}

export function buildPolicyBodyQuery(ns: string, id: string): string {
  return `SELECT ${ns}__Body__c FROM ${ns}__CallFlow__c WHERE Id = '${id}' LIMIT 1`;
}

export function buildPolicyJsonQuery(ns: string, id: string): string {
  return `SELECT ${ns}__Policy__c FROM ${ns}__CallFlow__c WHERE Id = '${id}' LIMIT 1`;
}

export function buildPhoneNumberAssignmentsQuery(ns: string, policyIds: string[]): string {
  const idList = policyIds.map(id => `'${id}'`).join(',');
  return `SELECT Id, ${ns}__Number__c, ${ns}__CallFlow__c FROM ${ns}__PhoneNumber__c WHERE ${ns}__CallFlow__c IN (${idList})`;
}
