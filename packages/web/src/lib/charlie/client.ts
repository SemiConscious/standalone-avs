/**
 * GraphQL client factories for Charlie. Two flavours:
 *
 *   - `createServerCharlieClient(jwt)` — runs in SvelteKit server context
 *     (+page.server.ts / endpoints). Uses Node's `fetch`.
 *   - `createBrowserCharlieClient(jwt)` — runs in the browser. Uses
 *     `window.fetch` and re-mints the JWT on expiry via `/api/charlie/jwt`.
 *
 * The graphql-ws subscription client is in `realtime.ts` — keeping it
 * separate because subscriptions are browser-only in the Phase-0 webphone.
 */

import { GraphQLClient, type RequestDocument, type Variables } from 'graphql-request';
import type { CharlieSession } from './types';

export interface ServerCharlieClient {
  request<T>(document: RequestDocument, variables?: Variables): Promise<T>;
}

/**
 * Construct a server-side Charlie GraphQL client bound to a specific
 * session JWT. The client is request-scoped — caller is responsible for
 * threading it through their `+page.server.ts` load functions.
 */
export function createServerCharlieClient(
  appsyncHttp: string,
  session: CharlieSession
): ServerCharlieClient {
  const client = new GraphQLClient(appsyncHttp, {
    headers: {
      Authorization: `Bearer ${session.jwt}`,
    },
    fetch,
  });
  return {
    async request<T>(document: RequestDocument, variables?: Variables): Promise<T> {
      return client.request<T>(document, variables);
    },
  };
}

/**
 * Browser-side Charlie GraphQL client with auto-refresh of the underlying
 * JWT on `401 TOKEN_EXPIRED`. The refresh flow hits
 * `/api/charlie/jwt/+server.ts` to get a fresh browser-scoped JWT.
 *
 * Use this for ad-hoc queries from Svelte components (typically `onMount`
 * fetches). For long-lived state, prefer the subscription client in
 * `realtime.ts`.
 */
export class BrowserCharlieClient {
  private inner: GraphQLClient;
  private jwt: string;
  private expiresAt: number;
  private refreshing: Promise<void> | null = null;

  constructor(
    private readonly appsyncHttp: string,
    initialJwt: string,
    initialExpiresAt: number
  ) {
    this.jwt = initialJwt;
    this.expiresAt = initialExpiresAt;
    this.inner = new GraphQLClient(this.appsyncHttp, {
      headers: { Authorization: `Bearer ${this.jwt}` },
    });
  }

  async request<T>(document: RequestDocument, variables?: Variables): Promise<T> {
    await this.ensureFreshJwt();
    try {
      return await this.inner.request<T>(document, variables);
    } catch (err) {
      if (looksLikeAuthError(err)) {
        await this.forceRefresh();
        return this.inner.request<T>(document, variables);
      }
      throw err;
    }
  }

  /**
   * Force a refresh of the underlying JWT. Useful when the
   * graphql-ws subscription socket reports an auth failure and the
   * webphone wants to re-issue dependent requests with the new token.
   */
  async forceRefresh(): Promise<void> {
    await this.refresh();
  }

  /** Current JWT, useful for handing to JsSIP or the subscription client. */
  currentJwt(): string {
    return this.jwt;
  }

  /** Expiry of the current JWT in unix seconds. */
  currentExpiresAt(): number {
    return this.expiresAt;
  }

  private async ensureFreshJwt(): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    // Refresh 60s before the actual expiry so in-flight requests don't trip
    // over the cliff.
    if (this.expiresAt - 60 > nowSeconds) return;
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) {
      await this.refreshing;
      return;
    }
    this.refreshing = (async () => {
      const res = await fetch('/api/charlie/jwt', { method: 'POST' });
      if (!res.ok) {
        throw new Error(
          `Failed to refresh Charlie browser JWT: HTTP ${res.status} ${res.statusText}`
        );
      }
      const body = (await res.json()) as { ok: boolean; jwt?: string; expiresAt?: number };
      if (!body.ok || !body.jwt || !body.expiresAt) {
        throw new Error('Charlie browser JWT refresh response was unsuccessful.');
      }
      this.jwt = body.jwt;
      this.expiresAt = body.expiresAt;
      this.inner = new GraphQLClient(this.appsyncHttp, {
        headers: { Authorization: `Bearer ${this.jwt}` },
      });
    })().finally(() => {
      this.refreshing = null;
    });
    await this.refreshing;
  }
}

function looksLikeAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes('token_expired') ||
    message.includes('token_missing') ||
    message.includes('unauthorized') ||
    message.includes(' 401')
  );
}
