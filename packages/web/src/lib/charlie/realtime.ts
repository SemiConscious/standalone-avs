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
    try {
      const socket = new WebSocket(this.config.url, ['graphql-ws']);
      socket.addEventListener('open', () => {
        void this.onOpen(socket);
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

  private async onOpen(socket: WebSocket): Promise<void> {
    if (socket !== this.socket) return;
    // For Lambda authorizer mode, AppSync requires the auth payload
    // INSIDE the connection_init message (not via URL query string).
    let jwt: string;
    try {
      jwt = await Promise.resolve(this.config.getJwt());
    } catch (err) {
      console.warn('[realtime] failed to read JWT for connection_init:', err);
      try {
        socket.close(4001, 'jwt-fetch-failed');
      } catch {
        // ignore
      }
      return;
    }
    if (socket !== this.socket) return; // disposed during await
    const apiHost = realtimeUrlToApiHost(this.config.url);
    this.send({
      type: 'connection_init',
      payload: { host: apiHost, Authorization: jwt },
    });
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
      case 'error': {
        // Top-level error (auth failure during connect, or a per-subscription error).
        const entry = msg.id ? this.subscriptions.get(msg.id) : undefined;
        const errs = (msg.payload as { errors?: { message: string }[] } | undefined)?.errors;
        const message = errs?.map((e) => e.message).join('; ') ?? 'AppSync error';
        if (entry && !entry.disposed) {
          entry.handlers.error(new Error(message));
        } else {
          // Connection-level — surface via console; reconnect on close.
          console.warn('[realtime] AppSync error:', message);
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
      default:
        return;
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
