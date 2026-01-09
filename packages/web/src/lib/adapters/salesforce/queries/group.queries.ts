/**
 * Salesforce Group SOQL Query Builders
 */

import type { GroupQueryParams } from '$lib/repositories';

// =============================================================================
// Field Lists
// =============================================================================

export function getGroupSelectFields(ns: string): string {
  return `
    Id, Name, ${ns}__Id__c, ${ns}__Description__c, ${ns}__Email__c,
    ${ns}__Extension__c, ${ns}__GroupPickup__c, ${ns}__PBX__c,
    ${ns}__Manager__c, ${ns}__Record__c, LastModifiedDate
  `.trim().replace(/\s+/g, ' ');
}

// =============================================================================
// Query Builders
// =============================================================================

export function buildGroupListQuery(ns: string, params: GroupQueryParams): string {
  const fields = getGroupSelectFields(ns);
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(Name LIKE '%${searchTerm}%' OR ${ns}__Description__c LIKE '%${searchTerm}%')`);
  }

  if (params.filters?.pbx !== undefined) {
    conditions.push(`${ns}__PBX__c = ${params.filters.pbx}`);
  }
  if (params.filters?.manager !== undefined) {
    conditions.push(`${ns}__Manager__c = ${params.filters.manager}`);
  }
  if (params.filters?.record !== undefined) {
    conditions.push(`${ns}__Record__c = ${params.filters.record}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortField = params.sortBy === 'extension' ? `${ns}__Extension__c` : 'Name';
  const sortOrder = params.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const offset = (params.page - 1) * params.pageSize;

  return `SELECT ${fields} FROM ${ns}__Group__c ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ${params.pageSize} OFFSET ${offset}`;
}

export function buildGroupCountQuery(ns: string, params: GroupQueryParams): string {
  const conditions: string[] = [];

  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    conditions.push(`(Name LIKE '%${searchTerm}%' OR ${ns}__Description__c LIKE '%${searchTerm}%')`);
  }

  if (params.filters?.pbx !== undefined) {
    conditions.push(`${ns}__PBX__c = ${params.filters.pbx}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return `SELECT COUNT() FROM ${ns}__Group__c ${whereClause}`;
}

export function buildGroupByIdQuery(ns: string, id: string): string {
  const fields = getGroupSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__Group__c WHERE Id = '${id}' LIMIT 1`;
}

export function buildGroupMembersQuery(ns: string, groupId: string): string {
  return `
    SELECT Id, ${ns}__Group__c, ${ns}__Group__r.Name, 
           ${ns}__User__c, ${ns}__User__r.Name, ${ns}__RingOrder__c
    FROM ${ns}__GroupMember__c 
    WHERE ${ns}__Group__c = '${groupId}'
    ORDER BY ${ns}__RingOrder__c NULLS LAST
  `;
}

export function buildMemberCountsQuery(ns: string, groupIds: string[]): string {
  const idList = groupIds.map(id => `'${id}'`).join(',');
  return `SELECT ${ns}__Group__c, COUNT(Id) cnt FROM ${ns}__GroupMember__c WHERE ${ns}__Group__c IN (${idList}) GROUP BY ${ns}__Group__c`;
}
