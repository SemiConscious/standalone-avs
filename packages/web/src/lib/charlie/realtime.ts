/**
 * Browser-side AppSync subscription client.
 *
 * AWS AppSync only supports the **legacy** `graphql-ws` subprotocol
 * (the one from `subscriptions-transport-ws`), not the modern
 * `graphql-transport-ws` protocol the `graphql-ws` npm library
 * speaks. The two are wire-incompatible.
 *
 * This module is a thin from-scratch implementation of AppSync's
 * realtime protocol — small enough to read end-to-end. Reference
 * docs: https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html
 *
 * Wire shape (Lambda authorizer mode — what Charlie uses):
 *
 *   1. Connect to:
 *        wss://<api-id>.appsync-realtime-api.<region>.amazonaws.com/graphql
 *      Sec-WebSocket-Protocol: `graphql-ws`.
 *
 *      No URL query string — the URL-query-string `?header=...&payload=...`
 *      auth scheme is for API_KEY / IAM / Cognito / OIDC modes only.
 *      For `AWS_LAMBDA` authorizer mode, AppSync rejects the URL-query-
 *      string auth with `{"errorCode":400,"message":"Required headers are
 *      missing."}` on the first `connection_init` and expects the auth
 *      payload to ride INSIDE the `connection_init` message instead.
 *      This isn't documented clearly anywhere in the AppSync docs;
 *      verified empirically against the dev03 deployment + upstream
 *      AWS Amplify source for AWSAppSyncRealTimeProvider.
 *
 *   2. Send:
 *        {
 *          type: "connection_init",
 *          payload: {
 *            host: "<api-id>.appsync-api.<region>.amazonaws.com",
 *            Authorization: "<raw-JWT>"
 *          }
 *        }
 *      `host` is the **HTTPS** API host (not the realtime host).
 *      `Authorization` is the raw JWT (no `Bearer ` prefix — AppSync's
 *      Lambda authorizer receives whatever string is here as
 *      `event.authorizationToken`).
 *
 *   3. Receive `{ type: "connection_ack", payload: { connectionTimeoutMs } }`.
 *      Track the timeout — if no `ka` arrives within that window we
 *      should reconnect.
 *
 *   4. For each subscription, send:
 *        {
 *          id: "<uuid>",
 *          type: "start",
 *          payload: {
 *            data: JSON.stringify({ query, variables }),
 *            extensions: {
 *              authorization: { host, Authorization }
 *            }
 *          }
 *        }
 *      The per-subscription `extensions.authorization` carries the
 *      same `{ host, Authorization }` shape; AppSync re-validates the
 *      caller per subscription start, allowing per-subscription auth
 *      modes if the API has multiple configured.
 *
 *   5. Receive subscription events as `{ id, type: "data", payload: { data, errors? } }`.
 *      `ka` (keep-alive) frames arrive periodically.
 *
 *   6. Unsubscribe: send `{ id, type: "stop" }`. AppSync replies
 *      `complete` and stops sending `data` for that id.
 *
 * Reconnect is done by recreating the singleton on close. Pending
 * subscriptions are re-registered after `connection_ack`.
 */

import { writable, type Readable } from 'svelte/store';

export interface RealtimeClientConfig {
  /** AppSync realtime endpoint, e.g. `wss://<id>.appsync-realtime-api.<region>.amazonaws.com/graphql`. */
  url: string;
  /**
   * Callback invoked just before each (re)connect. Must resolve to a
   * fresh Charlie JWT. The token is sent as the `Authorization` header
   * value in the AppSync auth payload (no `Bearer ` prefix — AppSync's
   * Lambda authorizer is tolerant of either form, but the legacy
   * AppSync IAM/Cognito modes expect raw tokens).
   */
  getJwt: () => string | Promise<string>;
  /**
   * Optional hook fired whenever the underlying socket closes for any
   * reason. The webphone uses this to surface a "reconnecting…" indicator.
   */
  onClose?: (event: { code: number; reason: string }) => void;
}

/**
 * Singleton state. Re-created on every config update.
 */
let singleton: AppSyncWsClient | null = null;
let singletonConfig: RealtimeClientConfig | null = null;
let activeSubscriptions = 0;
let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;

/** Linger time after the last unsubscribe before closing the socket. */
const IDLE_CLOSE_DELAY_MS = 30_000;

/** How long to wait for `connection_ack` before considering the connect failed. */
const CONNECT_ACK_TIMEOUT_MS = 10_000;

