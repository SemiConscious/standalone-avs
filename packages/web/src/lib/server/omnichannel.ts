/**
 * OmniChannel API Service
 * 
 * This service handles OmniChannel/Digital features including:
 * - Digital channel groups (WhatsApp, SMS, etc.)
 * - Shared inboxes
 * - OmniChannel queues and flows (from Salesforce)
 * - Message templates
 * 
 * API: https://omnichannel-us.natterbox.net/v1/omni
 */

import { env } from '$env/dynamic/private';
import { querySalesforce } from './salesforce';

// Default hosts
const DEFAULT_OMNI_REST_HOST = 'https://omnichannel-us.natterbox.net';
const DEFAULT_OMNI_TEMPLATES_HOST = 'https://message-templates-us.natterbox.net';

/**
 * Get the OmniChannel REST API host URL
 */
export function getOmniChannelRestHost(): string {
  return env.OMNI_REST_HOST || DEFAULT_OMNI_REST_HOST;
}

/**
 * Get the OmniChannel Templates API host URL
 */
export function getOmniChannelTemplatesHost(): string {
  return env.OMNI_TEMPLATES_HOST || DEFAULT_OMNI_TEMPLATES_HOST;
}

// ============================================================
// Digital Channel Types
// ============================================================

/**
 * Digital channel group (WhatsApp, SMS, Email, etc.)
 */
export interface DigitalChannelGroup {
  id: string;
  name: string;
  type: string;
  channelType: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'WEBCHAT' | string;
  address: string;
  disabled?: boolean;
  test?: boolean;
  organizationId: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Shared inbox folder
 */
export interface SharedInbox {
  id: string;
  name: string;
  description?: string;
  organizationId: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Message template
 */
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  channelType: string;
  category?: string;
  language?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  organizationId: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * OmniChannel queue from Salesforce
 */
export interface OmniChannelQueue {
  id: string;
  name: string;
  developerName: string;
  queueSobject?: string;
  isActive: boolean;
}

/**
 * OmniChannel flow from Salesforce
 */
export interface OmniChannelFlow {
  id: string;
  name: string;
  developerName: string;
  description?: string;
  isActive: boolean;
}

// ============================================================
// Digital Channel API Functions
// ============================================================

/**
 * Get digital channel groups (WhatsApp, SMS, Email addresses)
 * 
 * @param jwt - Sapien JWT with omni scope
 * @param orgId - Natterbox organization ID
 * @param type - Filter by type (e.g., 'SHARED')
 * @returns Array of digital channel groups
 */
export async function getDigitalChannelGroups(
  jwt: string,
  orgId: number,
  type?: 'SHARED' | 'PERSONAL'
): Promise<DigitalChannelGroup[]> {
  const omniHost = getOmniChannelRestHost();
  const typeParam = type ? `?type=${type}&verbose=yes` : '?verbose=yes';
  const url = `${omniHost}/v1/omni/${orgId}/digital-channel-groups${typeParam}`;

  console.log(`[OmniChannel API] Fetching digital channel groups for org ${orgId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OmniChannel API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch digital channel groups: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[OmniChannel API] Fetched ${result.length || 0} digital channel groups`);
  return result;
}

/**
 * Get shared inboxes (folders) for OmniChannel routing
 * 
 * @param jwt - Sapien JWT with omni scope
 * @param orgId - Natterbox organization ID
 * @param nextKey - Pagination key for fetching more results
 * @returns Object containing inboxes and optional nextKey for pagination
 */
export async function getSharedInboxes(
  jwt: string,
  orgId: number,
  nextKey?: string
): Promise<{ folders: SharedInbox[]; nextKey?: string }> {
  const omniHost = getOmniChannelRestHost();
  const nextKeyParam = nextKey ? `?nextKey=${encodeURIComponent(nextKey)}` : '';
  const url = `${omniHost}/v1/omni/${orgId}/folders${nextKeyParam}`;

  console.log(`[OmniChannel API] Fetching shared inboxes for org ${orgId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[OmniChannel API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch shared inboxes: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[OmniChannel API] Fetched ${result.folders?.length || 0} shared inboxes`);
  return result;
}

/**
 * Get all shared inboxes (handles pagination)
 * 
 * @param jwt - Sapien JWT with omni scope
 * @param orgId - Natterbox organization ID
 * @returns Array of all shared inboxes
 */
export async function getAllSharedInboxes(
  jwt: string,
  orgId: number
): Promise<SharedInbox[]> {
  const allFolders: SharedInbox[] = [];
  let nextKey: string | undefined;

  do {
    const result = await getSharedInboxes(jwt, orgId, nextKey);
    if (result.folders) {
      allFolders.push(...result.folders);
    }
    nextKey = result.nextKey;
  } while (nextKey);

  return allFolders;
}

// ============================================================
// Message Template API Functions
// ============================================================

/**
 * Get message templates
 * 
 * @param jwt - Sapien JWT with templates scope
 * @param orgId - Natterbox organization ID
 * @param channelType - Optional filter by channel type
 * @returns Array of message templates
 */
export async function getMessageTemplates(
  jwt: string,
  orgId: number,
  channelType?: string
): Promise<MessageTemplate[]> {
  const templatesHost = getOmniChannelTemplatesHost();
  const channelParam = channelType ? `?channelType=${encodeURIComponent(channelType)}` : '';
  const url = `${templatesHost}/v1/templates/${orgId}${channelParam}`;

  console.log(`[Templates API] Fetching message templates for org ${orgId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Templates API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch message templates: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Templates API] Fetched ${result.length || 0} message templates`);
  return result;
}

/**
 * Get a specific message template by ID
 * 
 * @param jwt - Sapien JWT with templates scope
 * @param orgId - Natterbox organization ID
 * @param templateId - Template ID
 * @returns Message template
 */
export async function getMessageTemplate(
  jwt: string,
  orgId: number,
  templateId: string
): Promise<MessageTemplate> {
  const templatesHost = getOmniChannelTemplatesHost();
  const url = `${templatesHost}/v1/templates/${orgId}/${templateId}`;

  console.log(`[Templates API] Fetching template ${templateId} for org ${orgId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Templates API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch message template: ${errorText}`);
  }

