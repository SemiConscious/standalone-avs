<!--
  Webphone toolbar — Phase 0 skeleton. Embedded in the layout so it lives
  on every page; pinned bottom-right.

  Responsibilities:
    - Boot the Charlie browser JWT + `getMediaTransport` query on mount.
    - Construct + start a WebphoneClient.
    - Subscribe to `onCallEvent` and reconcile against the local call-leg map.
    - Render per-leg controls: dial, answer, hangup, hold/unhold, mute/unmute, DTMF.
    - Issue the corresponding Charlie mutation on button click.

  See `charlie-api/docs/WEBPHONE.md` §4 for the architecture + state model.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { v4 as uuid } from 'uuid';
  import {
    BrowserCharlieClient,
    CharlieOperations,
    configureRealtimeClient,
    subscribeStore,
    shutdownRealtimeClient,
  } from '$lib/charlie';
  import {
    WebphoneClient,
    type MediaTransportConfig,
    type WebphoneClientEvent,
  } from './WebphoneClient';
  import AgentState from './AgentState.svelte';
  import {
    callLegList,
    webphoneStatus,
    upsertCallLeg,
    setCallLegState,
    removeCallLeg,
  } from './store';
  import type { CallLeg } from './types';

  interface Props {
    appsyncHttp: string;
    appsyncWss: string;
    /** Optional override that points JsSIP at a local Asterisk for dev (see WEBPHONE.md §3). */
    mockRegistrarWsUrl?: string;
  }

  let { appsyncHttp, appsyncWss, mockRegistrarWsUrl }: Props = $props();

  let charlieClient = $state<BrowserCharlieClient | null>(null);
  let charlieUserId = $state<number | null>(null);
  let webphoneClient: WebphoneClient | null = null;
  let unsubscribeCallEvent: (() => void) | null = null;
  let unsubscribeWpEvents: (() => void) | null = null;
  let dialDestination = $state('');
  let bootError = $state<string | null>(null);
  let pendingOutboundCorrelationIds = new Set<string>();

  // Wire stores to local reactive state.
  let legs = $state<readonly CallLeg[]>([]);
  callLegList.subscribe((value) => (legs = value));
  let status = $state($webphoneStatus);
  webphoneStatus.subscribe((value) => (status = value));

  onMount(async () => {
    try {
      // 1) Get an initial browser JWT.
      const jwtResponse = await fetch('/api/charlie/jwt', { method: 'POST' });
      if (!jwtResponse.ok) {
        const body = (await jwtResponse.json().catch(() => ({}))) as {
          message?: string;
          reason?: string;
        };
        bootError = `Charlie JWT unavailable: ${body.reason ?? jwtResponse.status} ${body.message ?? ''}`;
        return;
      }
      const jwtBody = (await jwtResponse.json()) as {
        ok: true;
        jwt: string;
        expiresAt: number;
        userId: number;
        organizationId: number;
      };

      charlieClient = new BrowserCharlieClient(appsyncHttp, jwtBody.jwt, jwtBody.expiresAt);
      charlieUserId = jwtBody.userId;

      // 2) Configure the realtime client (graphql-ws) before subscribing.
      configureRealtimeClient({
        url: appsyncWss,
        getJwt: () => charlieClient?.currentJwt() ?? '',
        onClose: ({ code, reason }) =>
          console.warn(`[webphone] graphql-ws closed: ${code} ${reason}`),
      });

      // 3) Bootstrap the SIP UA from getMediaTransport.
      type MediaTransportResponse = {
        getMediaTransport: {
          transport:
            | {
                __typename: 'ManagedWebphoneTransport';
                sipUri: string;
                sipPassword: string;
                wsUrl: string;
                iceServers: { urls: string[]; username?: string; credential?: string }[];
              }
            | {
                __typename: 'ByoSipTransport';
                inboundDids: string[];
              };
        };
      };
      const mt = await charlieClient.request<MediaTransportResponse>(
        CharlieOperations.GetMediaTransportQuery
      );
      if (mt.getMediaTransport.transport.__typename !== 'ManagedWebphoneTransport') {
        bootError =
          'Org is provisioned for BYO-SIP; webphone is only wired for ManagedWebphoneTransport in Phase 0.';
        return;
      }
      const transport: MediaTransportConfig = mt.getMediaTransport.transport;

      webphoneClient = new WebphoneClient();
      webphoneClient.configure(transport, mockRegistrarWsUrl);
      unsubscribeWpEvents = webphoneClient.on(handleWebphoneEvent);
      webphoneClient.start();

      // 4) Subscribe to onCallEvent for state reconciliation.
      const sub = subscribeStore<{ onCallEvent: CallEventPayload }>(
        CharlieOperations.OnCallEventSubscription
      );
      unsubscribeCallEvent = sub.unsubscribe;
      sub.store.subscribe((value) => {
        if (value?.onCallEvent) handleCallEvent(value.onCallEvent);
      });
      sub.lastError.subscribe((err) => {
        if (err) console.warn('[webphone] onCallEvent error', err);
      });
    } catch (err) {
      bootError = err instanceof Error ? err.message : String(err);
      console.error('[webphone] bootstrap failed', err);
    }
  });

  onDestroy(() => {
    unsubscribeCallEvent?.();
    unsubscribeWpEvents?.();
    webphoneClient?.stop();
    shutdownRealtimeClient();
  });

  // ---------------------------------------------------------------------------
  // Charlie mutation handlers
  // ---------------------------------------------------------------------------

  async function dial(): Promise<void> {
    if (!charlieClient || !dialDestination.trim()) return;
    const correlationId = uuid();
    pendingOutboundCorrelationIds.add(correlationId);
    upsertCallLeg(() => ({
      id: correlationId,
      correlationId,
      state: 'DIALING',
      direction: 'OUTBOUND',
      from: null,
      to: dialDestination,
      muted: false,
      startedAt: Date.now(),
      endedAt: null,
      cause: null,
    }));

    try {
      type DialResponse = {
        dial: { call: { id: string; state: string; direction: string } | null; accepted: boolean };
      };
      const result = await charlieClient.request<DialResponse>(CharlieOperations.DialMutation, {
        input: { destination: dialDestination, correlationId },
      });
      const callId = result.dial.call?.id ?? correlationId;
      upsertCallLeg((current) => ({
        ...(current ?? {
          id: callId,
          correlationId,
          state: 'INITIATED',
          direction: 'OUTBOUND',
          from: null,
          to: dialDestination,
          muted: false,
          startedAt: Date.now(),
          endedAt: null,
          cause: null,
        }),
        id: callId,
        state: result.dial.accepted ? 'INITIATED' : 'HUNGUP',
      }));
      dialDestination = '';
    } catch (err) {
      console.error('[webphone] dial failed', err);
      setCallLegState(correlationId, 'HUNGUP');
    }
  }

  async function answer(leg: CallLeg): Promise<void> {
    if (!charlieClient) return;
    try {
      await charlieClient.request(CharlieOperations.AnswerMutation, {
        input: { callId: leg.id },
      });
    } catch (err) {
      console.error('[webphone] answer failed', err);
    }
  }

  async function hangup(leg: CallLeg): Promise<void> {
    if (!charlieClient) return;
    try {
      await charlieClient.request(CharlieOperations.HangupMutation, {
        input: { callId: leg.id },
      });
    } catch (err) {
      console.error('[webphone] hangup failed', err);
    }
  }

  async function toggleHold(leg: CallLeg): Promise<void> {
    if (!charlieClient) return;
    const op =
      leg.state === 'HELD' ? CharlieOperations.UnholdMutation : CharlieOperations.HoldMutation;
    try {
      await charlieClient.request(op, { input: { callId: leg.id } });
    } catch (err) {
      console.error('[webphone] hold toggle failed', err);
    }
  }

  async function toggleMute(leg: CallLeg): Promise<void> {
    if (!charlieClient) return;
    const op = leg.muted ? CharlieOperations.UnmuteMutation : CharlieOperations.MuteMutation;
    try {
      await charlieClient.request(op, { input: { callId: leg.id } });
      upsertCallLeg((current) => ({ ...(current ?? leg), muted: !leg.muted }));
    } catch (err) {
      console.error('[webphone] mute toggle failed', err);
    }
  }

  async function sendDtmfDigit(leg: CallLeg, digit: string): Promise<void> {
    if (!charlieClient) return;
    try {
      await charlieClient.request(CharlieOperations.SendDtmfMutation, {
        input: { callId: leg.id, digits: digit },
      });
    } catch (err) {
      console.error('[webphone] dtmf failed', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Subscription + JsSIP event handlers
  // ---------------------------------------------------------------------------

  type CallEventPayload =
    | {
        __typename: 'CallRingingEvent';
        callId: string;
        from: string | null;
        to: string | null;
        direction: 'INBOUND' | 'OUTBOUND';
      }
    | { __typename: 'CallProgressEvent'; callId: string }
    | { __typename: 'CallAnsweredEvent'; callId: string }
    | { __typename: 'CallHeldEvent'; callId: string }
    | { __typename: 'CallUnheldEvent'; callId: string }
    | { __typename: 'CallMutedEvent'; callId: string }
    | { __typename: 'CallUnmutedEvent'; callId: string }
    | { __typename: 'CallTransferredEvent'; callId: string }
    | { __typename: 'CallHungupEvent'; callId: string; cause: string }
    | { __typename: 'CallDtmfEvent'; callId: string };

  function handleCallEvent(ev: CallEventPayload): void {
    switch (ev.__typename) {
      case 'CallRingingEvent': {
        upsertCallLeg((current) => ({
          ...(current ?? {
            id: ev.callId,
            correlationId: ev.callId,
            state: 'RINGING',
            direction: ev.direction,
            from: ev.from,
            to: ev.to,
            muted: false,
            startedAt: Date.now(),
            endedAt: null,
            cause: null,
          }),
          id: ev.callId,
          state: 'RINGING',
          direction: ev.direction,
          from: ev.from,
          to: ev.to,
        }));
        return;
      }
      case 'CallProgressEvent':
        setCallLegState(ev.callId, 'RINGING');
        return;
      case 'CallAnsweredEvent':
        setCallLegState(ev.callId, 'CONNECTED');
        return;
      case 'CallHeldEvent':
        setCallLegState(ev.callId, 'HELD');
        return;
      case 'CallUnheldEvent':
        setCallLegState(ev.callId, 'CONNECTED');
        return;
      case 'CallMutedEvent':
        upsertCallLeg((current) => ({ ...(current as CallLeg), id: ev.callId, muted: true }));
        return;
      case 'CallUnmutedEvent':
        upsertCallLeg((current) => ({ ...(current as CallLeg), id: ev.callId, muted: false }));
        return;
      case 'CallHungupEvent':
        upsertCallLeg((current) => ({
          ...(current as CallLeg),
          id: ev.callId,
          state: 'HUNGUP',
          endedAt: Date.now(),
          cause: ev.cause,
        }));
        // Drop after 5s so the UI shows the cause briefly.
        setTimeout(() => removeCallLeg(ev.callId), 5000);
        return;
      default:
        // Transfers / DTMF / progress refinements — Phase 1.
        return;
    }
  }

  function handleWebphoneEvent(ev: WebphoneClientEvent): void {
    switch (ev.type) {
      case 'inbound-session':
        // Auto-answer if this matches a recent outbound dial — Charlie originated
        // a leg toward our SIP URI. Otherwise, do nothing: the UI's answer button
        // (driven by `Subscription.onCallEvent`) will be the user's way in.
        if (pendingOutboundCorrelationIds.size > 0) {
          webphoneClient?.acceptInbound(ev.sessionId);
        }
        return;
      case 'session-ended':
      case 'session-failed':
        // The Charlie subscription will tell us the same story via CallHungupEvent.
        // Nothing to do here other than log.
        console.info(`[webphone] SIP session ${ev.sessionId} ended/failed: ${ev.cause}`);
        return;
      default:
        return;
    }
  }
</script>

<div class="webphone-toolbar">
  <div class="webphone-status" data-status={status.registration}>
    <span class="dot"></span>
    <span class="label">
      {status.registration}
      {#if status.lastError}
        — {status.lastError}
      {/if}
    </span>
  </div>

  {#if bootError}
    <div class="webphone-boot-error" role="alert">{bootError}</div>
  {/if}

  {#if charlieClient && charlieUserId !== null}
    <AgentState charlieClient={charlieClient} userId={charlieUserId} />
  {/if}

  <form
    class="webphone-dial"
    onsubmit={(e) => {
      e.preventDefault();
      dial();
    }}
  >
    <input
      type="tel"
      bind:value={dialDestination}
      placeholder="+44…"
      aria-label="Destination number"
    />
    <button type="submit" disabled={!charlieClient || !dialDestination.trim()}>Dial</button>
  </form>

  {#if legs.length === 0}
    <div class="webphone-empty">No active calls</div>
  {:else}
    <ul class="webphone-legs">
      {#each legs as leg (leg.id)}
        <li class="webphone-leg" data-state={leg.state}>
          <header>
            <span class="leg-state">{leg.state}</span>
            <span class="leg-target">{leg.direction === 'INBOUND' ? leg.from : leg.to}</span>
          </header>
          <div class="leg-actions">
            {#if leg.state === 'RINGING' && leg.direction === 'INBOUND'}
              <button onclick={() => answer(leg)}>Answer</button>
            {/if}
            {#if leg.state === 'CONNECTED' || leg.state === 'HELD'}
              <button onclick={() => toggleHold(leg)}
                >{leg.state === 'HELD' ? 'Resume' : 'Hold'}</button
              >
              <button onclick={() => toggleMute(leg)}>{leg.muted ? 'Unmute' : 'Mute'}</button>
            {/if}
            {#if leg.state !== 'HUNGUP'}
              <button onclick={() => hangup(leg)}>Hangup</button>
            {/if}
            {#if leg.state === 'HUNGUP' && leg.cause}
              <span class="leg-cause">{leg.cause}</span>
            {/if}
          </div>
          {#if leg.state === 'CONNECTED'}
            <div class="leg-dtmf" role="group" aria-label="DTMF pad">
              {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'] as digit (digit)}
                <button type="button" onclick={() => sendDtmfDigit(leg, digit)}>{digit}</button>
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .webphone-toolbar {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    width: 22rem;
    max-height: 80vh;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--color-surface-50-950, #fff);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    font-size: 0.875rem;
    z-index: 50;
  }

  .webphone-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .webphone-status .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: #999;
  }

  .webphone-status[data-status='REGISTERED'] .dot {
    background: #34d399;
  }

  .webphone-status[data-status='REGISTRATION_FAILED'] .dot,
  .webphone-status[data-status='DISCONNECTED'] .dot {
    background: #f87171;
  }

  .webphone-boot-error {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    border-radius: 0.5rem;
    background: rgba(248, 113, 113, 0.15);
    color: #b91c1c;
    font-size: 0.75rem;
  }

  .webphone-dial {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .webphone-dial input {
    flex: 1;
    padding: 0.375rem 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
  }

  .webphone-dial button {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    background: #2563eb;
    color: #fff;
    border: none;
  }

  .webphone-dial button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .webphone-empty {
    color: #6b7280;
    font-style: italic;
    padding: 0.5rem 0;
  }

  .webphone-legs {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .webphone-leg {
    border-top: 1px solid #e5e7eb;
    padding: 0.5rem 0;
  }

  .webphone-leg header {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .leg-state {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #6b7280;
  }

  .leg-actions {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }

  .leg-actions button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    border: 1px solid #d1d5db;
    background: #f9fafb;
  }

  .leg-cause {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .leg-dtmf {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .leg-dtmf button {
    padding: 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid #d1d5db;
    background: #fff;
    font-family: monospace;
  }
</style>