/** Reconnect backoff caps. */
const RECONNECT_MIN_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = 10;

/**
 * Configure the realtime singleton. Disposes any previous instance.
 */
export function configureRealtimeClient(config: RealtimeClientConfig): void {
  if (singleton) {
    singleton.dispose();
    singleton = null;
  }
  singletonConfig = config;
}

function getRealtimeClient(): AppSyncWsClient {
  if (singleton) return singleton;
  if (!singletonConfig) {
    throw new Error(
      '`lib/charlie/realtime`: configureRealtimeClient() must be called before subscribing.',
    );
  }
  singleton = new AppSyncWsClient(singletonConfig);
  return singleton;
}

/**
 * Subscribe to a Charlie GraphQL subscription and expose the most-recent
 * payload as a Svelte readable store. Returns a cleanup function the
 * caller must invoke on unmount.
 */
export function subscribeStore<T>(
  query: string,
  variables: Record<string, unknown> = {},
): { store: Readable<T | null>; lastError: Readable<Error | null>; unsubscribe: () => void } {
  const store = writable<T | null>(null);
  const errorStore = writable<Error | null>(null);

  const client = getRealtimeClient();
  activeSubscriptions += 1;
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }

  const handle = client.subscribe<T>({ query, variables }, {
    next: (data) => {
      store.set(data);
      errorStore.set(null);
    },
    error: (err) => {
      errorStore.set(err);
    },
  });

  const unsubscribe = () => {
    handle.dispose();
    activeSubscriptions -= 1;
    if (activeSubscriptions <= 0) {
      idleCloseTimer = setTimeout(() => {
        if (activeSubscriptions <= 0 && singleton) {
          singleton.dispose();
          singleton = null;
        }
        idleCloseTimer = null;
      }, IDLE_CLOSE_DELAY_MS);
    }
  };

  return {
    store: { subscribe: store.subscribe },
    lastError: { subscribe: errorStore.subscribe },
    unsubscribe,
  };
}

/** Force-close the realtime singleton. Use on logout / page unload. */
export function shutdownRealtimeClient(): void {
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
  if (singleton) {
    singleton.dispose();
    singleton = null;
  }
  activeSubscriptions = 0;
}

// ---------------------------------------------------------------------------
// AppSyncWsClient — internal
// ---------------------------------------------------------------------------

interface AppSyncSubscriptionHandlers<T> {
  next: (data: T) => void;
  error: (err: Error) => void;
}

interface AppSyncSubscriptionEntry {
  id: string;
  query: string;
  variables: Record<string, unknown>;
  /** Generic-erased handlers; we cast at delivery time. */
  handlers: AppSyncSubscriptionHandlers<unknown>;
  /** Set true once we've seen `start_ack` for this id on the current socket. */
  started: boolean;
  /** Set true once `dispose()` is called; we don't deliver further events. */
  disposed: boolean;
}

interface AppSyncSubscriptionHandle {
  dispose: () => void;
}

class AppSyncWsClient {
  private readonly config: RealtimeClientConfig;
  private socket: WebSocket | null = null;
  private connecting = false;
  private connectAckTimer: ReturnType<typeof setTimeout> | null = null;
  private kaWatchdog: ReturnType<typeof setTimeout> | null = null;
  private connectionTimeoutMs = 300_000; // server overrides via connection_ack
  private lastKaAt = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  /**
   * Set true when AppSync sends a `connection_error` on the current
   * socket. Consumed in `scheduleReconnect`: a connection-level
   * rejection (e.g. expired JWT, malformed auth payload) re-tripping
   * the same auth path on every retry is a tight death-spiral, so we
   * stop reconnecting and surface the error to the operator. Cleared
   * on every fresh `connect()` so the consumer can drive a re-auth
   * via `configureRealtimeClient`.
   */
  private connectionRejected = false;

  /** Subscriptions registered by the caller. Survives reconnects. */
  private readonly subscriptions = new Map<string, AppSyncSubscriptionEntry>();

  constructor(config: RealtimeClientConfig) {
    this.config = config;
    void this.connect();
  }

