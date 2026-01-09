/**
 * Salesforce Call Log SOQL Query Builders
 */

import type { CallLogQueryParams } from '$lib/repositories';

// =============================================================================
// Field Lists
// =============================================================================

export function getCallLogSelectFields(ns: string): string {
  return `
    Id, ${ns}__DateTime__c, ${ns}__FromNumber__c, ${ns}__ToNumber__c,
    ${ns}__Direction__c, ${ns}__TimeTalking__c, ${ns}__TimeRinging__c, ${ns}__TimeHunting__c,
    ${ns}__Recorded_A__c, ${ns}__Recorded_B__c, ${ns}__aUUId__c, ${ns}__bUUId__c,
    ${ns}__FromUser__c, ${ns}__FromUser__r.Id, ${ns}__FromUser__r.Name,
    ${ns}__ToUser__c, ${ns}__ToUser__r.Id, ${ns}__ToUser__r.Name
  `.trim().replace(/\s+/g, ' ');
}

// =============================================================================
// Query Builders
// =============================================================================

export function buildCallLogListQuery(ns: string, params: CallLogQueryParams): string {
  const fields = getCallLogSelectFields(ns);
  const conditions: string[] = [];

  // Date range filters
  if (params.filters?.fromDate) {
    conditions.push(`${ns}__DateTime__c >= ${params.filters.fromDate}T00:00:00Z`);
  }
  if (params.filters?.toDate) {
    conditions.push(`${ns}__DateTime__c <= ${params.filters.toDate}T23:59:59Z`);
  }

  // User filter
  if (params.filters?.userId) {
    conditions.push(`(${ns}__FromUser__c = '${params.filters.userId}' OR ${ns}__ToUser__c = '${params.filters.userId}')`);
  }

  // Phone number filter
  if (params.filters?.phoneNumber) {
    const phone = params.filters.phoneNumber.replace(/'/g, "\\'");
    conditions.push(`(${ns}__FromNumber__c LIKE '%${phone}%' OR ${ns}__ToNumber__c LIKE '%${phone}%')`);
  }

  // Direction filter
  if (params.filters?.direction) {
    conditions.push(`${ns}__Direction__c = '${params.filters.direction}'`);
  }

  // Recording filter
  if (params.filters?.hasRecording !== undefined) {
    if (params.filters.hasRecording) {
      conditions.push(`(${ns}__Recorded_A__c = true OR ${ns}__Recorded_B__c = true)`);
    } else {
      conditions.push(`${ns}__Recorded_A__c = false AND ${ns}__Recorded_B__c = false`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (params.page - 1) * params.pageSize;

  return `SELECT ${fields} FROM ${ns}__CallLog__c ${whereClause} ORDER BY ${ns}__DateTime__c DESC LIMIT ${params.pageSize} OFFSET ${offset}`;
}

export function buildCallLogCountQuery(ns: string, params: CallLogQueryParams): string {
  const conditions: string[] = [];

  if (params.filters?.fromDate) {
    conditions.push(`${ns}__DateTime__c >= ${params.filters.fromDate}T00:00:00Z`);
  }
  if (params.filters?.toDate) {
    conditions.push(`${ns}__DateTime__c <= ${params.filters.toDate}T23:59:59Z`);
  }
  if (params.filters?.userId) {
    conditions.push(`(${ns}__FromUser__c = '${params.filters.userId}' OR ${ns}__ToUser__c = '${params.filters.userId}')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return `SELECT COUNT() FROM ${ns}__CallLog__c ${whereClause}`;
}

export function buildCallLogByIdQuery(ns: string, id: string): string {
  const fields = getCallLogSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__CallLog__c WHERE Id = '${id}' LIMIT 1`;
}
