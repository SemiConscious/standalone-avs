<!--
  Agent availability widget. Bound to `Query.getAgentState` + `Mutation.setAvailability`
  + `Subscription.onAgentStateChanged` per `WEBPHONE.md` §4.

  Phase 0: assumes the surrounding Webphone.svelte has configured the
  graphql-ws realtime client. We share the same BrowserCharlieClient by
  passing it in as a prop.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { BrowserCharlieClient, CharlieOperations, subscribeStore } from '$lib/charlie';
  import { agentSnapshot, setAgentSnapshot } from './store';
  import type { AgentSnapshot, WebphoneAgentAvailability } from './types';

  interface Props {
    charlieClient: BrowserCharlieClient | null;
    userId: number | null;
  }

  let { charlieClient, userId }: Props = $props();

  const availabilityOptions: readonly WebphoneAgentAvailability[] = [
    'AVAILABLE',
    'ON_BREAK',
    'BUSY',
    'AWAY',
    'OFFLINE',
  ];

  let snapshot = $state<AgentSnapshot>($agentSnapshot);
  agentSnapshot.subscribe((s) => (snapshot = s));

  let unsubscribe: (() => void) | null = null;

  onMount(async () => {
    if (!charlieClient || !userId) return;
    try {
      type GetAgentStateResponse = {
        getAgentState: { state: AgentSnapshot | null };
      };
      const result = await charlieClient.request<GetAgentStateResponse>(
        CharlieOperations.GetAgentStateQuery,
        { input: { userId } },
      );
      if (result.getAgentState.state) {
        setAgentSnapshot(result.getAgentState.state);
      }
    } catch (err) {
      console.warn('[agent] initial getAgentState failed', err);
    }

    const sub = subscribeStore<{ onAgentStateChanged: { state: AgentSnapshot } }>(
      CharlieOperations.OnAgentStateChangedSubscription,
      { userId },
    );
    unsubscribe = sub.unsubscribe;
    sub.store.subscribe((value) => {
      if (value?.onAgentStateChanged?.state) {
        setAgentSnapshot(value.onAgentStateChanged.state);
      }
    });
  });

  onDestroy(() => {
    unsubscribe?.();
  });

  async function changeAvailability(state: WebphoneAgentAvailability): Promise<void> {
    if (!charlieClient) return;
    try {
      await charlieClient.request(CharlieOperations.SetAvailabilityMutation, {
        input: { state },
      });
    } catch (err) {
      console.error('[agent] setAvailability failed', err);
    }
  }
</script>

<div class="agent-state" data-availability={snapshot.availability}>
  <label for="agent-availability">Availability</label>
  <select
    id="agent-availability"
    value={snapshot.availability}
    onchange={(e) =>
      changeAvailability((e.currentTarget as HTMLSelectElement).value as WebphoneAgentAvailability)}
    disabled={!charlieClient}
  >
    {#each availabilityOptions as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
  {#if snapshot.availabilityProfile}
    <span class="profile">({snapshot.availabilityProfile})</span>
  {/if}
</div>

<style>
  .agent-state {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--color-surface-50-950, #f9fafb);
    font-size: 0.875rem;
  }

  .agent-state[data-availability='AVAILABLE'] {
    background: rgba(52, 211, 153, 0.15);
  }

  .agent-state[data-availability='BUSY'] {
    background: rgba(248, 113, 113, 0.15);
  }

  .agent-state[data-availability='ON_BREAK'] {
    background: rgba(251, 191, 36, 0.2);
  }

  .agent-state[data-availability='AWAY'] {
    background: rgba(148, 163, 184, 0.2);
  }

  .agent-state select {
    padding: 0.25rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: #fff;
  }

  .profile {
    font-size: 0.75rem;
    color: #6b7280;
  }
</style>