  subscribe<T>(
    request: { query: string; variables: Record<string, unknown> },
    handlers: AppSyncSubscriptionHandlers<T>,
  ): AppSyncSubscriptionHandle {
    const id = uuid();
    const entry: AppSyncSubscriptionEntry = {
      id,
      query: request.query,
      variables: request.variables,
      handlers: handlers as AppSyncSubscriptionHandlers<unknown>,
      started: false,
      disposed: false,
    };
    this.subscriptions.set(id, entry);
    // If the socket is already open and ack'd, fire start immediately.
    if (this.socket?.readyState === WebSocket.OPEN && this.lastKaAt > 0) {
      void this.sendStart(entry);
    }
    return {
      dispose: () => this.unsubscribe(id),
    };
  }

  private unsubscribe(id: string): void {
    const entry = this.subscriptions.get(id);
    if (!entry) return;
    entry.disposed = true;
    this.subscriptions.delete(id);
    if (this.socket?.readyState === WebSocket.OPEN && entry.started) {
      this.send({ id, type: 'stop' });
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectAckTimer) {
      clearTimeout(this.connectAckTimer);
      this.connectAckTimer = null;
    }
    if (this.kaWatchdog) {
      clearTimeout(this.kaWatchdog);
      this.kaWatchdog = null;
    }
    if (this.socket) {
      try {
        this.socket.close(1000, 'client dispose');
      } catch {
        // ignore
      }
      this.socket = null;
    }
    this.subscriptions.clear();
  }

  // -------------------------------------------------------------------------
  // Connect / reconnect
  // -------------------------------------------------------------------------

