/**
 * External Events API Service
 * 
 * This service handles event subscriptions for routing policies.
 * Events are external triggers that can invoke policy actions (e.g., Salesforce triggers,
 * webhook notifications, etc.)
 * 
 * API: https://external-events-us.natterbox.net/v1/events
 */

import { env } from '$env/dynamic/private';

// Default events host
const DEFAULT_EVENTS_HOST = 'https://external-events-us.natterbox.net';

/**
 * Get the events API host URL
 */
export function getEventsHost(): string {
  return env.EVENTS_HOST || DEFAULT_EVENTS_HOST;
}

/**
 * Event subscription payload
 */
export interface EventSubscriptionPayload {
  /** Name of the subscription */
  name: string;
  /** Event type (e.g., 'salesforce', 'webhook') */
  eventType: string;
  /** Policy ID to invoke */
  policyId: number;
  /** Whether the subscription is enabled */
  enabled: boolean;
  /** Additional configuration */
  config?: Record<string, unknown>;
  /** Filter criteria */
  filters?: EventFilter[];
}

/**
 * Event filter for subscription
 */
export interface EventFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches';
  value: string;
}

/**
 * Event subscription returned from API
 */
export interface EventSubscription extends EventSubscriptionPayload {
  id: string;
  organizationId: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new event subscription
 * 
 * @param jwt - Sapien JWT with appropriate scope
 * @param orgId - Natterbox organization ID
 * @param payload - Subscription configuration
 * @returns Created subscription
 */
export async function createEventSubscription(
  jwt: string,
  orgId: number,
  payload: EventSubscriptionPayload
): Promise<EventSubscription> {
  const eventsHost = getEventsHost();
  const url = `${eventsHost}/v1/events/${orgId}/subscriptions`;

  console.log(`[Events API] Creating subscription for org ${orgId}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Events API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to create event subscription: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Events API] Created subscription ${result.id}`);
  return result;
}

/**
 * Get all event subscriptions for an organization
 * 
 * @param jwt - Sapien JWT with appropriate scope
 * @param orgId - Natterbox organization ID
 * @returns Array of subscriptions
 */
export async function getEventSubscriptions(
  jwt: string,
  orgId: number
): Promise<EventSubscription[]> {
  const eventsHost = getEventsHost();
  const url = `${eventsHost}/v1/events/${orgId}/subscriptions`;

  console.log(`[Events API] Fetching subscriptions for org ${orgId}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Events API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to fetch event subscriptions: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Events API] Fetched ${result.length} subscriptions`);
  return result;
}

/**
 * Get event subscriptions for a specific policy
 * 
 * @param jwt - Sapien JWT with appropriate scope
 * @param orgId - Natterbox organization ID
 * @param policyId - Natterbox policy ID
 * @returns Array of subscriptions for the policy
 */
export async function getEventSubscriptionsForPolicy(
  jwt: string,
  orgId: number,
  policyId: number
): Promise<EventSubscription[]> {
  const allSubscriptions = await getEventSubscriptions(jwt, orgId);
  return allSubscriptions.filter(sub => sub.policyId === policyId);
}

/**
 * Update an event subscription
 * 
 * @param jwt - Sapien JWT with appropriate scope
 * @param orgId - Natterbox organization ID
 * @param subscriptionId - Subscription ID to update
 * @param payload - Updated subscription configuration
 * @returns Updated subscription
 */
export async function updateEventSubscription(
  jwt: string,
  orgId: number,
  subscriptionId: string,
  payload: Partial<EventSubscriptionPayload>
): Promise<EventSubscription> {
  const eventsHost = getEventsHost();
  const url = `${eventsHost}/v1/events/${orgId}/subscriptions/${subscriptionId}`;

  console.log(`[Events API] Updating subscription ${subscriptionId}`);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Events API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to update event subscription: ${errorText}`);
  }

  const result = await response.json();
  console.log(`[Events API] Updated subscription ${subscriptionId}`);
  return result;
}

/**
 * Delete an event subscription
 * 
 * @param jwt - Sapien JWT with appropriate scope
 * @param orgId - Natterbox organization ID
 * @param subscriptionId - Subscription ID to delete
 * @returns true if deleted successfully
 */
export async function deleteEventSubscription(
  jwt: string,
  orgId: number,
  subscriptionId: string
): Promise<boolean> {
  const eventsHost = getEventsHost();
  const url = `${eventsHost}/v1/events/${orgId}/subscriptions/${subscriptionId}`;

  console.log(`[Events API] Deleting subscription ${subscriptionId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Events API Error] ${response.status} - ${errorText}`);
    throw new Error(`Failed to delete event subscription: ${errorText}`);
  }

  console.log(`[Events API] Deleted subscription ${subscriptionId}`);
  return true;
}

/**
 * Delete all event subscriptions for a policy
 * Useful when deleting a policy
 * 
 * @param jwt - Sapien JWT with appropriate scope
 * @param orgId - Natterbox organization ID
 * @param policyId - Natterbox policy ID
 * @returns Number of subscriptions deleted
 */
export async function deleteEventSubscriptionsForPolicy(
  jwt: string,
  orgId: number,
  policyId: number
): Promise<number> {
  const subscriptions = await getEventSubscriptionsForPolicy(jwt, orgId, policyId);
  
  let deletedCount = 0;
  for (const sub of subscriptions) {
    try {
      await deleteEventSubscription(jwt, orgId, sub.id);
      deletedCount++;
    } catch (e) {
      console.error(`[Events API] Failed to delete subscription ${sub.id}:`, e);
    }
  }
  
  console.log(`[Events API] Deleted ${deletedCount} of ${subscriptions.length} subscriptions for policy ${policyId}`);
  return deletedCount;
}

/**
 * Sync event subscriptions from policy body
 * This extracts event nodes from the policy and ensures corresponding subscriptions exist
 * 
 * @param jwt - Sapien JWT with appropriate scope
 * @param orgId - Natterbox organization ID
 * @param policyId - Natterbox policy ID
 * @param eventNodes - Event nodes from the policy body
 * @returns Synced subscriptions
 */
export async function syncEventSubscriptionsFromPolicy(
  jwt: string,
  orgId: number,
  policyId: number,
  eventNodes: Array<{
    id: string;
    name: string;
    eventType: string;
    enabled: boolean;
    config?: Record<string, unknown>;
    subscriptionId?: string;
  }>
): Promise<EventSubscription[]> {
  // Get existing subscriptions for this policy
  const existingSubscriptions = await getEventSubscriptionsForPolicy(jwt, orgId, policyId);
  const existingById = new Map(existingSubscriptions.map(s => [s.id, s]));
  
  const syncedSubscriptions: EventSubscription[] = [];
  const processedIds = new Set<string>();
  
  for (const eventNode of eventNodes) {
    try {
      if (eventNode.subscriptionId && existingById.has(eventNode.subscriptionId)) {
        // Update existing subscription
        const updated = await updateEventSubscription(jwt, orgId, eventNode.subscriptionId, {
          name: eventNode.name,
          eventType: eventNode.eventType,
          enabled: eventNode.enabled,
          config: eventNode.config,
        });
        syncedSubscriptions.push(updated);
        processedIds.add(eventNode.subscriptionId);
      } else {
        // Create new subscription
        const created = await createEventSubscription(jwt, orgId, {
          name: eventNode.name,
          eventType: eventNode.eventType,
          policyId,
          enabled: eventNode.enabled,
          config: eventNode.config,
        });
        syncedSubscriptions.push(created);
      }
    } catch (e) {
      console.error(`[Events API] Failed to sync event node ${eventNode.id}:`, e);
    }
  }
  
  // Delete subscriptions that no longer have corresponding nodes
  for (const existing of existingSubscriptions) {
    if (!processedIds.has(existing.id)) {
      try {
        await deleteEventSubscription(jwt, orgId, existing.id);
        console.log(`[Events API] Deleted orphaned subscription ${existing.id}`);
      } catch (e) {
        console.error(`[Events API] Failed to delete orphaned subscription ${existing.id}:`, e);
      }
    }
  }
  
  return syncedSubscriptions;
}

