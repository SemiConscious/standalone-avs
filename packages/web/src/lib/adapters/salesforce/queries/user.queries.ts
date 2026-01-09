/**
 * Salesforce User SOQL Query Builders
 * 
 * All SOQL query construction for User entities is contained here.
 */

import type { UserQueryParams } from '$lib/repositories';

// =============================================================================
// Field Lists
// =============================================================================

/**
 * Standard fields to select for user queries
 */
export function getUserSelectFields(ns: string): string {
  return `
    Id, Name, ${ns}__Id__c,
    ${ns}__FirstName__c, ${ns}__LastName__c,
    ${ns}__Username__c, ${ns}__SipExtension__c, ${ns}__MobilePhone__c,
    ${ns}__Status__c, ${ns}__Enabled__c,
    ${ns}__CTI__c, ${ns}__PBX__c, ${ns}__Manager__c, ${ns}__Record__c,
    ${ns}__PCI__c, ${ns}__SCV__c, ${ns}__SMS__c, ${ns}__WhatsApp__c,
    ${ns}__Insights__c, ${ns}__Freedom__c, ${ns}__PermissionLevel__c,
    ${ns}__TrackOutboundCTIDevice__c,
    ${ns}__AvailabilityProfile__c,
    ${ns}__AvailabilityProfile__r.Id, ${ns}__AvailabilityProfile__r.Name,
    ${ns}__AvailabilityProfileState__r.Name,
    ${ns}__AvailabilityProfileState__r.${ns}__DisplayName__c,
    ${ns}__User__c, ${ns}__User__r.Id, ${ns}__User__r.Name, ${ns}__User__r.Email
  `.trim().replace(/\s+/g, ' ');
}

// =============================================================================
// Query Builders
// =============================================================================

/**
 * Build SOQL query for user list
 */
export function buildUserListQuery(ns: string, params: UserQueryParams): string {
  const fields = getUserSelectFields(ns);
  const conditions: string[] = [];

  // Search condition
  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    const searchFields = [
      'Name',
      `${ns}__Username__c`,
      `${ns}__SipExtension__c`,
      `${ns}__FirstName__c`,
      `${ns}__LastName__c`,
    ];
    const searchConditions = searchFields.map(f => `${f} LIKE '%${searchTerm}%'`);
    conditions.push(`(${searchConditions.join(' OR ')})`);
  }

  // Status filter
  if (params.filters?.status) {
    if (params.filters.status === 'active') {
      conditions.push(`${ns}__Enabled__c = true`);
    } else if (params.filters.status === 'inactive') {
      conditions.push(`${ns}__Enabled__c = false`);
    }
  }

  // Enabled filter
  if (params.filters?.enabled !== undefined) {
    conditions.push(`${ns}__Enabled__c = ${params.filters.enabled}`);
  }

  // Permission level filter
  if (params.filters?.permissionLevel) {
    conditions.push(`${ns}__PermissionLevel__c = '${params.filters.permissionLevel}'`);
  }

  // Build WHERE clause
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Sort field mapping
  const sortFieldMap: Record<string, string> = {
    name: 'Name',
    user: 'Name',
    extension: `${ns}__SipExtension__c`,
    status: `${ns}__Enabled__c`,
    permissionLevel: `${ns}__PermissionLevel__c`,
  };
  const sortField = sortFieldMap[params.sortBy || 'name'] || 'Name';
  const sortOrder = params.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const orderByClause = `ORDER BY ${sortField} ${sortOrder}`;

  // Pagination
  const offset = (params.page - 1) * params.pageSize;
  const paginationClause = `LIMIT ${params.pageSize} OFFSET ${offset}`;

  return `SELECT ${fields} FROM ${ns}__User__c ${whereClause} ${orderByClause} ${paginationClause}`;
}

/**
 * Build SOQL query for user count
 */
export function buildUserCountQuery(ns: string, params: UserQueryParams): string {
  const conditions: string[] = [];

  // Same filters as list query
  if (params.search) {
    const searchTerm = params.search.replace(/'/g, "\\'");
    const searchFields = [
      'Name',
      `${ns}__Username__c`,
      `${ns}__SipExtension__c`,
      `${ns}__FirstName__c`,
      `${ns}__LastName__c`,
    ];
    const searchConditions = searchFields.map(f => `${f} LIKE '%${searchTerm}%'`);
    conditions.push(`(${searchConditions.join(' OR ')})`);
  }

  if (params.filters?.status) {
    if (params.filters.status === 'active') {
      conditions.push(`${ns}__Enabled__c = true`);
    } else if (params.filters.status === 'inactive') {
      conditions.push(`${ns}__Enabled__c = false`);
    }
  }

  if (params.filters?.enabled !== undefined) {
    conditions.push(`${ns}__Enabled__c = ${params.filters.enabled}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return `SELECT COUNT() FROM ${ns}__User__c ${whereClause}`;
}

/**
 * Build SOQL query for single user by ID
 */
export function buildUserByIdQuery(ns: string, id: string): string {
  const fields = getUserSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__User__c WHERE Id = '${id}' LIMIT 1`;
}

/**
 * Build SOQL query for user by extension
 */
export function buildUserByExtensionQuery(ns: string, extension: string): string {
  const fields = getUserSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__User__c WHERE ${ns}__SipExtension__c = '${extension}' LIMIT 1`;
}

/**
 * Build SOQL query for user by email
 */
export function buildUserByEmailQuery(ns: string, email: string): string {
  const fields = getUserSelectFields(ns);
  return `SELECT ${fields} FROM ${ns}__User__c WHERE ${ns}__Username__c = '${email}' LIMIT 1`;
}

/**
 * Build SOQL query for group memberships
 */
export function buildGroupMembershipsQuery(ns: string, userId: string): string {
  return `SELECT ${ns}__Group__c, ${ns}__Group__r.Name FROM ${ns}__GroupMember__c WHERE ${ns}__User__c = '${userId}'`;
}

/**
 * Build SOQL query for availability profiles
 */
export function buildAvailabilityProfilesQuery(ns: string): string {
  return `SELECT Id, Name, ${ns}__Id__c, CreatedBy.Name FROM ${ns}__AvailabilityProfile__c ORDER BY Name LIMIT 100`;
}

/**
 * Build SOQL query for CRM users (standard Salesforce Users)
 */
export function buildCrmUsersQuery(): string {
  return `SELECT Id, Name, Email FROM User WHERE IsActive = true ORDER BY Name LIMIT 500`;
}

/**
 * Build SOQL query to check extension availability
 */
export function buildExtensionCheckQuery(ns: string, extension: string, excludeUserId?: string): string {
  let userQuery = `SELECT Id FROM ${ns}__User__c WHERE ${ns}__SipExtension__c = '${extension}'`;
  if (excludeUserId) {
    userQuery += ` AND Id != '${excludeUserId}'`;
  }
  userQuery += ' LIMIT 1';
  return userQuery;
}

/**
 * Build SOQL query to check extension in groups
 */
export function buildGroupExtensionCheckQuery(ns: string, extension: string): string {
  return `SELECT Id FROM ${ns}__Group__c WHERE ${ns}__Extension__c = '${extension}' LIMIT 1`;
}

/**
 * Build SOQL query for user IDs (for group memberships lookup)
 */
export function buildGroupMembershipsForUsersQuery(ns: string, userIds: string[]): string {
  const idList = userIds.map(id => `'${id}'`).join(',');
  return `SELECT ${ns}__User__c, ${ns}__Group__r.Name FROM ${ns}__GroupMember__c WHERE ${ns}__User__c IN (${idList})`;
}