  private async connect(): Promise<void> {
    if (this.disposed || this.connecting) return;
    this.connecting = true;
    this.connectionRejected = false;
    try {
      // AppSync's WebSocket auth is set in the URL query string at
      // handshake time — `?header=<base64(headersJson)>&payload=<base64("{}")>`.
      // For AWS_LAMBDA authorizer mode the headers JSON carries
      // `{ host: <api-host>, Authorization: <raw-jwt> }`; the payload
      // value is always base64-encoded `'{}'`.
      //
      // Earlier revisions tried sending the auth inside the
      // `connection_init` message body — that's the schema some
      // graphql-ws spec libraries use, but AppSync rejects it with
      // `connection_error: [400] Required headers are missing.`
      // because it inspects the URL query string at the WS handshake
      // gate, before any application-layer messages are read. The
      // `connection_init` body for AppSync is therefore an empty
      // `{ type: 'connection_init' }`.
      let jwt: string;
      try {
        jwt = await Promise.resolve(this.config.getJwt());
      } catch (err) {
        this.connecting = false;
        this.scheduleReconnect(
          `failed to read JWT for handshake: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      const apiHost = realtimeUrlToApiHost(this.config.url);
      const headerJson = JSON.stringify({ host: apiHost, Authorization: jwt });
      const headerB64 = base64Encode(headerJson);
      const payloadB64 = base64Encode('{}');
      const wsUrl =
        this.config.url +
        (this.config.url.includes('?') ? '&' : '?') +
        `header=${encodeURIComponent(headerB64)}&payload=${encodeURIComponent(payloadB64)}`;
      const socket = new WebSocket(wsUrl, ['graphql-ws']);
      socket.addEventListener('open', () => {
        this.onOpen(socket);
      });
      socket.addEventListener('message', (e: MessageEvent) => this.onMessage(socket, e));
      socket.addEventListener('close', (e: CloseEvent) =>
        this.onClose(socket, e.code, e.reason),
      );
      socket.addEventListener('error', () => {
        // 'error' fires before 'close' — let 'close' drive the reconnect logic.
      });
      this.socket = socket;
      this.lastKaAt = 0;
    } catch (err) {
      this.connecting = false;
      this.scheduleReconnect(err instanceof Error ? err.message : String(err));
      return;
    }
    this.connecting = false;
  }

  private onOpen(socket: WebSocket): void {
    if (socket !== this.socket) return;
    // Auth already shipped in the URL query string at handshake; the
    // connection_init message is just a no-payload trigger that asks
    // AppSync for the connection_ack response.
    this.send({ type: 'connection_init' });
    if (this.connectAckTimer) clearTimeout(this.connectAckTimer);
    this.connectAckTimer = setTimeout(() => {
      console.warn('[realtime] AppSync connection_ack timed out after', CONNECT_ACK_TIMEOUT_MS, 'ms');
      try {
        socket.close(4000, 'connection_ack timeout');
      } catch {
        // ignore
      }
    }, CONNECT_ACK_TIMEOUT_MS);
  }

  private onMessage(socket: WebSocket, event: MessageEvent): void {
    if (socket !== this.socket) return;
    let msg: AppSyncMessage;
    try {
      msg = JSON.parse(typeof event.data === 'string' ? event.data : '');
    } catch {
      return;
    }
    switch (msg.type) {
      case 'connection_ack': {
        if (this.connectAckTimer) {
          clearTimeout(this.connectAckTimer);
          this.connectAckTimer = null;
        }
        const ackTimeout = msg.payload?.connectionTimeoutMs;
        if (typeof ackTimeout === 'number' && ackTimeout > 0) {
          this.connectionTimeoutMs = ackTimeout;
        }
        this.lastKaAt = Date.now();
        this.armKaWatchdog();
        this.reconnectAttempts = 0;
        // Fire start for every registered subscription.
        for (const entry of this.subscriptions.values()) {
          if (entry.disposed) continue;
          entry.started = false;
          void this.sendStart(entry);
        }
        return;
      }
      case 'ka': {
        this.lastKaAt = Date.now();
        this.armKaWatchdog();
        return;
      }
      case 'start_ack': {
        const entry = msg.id ? this.subscriptions.get(msg.id) : undefined;
        if (entry) entry.started = true;
        return;
      }
      case 'data': {
        const entry = msg.id ? this.subscriptions.get(msg.id) : undefined;
        if (!entry || entry.disposed) return;
        const payload = msg.payload as { data?: unknown; errors?: { message: string }[] } | undefined;
        if (payload?.errors && payload.errors.length > 0) {
          entry.handlers.error(new Error(payload.errors.map((e) => e.message).join('; ')));
          return;
        }
        if (payload?.data !== undefined) {
          entry.handlers.next(payload.data);
        }
        return;
      }
      case 'error':
      case 'connection_error': {
        // AppSync sends `connection_error` for auth/protocol failures
        // during the connect handshake, and `error` for per-subscription
        // failures after `connection_ack`. The payload shape is
        // `{ errors: [{ message, errorCode? }] }` in both cases — we
        // surface them through the same path. Earlier revisions only
        // handled `error`, which left `connection_error` falling
        // through to the silent-default branch and AppSync then
        // closing the socket cleanly (1000). The reconnect loop
        // re-tripped the same auth error every time; the symptom was
        // a parade of "[webphone] graphql-ws closed: 1000" with zero
        // diagnostic context.
        const entry = msg.id ? this.subscriptions.get(msg.id) : undefined;
        const errs = (msg.payload as
          | { errors?: { message: string; errorCode?: number | string }[] }
          | undefined)?.errors;
        const message =
          errs && errs.length > 0
            ? errs
              .map((e) =>
                e.errorCode != null ? `[${e.errorCode}] ${e.message}` : e.message,
              )
              .join('; ')
            : `AppSync ${msg.type}`;
        if (entry && !entry.disposed) {
          entry.handlers.error(new Error(message));
        } else {
          console.warn(`[realtime] AppSync ${msg.type}:`, message);
        }
        // For connection-level errors, AppSync immediately closes the
        // socket with code 1000; suppressing the reconnect cuts the
        // tight loop. We use a poison flag the close handler reads.
        if (msg.type === 'connection_error') {
          this.connectionRejected = true;
        }
        return;
      }
      case 'complete': {
        // Server-side end of subscription (rare; usually we drive close).
        const entry = msg.id ? this.subscriptions.get(msg.id) : undefined;
        if (entry) {
          entry.disposed = true;
          this.subscriptions.delete(entry.id);
        }
        return;
      }
      default: {
        // Forward-compat: log unknown message types instead of dropping
        // them silently. AppSync occasionally adds new control messages
        // (e.g. `keep_alive`) and we want to find out before they bite.
        console.warn('[realtime] AppSync unknown message type:', msg.type, msg.payload);
        return;
      }
    }
  }

  private onClose(socket: WebSocket, code: number, reason: string): void {
    if (socket !== this.socket) return;
    this.socket = null;
    if (this.connectAckTimer) {
      clearTimeout(this.connectAckTimer);
      this.connectAckTimer = null;
    }
    if (this.kaWatchdog) {
      clearTimeout(this.kaWatchdog);
      this.kaWatchdog = null;
    }
    this.config.onClose?.({ code, reason });
    if (this.disposed) return;
    // All registered subscriptions are now un-acked; mark them so we
    // re-fire `start` after the next connection_ack.
    for (const entry of this.subscriptions.values()) {
      entry.started = false;
    }
    this.scheduleReconnect(`socket closed: ${code} ${reason}`);
  }

  private scheduleReconnect(reason: string): void {
    if (this.disposed) return;
    if (this.connectionRejected) {
      console.warn(
        '[realtime] AppSync rejected the connection (auth/protocol-level); ' +
        'not reconnecting. Reload the page or call configureRealtimeClient ' +
        'with a fresh JWT.',
        { reason },
      );
      return;
    }
    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      console.warn('[realtime] giving up after', this.reconnectAttempts, 'reconnect attempts:', reason);
      return;
    }
    const delay = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_MIN_DELAY_MS * Math.pow(2, this.reconnectAttempts),
    );
    this.reconnectAttempts += 1;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private armKaWatchdog(): void {
    if (this.kaWatchdog) clearTimeout(this.kaWatchdog);
    // AppSync says: if no `ka` arrives within `connectionTimeoutMs`,
    // close. Add a 10% slack so a slightly-late `ka` doesn't trigger a
    // spurious reconnect.
    const limit = Math.floor(this.connectionTimeoutMs * 1.1);
    this.kaWatchdog = setTimeout(() => {
      console.warn('[realtime] AppSync keep-alive watchdog tripped after', limit, 'ms');
      try {
        this.socket?.close(4000, 'keep-alive timeout');
      } catch {
        // ignore
      }
    }, limit);
  }

  // -------------------------------------------------------------------------
  // Per-subscription `start`
  // -------------------------------------------------------------------------

  private async sendStart(entry: AppSyncSubscriptionEntry): Promise<void> {
    if (entry.disposed) return;
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    let jwt: string;
    try {
      jwt = await Promise.resolve(this.config.getJwt());
    } catch (err) {
      entry.handlers.error(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    const apiHost = realtimeUrlToApiHost(this.config.url);
    this.send({
      id: entry.id,
      type: 'start',
      payload: {
        data: JSON.stringify({ query: entry.query, variables: entry.variables }),
        extensions: {
          authorization: { host: apiHost, Authorization: jwt },
        },
      },
    });
  }

  private send(msg: AppSyncMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(msg));
    } catch (err) {
      console.warn('[realtime] send failed:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AppSyncMessage {
  id?: string;
  type:
  | 'connection_init'
  | 'connection_ack'
  // AppSync sends `connection_error` for handshake-time auth/protocol
  // failures on the realtime endpoint. Spelled separately from `error`
  // (which is per-subscription) — the legacy graphql-ws subprotocol
  // distinguishes "the whole connection is dead" from "this one
  // subscription failed".
  | 'connection_error'
  | 'start'
  | 'start_ack'
  | 'data'
  | 'error'
  | 'complete'
  | 'stop'
  | 'ka';
  payload?: Record<string, unknown>;
}

/**
 * Convert the AppSync realtime endpoint URL to its corresponding HTTPS
 * API host (used as the `host` in the auth payload).
 *
 * Input:  `wss://<id>.appsync-realtime-api.<region>.amazonaws.com/graphql`
 * Output: `<id>.appsync-api.<region>.amazonaws.com`
 *
 * Custom-domain APIs (`api.example.com`) use the same host for both
 * realtime and API endpoints — pass the custom domain through
 * unchanged.
 */
/**
 * Standard base64-encode a UTF-8 string. Used to build AppSync's
 * `?header=…&payload=…` query string. Browsers' native `btoa` only
 * accepts Latin-1 — JWTs are ASCII so this works for the Authorization
 * field, but we wrap in `unescape(encodeURIComponent(...))` for safety
 * if any header value ever contains non-ASCII (host names are ASCII
 * by IDNA, so in practice this is belt-and-braces).
 */
function base64Encode(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function realtimeUrlToApiHost(realtimeUrl: string): string {
  try {
    const u = new URL(realtimeUrl);
    return u.hostname.replace('-realtime-api.', '-api.');
  } catch {
    return realtimeUrl;
  }
}


/**
 * Tiny RFC-4122 v4 UUID. Subscription ids are opaque to AppSync — any
 * unique-per-connection string would work — but UUIDs make the audit
 * trail in CloudWatch easier to read.
 */
function uuid(): string {
  // crypto.randomUUID is available in all evergreen browsers, but be
  // defensive in case we're served to an older runtime.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-${((parseInt(s[16] ?? '0', 16) & 0x3) | 0x8).toString(16) + s.slice(17, 20)
    }-${s.slice(20, 32)}`;
}
