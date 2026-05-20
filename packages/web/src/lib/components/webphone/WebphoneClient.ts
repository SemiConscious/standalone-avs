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

    // Enable JsSIP's verbose debug logging when the webphone is
    // actively being debugged. Off by default — flip via a query
    // param so we don't leak SIP traffic to the production console.
    const debugEnabled =
      typeof window !== 'undefined' && /[?&]webphoneDebug=1\b/.test(window.location.search);
    if (debugEnabled) {
      JsSIP.debug.enable('JsSIP:*');
    }

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

    // Natterbox webphoned's custom REGISTER auth scheme — see the
    // legacy AVS Lightning webphone for the canonical shape
    // (`redmatter/platform-webphone-web/lib/rmwebphone.js#txReg`):
    //
    //   var headers = [
    //     {name: 'X-BrowserUserAgent', value: ostd_browser_user_agent},
    //     {name: 'X-Client',           value: '<browser> <version> <platform> <regInt>'},
    //     {name: 'X-Auth',             value: btoa(this.password)},
    //     {name: 'X-CallTime',         value: callTime},
    //     {name: 'X-RegCount',         value: ++this.regCount},
    //     {name: 'Expires',            value: 900},
    //   ];
    //
    // X-Auth is the only header webphoned actually validates for
    // auth, but the legacy protocol expects the full bundle as a
    // matter of liveness (the SIP RFC discourages unknown headers
    // from causing failures, but webphoned's hand-rolled SIP parser
    // may be stricter than the spec).
    //
    // We use `registrator.setExtraHeaders()` rather than passing
    // them to `register()` so they persist across automatic
    // re-registrations (versatica/JsSIP#174 drops options on
    // re-register).
    const browserUa =
      typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
        ? navigator.userAgent
        : 'unknown';
    ua.registrator().setExtraHeaders([
      `X-Auth: ${btoa(transport.sipPassword)}`,
      `X-BrowserUserAgent: ${browserUa.replace(/[^\x20-\x7e]/g, '?')}`,
      `X-Client: Charlie-Webphone 0.1 ${browserUa.replace(/[^\x20-\x7e]/g, '?')} 0`,
      'X-CallTime: 0',
      'X-RegCount: 1',
    ]);

    // Workaround: webphoned's REGISTER 200 OK echoes its B2BUA-internal
    // address in the `Contact` header (e.g. `<sip:100.110.4.96:10062;
    // transport=udp>`) instead of the binding it just registered for
    // us, in violation of RFC 3261 §10.2.4. JsSIP's strict registrator
    // looks for OUR Contact's user in the response Contacts and
    // silently ignores 200 OK when no match is found — the UI gets
    // stuck on "REGISTERING" forever despite a successful SIP REGISTER.
    //
    // Confirmed this is intentional in the legacy AVS Lightning
    // webphone (`platform-webphone-web/lib/rmwebphone.js`) — that
    // hand-rolled SIP stack doesn't enforce the Contact-match check.
    //
    // Workaround approach: blank the UA contact URI's `_user` field
    // around each REGISTER cycle. Webphoned's response Contact has
    // no user part (`element.uri.user === undefined`); blanking ours
    // makes the strict-equality check pass (`undefined === undefined`).
    // We restore `_user` after the register settles so:
    //
    //   (a) the outgoing Contact header on the wire stays unchanged
    //       (the registrator caches the Contact as a string at
    //       construction time, before we touch `_user`), and
    //
    //   (b) inbound INVITEs validate correctly — UA.js#receiveRequest
    //       compares `request.ruri.user` against `_contact.uri.user`,
    //       and we need that to be the random Contact user webphoned
    //       used as the binding URI when proxying the call.
    //
    // This patch is scoped: only `register()` is wrapped, and the
    // override window is the request/response window (typically
    // <500ms). Inbound INVITEs landing inside that window are rare;
    // they'd 404 here and webphoned would retry — acceptable.
    type UriWithUser = { _user?: string };
    type RegistratorWithRegister = { register: () => unknown };
    const reg = ua.registrator() as unknown as RegistratorWithRegister;
    const origRegister = reg.register.bind(reg);
    const contactUri = ua.contact.uri as UriWithUser;
    reg.register = function patchedRegister(): unknown {
      const savedUser = contactUri._user;
      contactUri._user = undefined;
      const restore = (): void => {
        contactUri._user = savedUser;
        ua.removeListener('registered', restore);
        ua.removeListener('registrationFailed', restore);
      };
      ua.on('registered', restore);
      ua.on('registrationFailed', restore);
      return origRegister();
    };

    // WebSocket-level connectivity diagnostics. Without these we
    // can't distinguish "WSS handshake failed" from "WSS connected
    // but webphoned didn't reply to REGISTER". Both manifest as
    // "stuck on REGISTERING" in the UI.
    ua.on('connecting', () => {
      console.info('[webphone] JsSIP WSS connecting');
    });
    ua.on('connected', () => {
      console.info('[webphone] JsSIP WSS connected');
    });
    ua.on('disconnected', (event: { code?: number; reason?: string; error?: boolean } = {}) => {
      console.warn('[webphone] JsSIP WSS disconnected', {
        code: event.code,
        reason: event.reason,
        error: event.error,
      });
    });
    ua.on('registered', () => {
      console.info('[webphone] JsSIP REGISTER 200 OK');
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
