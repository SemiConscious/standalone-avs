/**
 * Salesforce Routing Policy Mapper
 */

import type { RoutingPolicy, PolicyBody, PolicyStatus, PolicyType, PolicySource, CreateRoutingPolicyInput, UpdateRoutingPolicyInput } from '$lib/domain';
import { createDefaultPolicyBody, createDefaultPolicyJson, parsePolicyStatus } from '$lib/domain';
import type { SalesforceCallFlowRecord } from '../types';

// =============================================================================
// Salesforce -> Domain Mappers
// =============================================================================

/**
 * Map a Salesforce CallFlow__c record to a domain RoutingPolicy
 */
export function mapSalesforceRoutingPolicy(sf: SalesforceCallFlowRecord, phoneNumbers: string[] = []): RoutingPolicy {
  return {
    id: sf.Id,
    platformId: sf.nbavs__Id__c,
    name: sf.Name,
    description: sf.nbavs__Description__c || '',
    source: mapPolicySource(sf.nbavs__Source__c),
    type: mapPolicyType(sf.nbavs__Type__c),
    status: parsePolicyStatus(sf.nbavs__Status__c),
    createdById: sf.CreatedBy?.Id || sf.CreatedById,
    createdByName: sf.CreatedBy?.Name || 'Unknown',
    createdDate: sf.CreatedDate,
    lastModifiedById: sf.LastModifiedBy?.Id || sf.LastModifiedById,
    lastModifiedByName: sf.LastModifiedBy?.Name || 'Unknown',
    lastModifiedDate: sf.LastModifiedDate,
    phoneNumbers,
    body: sf.nbavs__Body__c,
  };
}

function mapPolicySource(source?: string): PolicySource {
  return source === 'Outbound' ? 'Outbound' : 'Inbound';
}

function mapPolicyType(type?: string): PolicyType {
  switch (type) {
    case 'Call': return 'Call';
    case 'Digital': return 'Digital';
    case 'Outbound': return 'Outbound';
    case 'IVR': return 'IVR';
    case 'Queue': return 'Queue';
    case 'Hunt': return 'Hunt';
    default: return 'Call';
  }
}

/**
 * Parse policy body from JSON string
 */
export function parsePolicyBody(bodyJson?: string): PolicyBody | null {
  if (!bodyJson) return null;
  try {
    return JSON.parse(bodyJson) as PolicyBody;
  } catch {
    return null;
  }
}

// =============================================================================
// Domain -> Salesforce Mappers
// =============================================================================

export function mapCreateRoutingPolicyToSalesforce(input: CreateRoutingPolicyInput, namespace: string): Record<string, unknown> {
  const ns = namespace;
  const defaultBody = JSON.stringify(createDefaultPolicyBody());
  const defaultPolicy = createDefaultPolicyJson(input.name, input.type || 'Call');

  return {
    Name: input.name,
    [`${ns}__Description__c`]: input.description || '',
    [`${ns}__Body__c`]: defaultBody,
    [`${ns}__Policy__c`]: defaultPolicy,
    [`${ns}__Status__c`]: 'Disabled',
    [`${ns}__Type__c`]: input.type || 'Call',
    [`${ns}__Source__c`]: input.source || 'Inbound',
  };
}

export function mapUpdateRoutingPolicyToSalesforce(input: UpdateRoutingPolicyInput, namespace: string): Record<string, unknown> {
  const ns = namespace;
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.Name = input.name;
  if (input.description !== undefined) data[`${ns}__Description__c`] = input.description;
  if (input.status !== undefined) data[`${ns}__Status__c`] = input.status;
  if (input.body !== undefined) data[`${ns}__Body__c`] = JSON.stringify(input.body);
  if (input.policy !== undefined) data[`${ns}__Policy__c`] = input.policy;

  return data;
}
