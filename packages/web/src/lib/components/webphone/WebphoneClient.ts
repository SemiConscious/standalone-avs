/**
 * Thin wrapper around a JsSIP `UA`. Owns the SIP REGISTER lifecycle and
 * inbound-INVITE handling; emits typed events for the higher-level
 * Webphone.svelte to react to.
 *
 * Note the unusual division of labour (see `WEBPHONE.md` §1): the
 * *control plane* (dial, answer, hangup) is driven by Charlie GraphQL
 * mutations, not by this class. JsSIP's role is the SIP UA: keep
 * `registration` alive, accept inbound INVITEs (which appear when
 * Charlie/Notifier originates a leg toward our SIP URI), and own the
 * mid-call SIP operations (hold/unhold via re-INVITE, DTMF via INFO,
 * mute via track.enabled = false).
 */

import JsSIP from 'jssip';
import type { RTCSession, EndEvent } from 'jssip/lib/RTCSession';
import type { RTCSessionEvent } from 'jssip/lib/UA';
import { setWebphoneStatus } from './store';

export interface MediaTransportConfig {
  sipUri: string;
  sipPassword: string;
  wsUrl: string;
  iceServers: readonly { urls: readonly string[]; username?: string; credential?: string }[];
}

export type WebphoneClientEvent =
  | { type: 'register-ok' }
  | { type: 'register-failed'; reason: string; cause: string }
  | { type: 'unregistered' }
  | { type: 'inbound-session'; sessionId: string; from: string }
  | { type: 'session-progress'; sessionId: string }
  | { type: 'session-accepted'; sessionId: string }
  | { type: 'session-confirmed'; sessionId: string }
  | { type: 'session-ended'; sessionId: string; cause: string }
  | { type: 'session-failed'; sessionId: string; cause: string };

type Listener = (event: WebphoneClientEvent) => void;

export class WebphoneClient {
  private ua: JsSIP.UA | null = null;
  private listeners = new Set<Listener>();
  private sessionsBySipId = new Map<string, RTCSession>();
  private currentWsUrl: string | null = null;
  private currentSipUri: string | null = null;

  /**
   * Build (but don't start) the underlying JsSIP UA from a
   * `getMediaTransport.ManagedWebphoneTransport` response. Call `start()`
   * to actually open the WebSocket + REGISTER.
   *
   * If `overrideWsUrl` is set (e.g. `CHARLIE_WEBPHONE_MOCK_REGISTRAR`),
   * uses that instead of `transport.wsUrl`. Used for local-Asterisk
   * iteration while Charlie's SIP-credential issuance is still
   * placeholder (`WEBPHONE.md` §3 option C).
   */
  configure(transport: MediaTransportConfig, overrideWsUrl?: string): void {
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }
    const wsUrl = overrideWsUrl ?? transport.wsUrl;
    const socket = new JsSIP.WebSocketInterface(wsUrl);
    const ua = new JsSIP.UA({
      uri: transport.sipUri,
      password: transport.sipPassword,
      sockets: [socket],
      register: true,
      // 5-minute REGISTER refresh — comfortably inside the 60-min credential TTL.
      register_expires: 300,
      session_timers: false,
      user_agent: 'Charlie-Webphone/0.1',
    });

    ua.on('registered', () => {
      setWebphoneStatus({ registration: 'REGISTERED', lastError: null });
      this.dispatch({ type: 'register-ok' });
    });
    ua.on('unregistered', () => {
      setWebphoneStatus({ registration: 'DISCONNECTED' });
      this.dispatch({ type: 'unregistered' });
    });
    ua.on('registrationFailed', (e) => {
      const cause = typeof e.cause === 'string' ? e.cause : 'UNKNOWN';
      setWebphoneStatus({ registration: 'REGISTRATION_FAILED', lastError: cause });
      const reasonPhrase =
        'response' in e && e.response && typeof e.response === 'object'
          ? ((e.response as { reason_phrase?: string }).reason_phrase ?? '')
          : '';
      this.dispatch({ type: 'register-failed', reason: reasonPhrase, cause });
    });
    ua.on('newRTCSession', (e: RTCSessionEvent) => {
      const session = e.session;
      const sessionId = session.id;
      this.sessionsBySipId.set(sessionId, session);

      if (e.originator === 'remote') {
        const userPart = session.remote_identity?.uri?.user;
        const from = typeof userPart === 'string' ? userPart : 'unknown';
        this.dispatch({ type: 'inbound-session', sessionId, from });
      }

      session.on('progress', () => this.dispatch({ type: 'session-progress', sessionId }));
      session.on('accepted', () => this.dispatch({ type: 'session-accepted', sessionId }));
      session.on('confirmed', () => this.dispatch({ type: 'session-confirmed', sessionId }));
      session.on('ended', (ev: EndEvent) => {
        this.sessionsBySipId.delete(sessionId);
        this.dispatch({ type: 'session-ended', sessionId, cause: ev?.cause ?? 'NORMAL_CLEARING' });
      });
      session.on('failed', (ev: EndEvent) => {
        this.sessionsBySipId.delete(sessionId);
        this.dispatch({ type: 'session-failed', sessionId, cause: ev?.cause ?? 'UNKNOWN' });
      });
    });

    this.ua = ua;
    this.currentWsUrl = wsUrl;
    this.currentSipUri = transport.sipUri;
    setWebphoneStatus({
      registration: 'BOOTSTRAPPING',
      sipUri: transport.sipUri,
      wsUrl,
      lastError: null,
    });
  }

  start(): void {
    if (!this.ua) {
      throw new Error('WebphoneClient.start() called before configure()');
    }
    setWebphoneStatus({ registration: 'REGISTERING' });
    this.ua.start();
  }

  stop(): void {
    if (!this.ua) return;
    this.ua.stop();
    this.ua = null;
    this.sessionsBySipId.clear();
    setWebphoneStatus({ registration: 'IDLE', sipUri: null, wsUrl: null });
  }

  /**
   * Accept an inbound RTC session (i.e. the SIP INVITE Sapien forwarded
   * because Charlie/Notifier originated a leg towards our SIP URI).
   * Typically called automatically by Webphone.svelte when it sees an
   * inbound session that matches an outbound `dial` mutation we already
   * sent — otherwise called explicitly when the user clicks "Answer".
   */
  acceptInbound(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: [] }, // ICE servers come from Charlie via media transport
    });
  }

  rejectInbound(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.terminate({ status_code: 486 });
  }

  /** Send DTMF tones on the active session. */
  sendDtmf(sessionId: string, digits: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.sendDTMF(digits);
  }

  /** Tell the SIP stack to put the call on hold (sends re-INVITE with `a=sendonly`). */
  hold(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.hold();
  }

  unhold(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.unhold();
  }

  /** Mute the local microphone for this session (track.enabled = false). */
  mute(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.mute({ audio: true });
  }

  unmute(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.unmute({ audio: true });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private dispatch(event: WebphoneClientEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[webphone] listener threw', err);
      }
    }
  }

  // Diagnostic accessors (used by Webphone.svelte's status pill).
  getCurrentWsUrl(): string | null {
    return this.currentWsUrl;
  }

  getCurrentSipUri(): string | null {
    return this.currentSipUri;
  }
}
