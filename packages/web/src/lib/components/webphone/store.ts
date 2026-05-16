/**
 * Reactive state for the webphone. We use Svelte stores (rather than
 * runes-only state) because the webphone is a singleton that survives
 * page navigations — Webphone.svelte is mounted in the layout and the
 * state has to outlive any per-page component.
 */

import { writable, derived, type Readable, type Writable } from 'svelte/store';
import type { AgentSnapshot, CallLeg, CallLegState, WebphoneStatus } from './types';

/** Registration / connection status of the underlying SIP UA. */
export const webphoneStatus: Writable<WebphoneStatus> = writable({
  registration: 'IDLE',
  lastError: null,
  sipUri: null,
  wsUrl: null,
});

/** Map of active call legs, keyed by `CallLeg.id` (Charlie callId or correlationId). */
export const callLegs: Writable<Map<string, CallLeg>> = writable(new Map());

/** Convenient flat list of legs, sorted by `startedAt` ascending. */
export const callLegList: Readable<readonly CallLeg[]> = derived(callLegs, ($legs) => {
  return [...$legs.values()].sort((a, b) => a.startedAt - b.startedAt);
});

/** Agent state widget — bound to `Query.getAgentState` + `Subscription.onAgentStateChanged`. */
export const agentSnapshot: Writable<AgentSnapshot> = writable({
  organizationId: null,
  userId: null,
  availability: 'OFFLINE',
  availabilityProfile: null,
  since: null,
  wrapupCode: null,
});

// =============================================================================
// Mutators (typed)
// =============================================================================

export function upsertCallLeg(updater: (current: CallLeg | undefined) => CallLeg): void {
  callLegs.update((legs) => {
    const existing = findLegByEitherId(
      legs,
      updater(undefined).id,
      updater(undefined).correlationId
    );
    const next = updater(existing);
    const newMap = new Map(legs);
    if (existing && existing.id !== next.id) {
      newMap.delete(existing.id);
    }
    newMap.set(next.id, next);
    return newMap;
  });
}

export function setCallLegState(id: string, state: CallLegState): void {
  callLegs.update((legs) => {
    const leg = legs.get(id);
    if (!leg) return legs;
    const newMap = new Map(legs);
    newMap.set(id, { ...leg, state });
    return newMap;
  });
}

export function removeCallLeg(id: string): void {
  callLegs.update((legs) => {
    if (!legs.has(id)) return legs;
    const newMap = new Map(legs);
    newMap.delete(id);
    return newMap;
  });
}

export function setAgentSnapshot(snapshot: AgentSnapshot): void {
  agentSnapshot.set(snapshot);
}

export function setWebphoneStatus(partial: Partial<WebphoneStatus>): void {
  webphoneStatus.update((current) => ({ ...current, ...partial }));
}

// =============================================================================
// Helpers
// =============================================================================

function findLegByEitherId(
  legs: Map<string, CallLeg>,
  id: string,
  correlationId: string
): CallLeg | undefined {
  if (legs.has(id)) return legs.get(id);
  for (const leg of legs.values()) {
    if (leg.correlationId === correlationId) return leg;
  }
  return undefined;
}
