/**
 * Adapters Index
 * 
 * Factory for creating repositories based on platform context.
 * This is the main entry point for the data access layer.
 * 
 * Platform is determined at the edge in hooks.server.ts and stored in locals.
 * The adapter layer simply uses that pre-determined platform.
 */

import type { Repositories } from '$lib/repositories';
import type { AdapterContext } from './types';
import { 
  isSalesforceContext, 
  isDemoContext, 
  isDynamicsContext,
  createAdapterContext,
  PlatformAuthError,
  UnsupportedPlatformError,
} from './types';
import { createSalesforceRepositories } from './salesforce';
import { createDemoRepositories } from './demo';

// Re-export types and context utilities
export * from './types';

// =============================================================================
// Repository Factory
// =============================================================================

/**
 * Get repositories for the given adapter context
 * 
 * This is the main factory function that returns platform-specific
 * repository implementations based on the context.
 * 
 * @example
 * ```typescript
 * const ctx = createAdapterContext(locals);
 * const repos = getRepositories(ctx);
 * const users = await repos.users.findAll({ page: 1, pageSize: 25 });
 * ```
 * 
 * @throws {PlatformAuthError} If platform requires auth but not authenticated
 * @throws {UnsupportedPlatformError} If platform is not supported
 */
export function getRepositories(ctx: AdapterContext): Repositories {
  if (isDemoContext(ctx)) {
    return createDemoRepositories();
  }

  if (isSalesforceContext(ctx)) {
    return createSalesforceRepositories(ctx);
  }

  if (isDynamicsContext(ctx)) {
    // Future: Add Dynamics repository implementations
    throw new UnsupportedPlatformError('dynamics - not yet implemented');
  }

  // This should never happen due to TypeScript exhaustiveness checking
  throw new UnsupportedPlatformError(`Unknown platform: ${(ctx as AdapterContext).platform}`);
}

/**
 * Get repositories directly from locals
 * 
 * Convenience function that creates context and gets repositories in one call.
 * 
 * @example
 * ```typescript
 * const repos = getRepositoriesFromLocals(locals);
 * const users = await repos.users.findAll({ page: 1, pageSize: 25 });
 * ```
 */
export function getRepositoriesFromLocals(locals: App.Locals): Repositories {
  const ctx = createAdapterContext(locals);
  return getRepositories(ctx);
}

/**
 * Get a single repository by name
 * 
 * @example
 * ```typescript
 * const ctx = createAdapterContext(locals);
 * const userRepo = getRepository(ctx, 'users');
 * ```
 */
export function getRepository<K extends keyof Repositories>(
  ctx: AdapterContext,
  name: K
): Repositories[K] {
  const repos = getRepositories(ctx);
  return repos[name];
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create context and get repositories in one call
 * 
 * @example
 * ```typescript
 * const { ctx, repos, isDemo } = createContextAndRepositories(locals);
 * ```
 */
export function createContextAndRepositories(locals: App.Locals): {
  ctx: AdapterContext;
  repos: Repositories;
  isDemo: boolean;
  platform: App.Locals['platform'];
} {
  const ctx = createAdapterContext(locals);
  const repos = getRepositories(ctx);
  return {
    ctx,
    repos,
    isDemo: ctx.platform === 'demo',
    platform: ctx.platform,
  };
}

/**
 * Safely try to create context and repositories
 * Returns null if platform auth is missing (instead of throwing)
 * 
 * @example
 * ```typescript
 * const result = tryCreateContextAndRepositories(locals);
 * if (!result) {
 *   // Handle unauthenticated case
 *   return redirect(302, '/auth/login');
 * }
 * const { repos, isDemo } = result;
 * ```
 */
export function tryCreateContextAndRepositories(locals: App.Locals): {
  ctx: AdapterContext;
  repos: Repositories;
  isDemo: boolean;
  platform: App.Locals['platform'];
} | null {
  try {
    return createContextAndRepositories(locals);
  } catch (e) {
    if (e instanceof PlatformAuthError) {
      return null;
    }
    throw e;
  }
}
