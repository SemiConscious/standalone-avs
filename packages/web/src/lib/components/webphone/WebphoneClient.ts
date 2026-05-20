/**
 * Thin wrapper around a JsSIP `UA`. Owns the SIP REGISTER lifecycle,
 * outbound INVITE generation (dial), inbound-INVITE handling, and the
 * mid-call SIP operations (hold / unhold / mute / unmute / DTMF /
 * hangup). Emits typed events for the higher-level
 * Webphone.svelte to react to.
 *
 * Architecture (post Phase B.5 SIP-driven pivot — see
 * `docs/CTI_INTEGRATION.md` and `docs/WEBPHONE.md` §1):
 *
 *   - The **media plane** is SIP-over-secure-WebSockets, browser
 *     -> `webphoned`. webphoned is a B2BUA (hosted NAT traversal),
 *     so SDP-side ICE only needs candidates that can reach
 *     webphoned itself. No browser-side STUN/TURN required.
 *
 *   - The **call control plane** is also SIP-over-WSS, owned by
 *     this class. dial() emits an INVITE; hangupSession() emits a
 *     BYE; hold / unhold / mute send re-INVITEs etc. Charlie's
 *     GraphQL is NOT in the per-call hot path.
 *
 *   - Charlie's GraphQL surface is the **events fan-out** plane
 *     (onCallEvent / onCallStateChanged subscriptions), the
 *     **bootstrap** plane (getMediaTransport — issues the SIP
 *     credentials this class consumes), and the **server-side
 *     control** plane (supervisor listenIn, recording start/stop,
 *     agent-state setAvailability).
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
  /** Outbound session created (dial() called). */
  | { type: 'outbound-session'; sessionId: string; target: string }
  | { type: 'session-progress'; sessionId: string }
  | { type: 'session-accepted'; sessionId: string }
  | { type: 'session-confirmed'; sessionId: string }
  | { type: 'session-ended'; sessionId: string; cause: string }
  | { type: 'session-failed'; sessionId: string; cause: string };

export interface DialOptions {
  /**
   * Optional caller-ID display name to show on the outbound INVITE's
   * `From` header. JsSIP's `UA.call()` doesn't expose this directly;
   * we'd need a custom `extraHeaders`. For Phase B.5 the From line
   * defaults to whatever the SIP credential's `displayName` field
   * evaluates to in Sapien.
   */
  callerIdName?: string;
}

type Listener = (event: WebphoneClientEvent) => void;

/**
 * Recognise the dispatcher's placeholder SIP password (a 32-char hex
 * UUID minus its hyphens) so we can surface a "no webphone provisioned"
 * hint instead of an opaque REGISTRATION_FAILED. The dispatcher emits
 * this shape when:
 *   - the dispatcher isn't configured for Sapien (CHARLIE_ADAPTER ≠
 *     'sapien' or CHARLIE_SESSIONS_TABLE unset),
 *   - the session JWT lacks `jti`, or
 *   - the user has no webphone-typed device on file in Sapien yet.
 * In all three cases REGISTER will 403 against webphoned, and the
 * actionable fix is "provision a webphone for this user", not
 * "investigate the SIP stack".
 */
const PLACEHOLDER_PASSWORD_RE = /^[0-9a-f]{32}$/;

export class WebphoneClient {
  private ua: JsSIP.UA | null = null;
  private listeners = new Set<Listener>();
  private sessionsBySipId = new Map<string, RTCSession>();
  private currentWsUrl: string | null = null;
  private currentSipUri: string | null = null;
  private currentIceServers: readonly RTCIceServer[] = [];
  private currentLooksLikePlaceholder = false;

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
    const looksLikePlaceholder = PLACEHOLDER_PASSWORD_RE.test(transport.sipPassword);

    // Phase 1 diagnostic log: enough to verify a deploy without leaking
    // the SIP password. The wsUrl + sipUri + iceServer count tell an
    // operator the resolver returned the right shape; the
    // `looksLikePlaceholder` flag distinguishes "Charlie's transport
    // is correct, REGISTER will 403 because there's no webphone
    // provisioned" from "the SIP stack itself is broken".
    console.info('[webphone] mediaTransport resolved', {
      wsUrl,
      sipUri: transport.sipUri,
      sipPasswordLength: transport.sipPassword.length,
      looksLikePlaceholder,
      iceServerCount: transport.iceServers.length,
      overrideWsUrl: overrideWsUrl ?? null,
    });

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