  return await response.json();
}

// ============================================================
// Salesforce OmniChannel Functions
// ============================================================

const NAMESPACE = env.SALESFORCE_PACKAGE_NAMESPACE || 'nbavs';

/**
 * Get OmniChannel queues from Salesforce
 * 
 * @param instanceUrl - Salesforce instance URL
 * @param accessToken - Salesforce access token
 * @returns Array of OmniChannel queues
 */
export async function getOmniChannelQueues(
  instanceUrl: string,
  accessToken: string
): Promise<OmniChannelQueue[]> {
  // Query the ServiceChannel and QueueRoutingConfig objects
  // Note: This requires proper permissions and OmniChannel setup
  const query = `
    SELECT Id, Name, DeveloperName, IsActive
    FROM QueueRoutingConfig
    WHERE IsActive = true
    ORDER BY Name
    LIMIT 1000
  `;

  try {
    const result = await querySalesforce(instanceUrl, accessToken, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
      developerName: r.DeveloperName as string,
      isActive: r.IsActive as boolean,
    }));
  } catch (e) {
    console.warn('[Salesforce] Failed to fetch OmniChannel queues:', e);
    // Return empty array - OmniChannel may not be configured
    return [];
  }
}

/**
 * Get OmniChannel flows from Salesforce
 * 
 * @param instanceUrl - Salesforce instance URL
 * @param accessToken - Salesforce access token
 * @returns Array of OmniChannel flows
 */
export async function getOmniChannelFlows(
  instanceUrl: string,
  accessToken: string
): Promise<OmniChannelFlow[]> {
  // Query Flow records that are related to OmniChannel
  const query = `
    SELECT Id, MasterLabel, DeveloperName, Description, IsActive
    FROM Flow
    WHERE ProcessType = 'RoutingFlow' AND IsActive = true
    ORDER BY MasterLabel
    LIMIT 1000
  `;

  try {
    const result = await querySalesforce(instanceUrl, accessToken, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.MasterLabel as string,
      developerName: r.DeveloperName as string,
      description: r.Description as string | undefined,
      isActive: r.IsActive as boolean,
    }));
  } catch (e) {
    console.warn('[Salesforce] Failed to fetch OmniChannel flows:', e);
    // Return empty array - OmniChannel may not be configured
    return [];
  }
}

/**
 * Get Salesforce Queues (Group records of type 'Queue')
 * Used for routing configuration in policies
 * 
 * @param instanceUrl - Salesforce instance URL
 * @param accessToken - Salesforce access token
 * @returns Array of queues
 */
export async function getSalesforceQueues(
  instanceUrl: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; developerName: string }>> {
  const query = `
    SELECT Id, Name, DeveloperName
    FROM Group
    WHERE Type = 'Queue'
    ORDER BY Name
    LIMIT 1000
  `;

  try {
    const result = await querySalesforce(instanceUrl, accessToken, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
      developerName: r.DeveloperName as string,
    }));
  } catch (e) {
    console.warn('[Salesforce] Failed to fetch queues:', e);
    return [];
  }
}

/**
 * Get Call Center Routing Entries from Salesforce
 * Used for routing phone numbers to call centers
 * 
 * @param instanceUrl - Salesforce instance URL
 * @param accessToken - Salesforce access token
 * @returns Array of routing entries
 */
export async function getCallCenterRoutingEntries(
  instanceUrl: string,
  accessToken: string
): Promise<Array<{ id: string; name: string; callCenterId: string; serviceResourceId?: string }>> {
  const query = `
    SELECT Id, Name, CallCenterId, ServiceResourceId
    FROM CallCenterRoutingMap
    ORDER BY Name
    LIMIT 1000
  `;

  try {
    const result = await querySalesforce(instanceUrl, accessToken, query);
    return (result.records || []).map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      name: r.Name as string,
      callCenterId: r.CallCenterId as string,
      serviceResourceId: r.ServiceResourceId as string | undefined,
    }));
  } catch (e) {
    console.warn('[Salesforce] Failed to fetch call center routing entries:', e);
    return [];
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Build table row for digital channel display
 */
export function buildDigitalChannelTableRow(channel: DigitalChannelGroup): [string, string, string, boolean, boolean] {
  return [
    channel.name,
    channel.address,
    channel.channelType,
    channel.test || false,
    channel.disabled || false,
  ];
}

/**
 * Build table rows for digital channels display
 */
export function buildDigitalChannelTableRows(channels: DigitalChannelGroup[]): [string, string, string, boolean, boolean][] {
  return channels.map(buildDigitalChannelTableRow);
}

/**
 * Disable phone numbers that are already used in other nodes
 * Used in the digital inbound node configuration
 */
export function markUsedDigitalChannels(
  channels: DigitalChannelGroup[],
  usedChannelIds: Set<string>
): DigitalChannelGroup[] {
  return channels.map(channel => ({
    ...channel,
    disabled: usedChannelIds.has(channel.id),
  }));
}

