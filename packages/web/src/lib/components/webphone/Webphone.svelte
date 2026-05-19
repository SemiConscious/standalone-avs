<!--
  Webphone toolbar — pinned bottom-right of every page.

  Architecture (post Phase B.5 SIP-driven pivot — see
  `charlie-api/docs/CTI_INTEGRATION.md` and `charlie-api/docs/WEBPHONE.md`):

    - **Bootstrap**: ask Charlie for a browser JWT (`/api/charlie/jwt`)
      and the SIP credentials (`getMediaTransport` GraphQL query).
    - **SIP UA**: configure + start a `WebphoneClient` (JsSIP UA
      pointed at `webphoned`).
    - **Per-call control**: button clicks (dial / hangup / hold /
      mute / DTMF) drive the local SIP UA directly via
      `WebphoneClient` methods. Charlie's GraphQL is NOT in the per-
      call hot path — it only handles bootstrap + events fan-out.
    - **Events fan-out**: subscribe to Charlie's `onCallEvent` for
      cross-device sync (e.g. another agent supervises this call;
      another tab also has the webphone open). The events worker
      drives this from the user-WS push stream.
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
  let isRegistered = $state(false);

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
  // SIP-driven button handlers — drive the local JsSIP UA directly.
  // No Charlie GraphQL mutation in the per-call hot path.
  // ---------------------------------------------------------------------------

  function dial(): void {
    if (!webphoneClient || !dialDestination.trim()) return;
    if (!isRegistered) {
      console.warn('[webphone] dial pressed before SIP REGISTER 200 — ignoring');
      return;
    }
    const correlationId = uuid();
    const target = dialDestination.trim();
    let sipSessionId: string;
    try {
      sipSessionId = webphoneClient.dial(target);
    } catch (err) {
      console.error('[webphone] dial failed', err);
      bootError = err instanceof Error ? err.message : String(err);
      return;
    }
    upsertCallLeg(() => ({
      id: sipSessionId,
      correlationId,
      sipSessionId,
      state: 'DIALING',
      direction: 'OUTBOUND',
      from: null,
      to: target,
      muted: false,
      startedAt: Date.now(),
      endedAt: null,
      cause: null,
    }));
    dialDestination = '';
  }

  function answer(leg: CallLeg): void {
    if (!webphoneClient || !leg.sipSessionId) return;
    webphoneClient.acceptInbound(leg.sipSessionId);
  }

  function hangup(leg: CallLeg): void {
    if (!webphoneClient) return;
    if (leg.state === 'RINGING' && leg.direction === 'INBOUND' && leg.sipSessionId) {
      // Reject a ringing inbound call with a 486 final response — that
      // is the SIP-correct way to refuse a call (so the upstream
      // dialer hears "busy" rather than a normal-clearing tone).
      webphoneClient.rejectInbound(leg.sipSessionId);
      return;
    }
    if (leg.sipSessionId) {
      webphoneClient.hangupSession(leg.sipSessionId);
    }
  }

  function toggleHold(leg: CallLeg): void {
    if (!webphoneClient || !leg.sipSessionId) return;
    if (leg.state === 'HELD') {
      webphoneClient.unhold(leg.sipSessionId);
    } else {
      webphoneClient.hold(leg.sipSessionId);
    }
  }

  function toggleMute(leg: CallLeg): void {
    if (!webphoneClient || !leg.sipSessionId) return;
    if (leg.muted) {
      webphoneClient.unmute(leg.sipSessionId);
    } else {
      webphoneClient.mute(leg.sipSessionId);
    }
    upsertCallLeg((current) => ({ ...(current ?? leg), muted: !leg.muted }));
  }

  function sendDtmfDigit(leg: CallLeg, digit: string): void {
    if (!webphoneClient || !leg.sipSessionId) return;
    webphoneClient.sendDtmf(leg.sipSessionId, digit);
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

  /**
   * Charlie's `onCallEvent` arrives keyed by the **Sapien call id**
   * (FreeSWITCH UUID). The local SIP UA's leg map is keyed by the
   * **JsSIP session id**. The two id spaces don't align in this
   * phase — correlating them is a known follow-up (likely via the
   * SIP Call-ID header on the outbound INVITE, which propagates
   * through to FreeSWITCH and becomes part of the SapienCall record).
   *
   * For now this handler only logs. The local SIP events drive the
   * UI's leg list. Cross-device sync (another tab, supervisor
   * listenIn etc.) will land when correlation is implemented.
   */
  function handleCallEvent(ev: CallEventPayload): void {
    console.debug('[webphone] charlie onCallEvent', ev.__typename, 'callId=', ev.callId);
  }

  function handleWebphoneEvent(ev: WebphoneClientEvent): void {
    switch (ev.type) {
      case 'register-ok':
        isRegistered = true;
        return;
      case 'register-failed':
      case 'unregistered':
        isRegistered = false;
        return;
      case 'inbound-session': {
        // A new ringing leg arrived from webphoned. Create a local
        // CallLeg keyed off the SIP session id; the user's "Answer"
        // button click will fire `acceptInbound` directly.
        upsertCallLeg(() => ({
          id: ev.sessionId,
          correlationId: ev.sessionId,
          sipSessionId: ev.sessionId,
          state: 'RINGING',
          direction: 'INBOUND',
          from: ev.from,
          to: null,
          muted: false,
          startedAt: Date.now(),
          endedAt: null,
          cause: null,
        }));
        return;
      }
      case 'outbound-session':
        // Already created the leg in dial() — nothing more to do.
        return;
      case 'session-progress':
        setCallLegState(ev.sessionId, 'RINGING');
        return;
      case 'session-accepted':
      case 'session-confirmed':
        setCallLegState(ev.sessionId, 'CONNECTED');
        return;
      case 'session-ended':
      case 'session-failed': {
        upsertCallLeg((current) => ({
          ...(current as CallLeg),
          id: ev.sessionId,
          state: 'HUNGUP',
          endedAt: Date.now(),
          cause: ev.cause,
        }));
        // Drop after 5s so the UI shows the cause briefly. Charlie's
        // CallHungupEvent will likely arrive on the same id and is
        // safely deduped by upsertCallLeg.
        setTimeout(() => removeCallLeg(ev.sessionId), 5000);
        return;
      }
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
    <button type="submit" disabled={!isRegistered || !dialDestination.trim()}>Dial</button>
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
