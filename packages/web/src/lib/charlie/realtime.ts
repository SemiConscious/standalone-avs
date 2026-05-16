/**
 * Browser-side graphql-ws subscription client. One singleton per app
 * instance; opens on first subscribe, idles when no consumers remain.
 *
 * The webphone is the main consumer in Phase 0:
 *   - `onCallEvent` for state reconciliation of all active call legs
 *   - `onAgentStateChanged` for the availability widget
 *
 * Phase 2+ adds wallboard / user-mutation / group-membership streams; the
 * pattern is the same — call `subscribeStore(operation, variables)` and
 * the returned Svelte store yields parsed `data` objects.
 */

import { createClient, type Client as GraphqlWsClient } from 'graphql-ws';
import { writable, type Readable } from 'svelte/store';

export interface RealtimeClientConfig {
  /** AppSync realtime endpoint, e.g. `wss://<id>.appsync-realtime-api.<region>.amazonaws.com/graphql`. */
  url: string;
  /**
   * Callback invoked just before each (re)connect. Must resolve to a fresh
   * Charlie JWT — the connection_init payload carries it as a Bearer
   * header. Typically wired to `BrowserCharlieClient.currentJwt()`.
   */
  getJwt: () => string | Promise<string>;
  /**
   * Optional hook fired whenever the underlying socket closes for any
   * reason. The webphone uses this to surface a "reconnecting…" indicator.
   */
  onClose?: (event: { code: number; reason: string }) => void;
}

/**
 * Internal — one process-wide instance. `getRealtimeClient` lazily
 * constructs it on first call.
 */
let singleton: GraphqlWsClient | null = null;
let singletonConfig: RealtimeClientConfig | null = null;
let activeSubscriptions = 0;
let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;

/** When the last subscriber unsubscribes, the socket lingers for this long before closing. */
const IDLE_CLOSE_DELAY_MS = 30_000;

export function configureRealtimeClient(config: RealtimeClientConfig): void {
  if (singleton) {
    singleton.dispose();
    singleton = null;
  }
  singletonConfig = config;
}

function getRealtimeClient(): GraphqlWsClient {
  if (singleton) return singleton;
  if (!singletonConfig) {
    throw new Error(
      '`lib/charlie/realtime`: configureRealtimeClient() must be called before subscribing.'
    );
  }
  const cfg = singletonConfig;
  singleton = createClient({
    url: cfg.url,
    lazy: true,
    keepAlive: 30_000,
    retryAttempts: 10,
    shouldRetry: () => true,
    connectionParams: async () => ({
      // AppSync expects the Authorization header in connection_init for
      // Lambda-authorized realtime endpoints.
      Authorization: `Bearer ${await cfg.getJwt()}`,
    }),
    on: {
      closed: (event) => {
        const ev = event as { code?: number; reason?: string };
        cfg.onClose?.({ code: ev.code ?? 0, reason: ev.reason ?? '' });
      },
    },
  });
  return singleton;
}

/**
 * Subscribe to a Charlie GraphQL subscription and expose the most-recent
 * payload as a Svelte readable store. Returns a cleanup function the
 * caller must invoke on unmount.
 */
export function subscribeStore<T>(
  query: string,
  variables: Record<string, unknown> = {}
): { store: Readable<T | null>; lastError: Readable<Error | null>; unsubscribe: () => void } {
  const store = writable<T | null>(null);
  const errorStore = writable<Error | null>(null);
  let unsubscribed = false;

  const client = getRealtimeClient();

  activeSubscriptions += 1;
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }

  const dispose = client.subscribe<T>(
    { query, variables },
    {
      next: (msg) => {
        if (unsubscribed) return;
        if (msg.errors && msg.errors.length > 0) {
          errorStore.set(new Error(msg.errors.map((e) => e.message).join('; ')));
          return;
        }
        if (msg.data) {
          store.set(msg.data as T);
          errorStore.set(null);
        }
      },
      error: (err) => {
        if (unsubscribed) return;
        errorStore.set(err instanceof Error ? err : new Error(String(err)));
      },
      complete: () => {
        // No-op — subscriptions only complete on cleanup.
      },
    }
  );

  const unsubscribe = () => {
    if (unsubscribed) return;
    unsubscribed = true;
    dispose();
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