    // Natterbox webphoned uses a custom `X-Auth` SIP header carrying a
    // base64-encoded password — NOT standard SIP digest auth. Without
    // this header webphoned silently drops the REGISTER (no 401
    // challenge, no error response) and JsSIP times out after 32s.
    //
    // Confirmed against the legacy AVS Lightning webphone
    // (`redmatter/platform-webphone-web/lib/rmwebphone.js`):
    //
    //   var headers = [
    //     {name: 'X-Auth',     value: btoa(this.password)},
    //     {name: 'X-RegCount', value: ++this.regCount},
    //     ...
    //   ];
    //
    // We use `registrator.setExtraHeaders()` (rather than
    // `register({extraHeaders})`) so the header persists across
    // automatic re-registrations — passing extraHeaders on the
    // initial `register()` call is a known JsSIP bug
    // (versatica/JsSIP#174) where the value is dropped on
    // re-registers.
    //
    // The standard `password` field is still set on the UA so JsSIP
    // can respond to a SIP digest 401 challenge if webphoned ever
    // sends one, but webphoned's current protocol relies on X-Auth
    // exclusively.
    ua.registrator().setExtraHeaders([
      `X-Auth: ${btoa(transport.sipPassword)}`,
    ]);

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
      const reasonPhrase =
        'response' in e && e.response && typeof e.response === 'object'
          ? ((e.response as { reason_phrase?: string }).reason_phrase ?? '')
          : '';
      const lastError = looksLikePlaceholder
        ? `${cause} (no webphone provisioned for this user — ask your Salesforce admin to provision a webphone via the AVS package)`
        : reasonPhrase
          ? `${cause}: ${reasonPhrase}`
          : cause;
      setWebphoneStatus({ registration: 'REGISTRATION_FAILED', lastError });
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
    this.currentIceServers = transport.iceServers.map((s) => ({
      urls: [...s.urls],
      ...(s.username !== undefined && { username: s.username }),
      ...(s.credential !== undefined && { credential: s.credential }),
    }));
    this.currentLooksLikePlaceholder = looksLikePlaceholder;
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
      pcConfig: { iceServers: [...this.currentIceServers] },
    });
  }

  rejectInbound(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.terminate({ status_code: 486 });
  }

  /**
   * Place an outbound call. Emits a SIP INVITE through the registered
   * UA toward `target` (which must be a valid SIP URI or a phone
   * number — JsSIP normalises bare digits to `sip:<digits>@<domain>`
   * using the UA's configured domain).
   *
   * Returns the session id once the JsSIP UA registers the new
   * RTCSession. Throws if the UA isn't configured or registered yet.
   *
   * The call's lifecycle (RINGING / PROGRESS / ANSWERED / HUNGUP)
   * comes back via `onCallEvent` from Charlie's events worker, OR
   * via the local `session-*` events on this client — whichever
   * arrives first. Webphone.svelte deduplicates by `sipSessionId`.
   */
  dial(target: string, _options: DialOptions = {}): string {
    if (!this.ua) {
      throw new Error('WebphoneClient.dial() called before configure()');
    }
    if (!this.ua.isRegistered()) {
      throw new Error(
        'WebphoneClient.dial() called before SIP REGISTER 200 — wait for register-ok',
      );
    }
    // JsSIP returns the RTCSession synchronously; the `newRTCSession`
    // listener will also fire and register it in `sessionsBySipId`.
    const session = this.ua.call(target, {
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: [...this.currentIceServers] },
    });
    const sessionId = session.id;
    this.sessionsBySipId.set(sessionId, session);
    this.dispatch({ type: 'outbound-session', sessionId, target });
    return sessionId;
  }

  /**
   * Terminate the named session. For an outbound call this sends
   * either CANCEL (if not yet answered) or BYE (if answered);
   * JsSIP picks the right verb internally. For an inbound ringing
   * call use `rejectInbound` instead — it sends a 486 final
   * response, which is the SIP-correct way to refuse a call.
   */
  hangupSession(sessionId: string): void {
    const session = this.sessionsBySipId.get(sessionId);
    if (!session) return;
    session.terminate();
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

  /**
   * Whether the SIP password Charlie returned looks like the
   * dispatcher's placeholder (32 hex chars, no Sapien-issued
   * credential). True implies "no webphone provisioned for this user
   * in Sapien"; the `register-failed` event will fire once REGISTER
   * round-trips against `webphoned`.
   */
  isCurrentCredentialPlaceholder(): boolean {
    return this.currentLooksLikePlaceholder;
  }
}
