// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { ErrorCode } from '$lib/errors';

declare global {
  namespace App {
    /**
     * Error structure returned by SvelteKit error responses
     */
    interface Error {
      message: string;
      code?: ErrorCode | string;
      details?: Record<string, unknown>;
    }

    /**
     * Server-side locals available in hooks and load functions
     */
    interface Locals {
      user?: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
      };
      accessToken?: string;
      refreshToken?: string;
      instanceUrl?: string;
    }

    /**
     * Page data available to all pages
     */
    interface PageData {
      /** Current user information if authenticated */
      user?: App.Locals['user'];
    }

    /**
     * Page state for navigation
     */
    interface PageState {
      /** Previous page for back navigation */
      from?: string;
    }

    // interface Platform {}
  }
}

export {};

