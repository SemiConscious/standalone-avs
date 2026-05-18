<script lang="ts">
  import '../app.css';
  import { Header, Sidebar } from '$lib/components/layout';
  import { auth } from '$lib/stores/auth';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import type { CharliePublicConfig } from '$lib/charlie';
  import type { Component } from 'svelte';

  interface Props {
    data: {
      user?: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
      };
      charlie?: CharliePublicConfig;
    };
    children: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();

  // Set auth state from server data
  $effect(() => {
    if (data.user) {
      auth.setUser(data.user);
    } else {
      auth.setUser(null);
    }
  });

  let sidebarOpen = $state(false);

  // Check if current route should be fullscreen (no sidebar/header)
  // Note: policy-editor now uses the regular layout
  const fullscreenRoutes: string[] = [];
  let isFullscreen = $derived(
    fullscreenRoutes.some((route) => $page.url.pathname.startsWith(route))
  );

  // Check if user is authenticated
  let isAuthenticated = $derived(!!data.user);

  // Auth routes that should show minimal layout (don't redirect from these)
  const authRoutes = ['/auth/login', '/auth/callback', '/auth/logout'];
  let isAuthRoute = $derived(authRoutes.some((route) => $page.url.pathname.startsWith(route)));

  // Redirect unauthenticated users to login (except on auth routes)
  $effect(() => {
    if (browser && !isAuthenticated && !isAuthRoute && !isFullscreen) {
      goto('/auth/login');
    }
  });

  // Dynamic-import the webphone module so JsSIP (~150 KB) stays out of the
  // critical-path bundle for users without webphone access. See
  // `charlie-api/docs/WEBPHONE.md` §4.3.
  type WebphoneProps = {
    appsyncHttp: string;
    appsyncWss: string;
    mockRegistrarWsUrl?: string;
  };
  let WebphoneComponent = $state<Component<WebphoneProps> | null>(null);
  let webphoneShouldLoad = $derived(
    browser &&
      isAuthenticated &&
      !isAuthRoute &&
      !isFullscreen &&
      !!data.charlie?.webphoneEnabled &&
      !!data.charlie?.appsyncHttp &&
      !!data.charlie?.appsyncWss
  );

  $effect(() => {
    if (webphoneShouldLoad && !WebphoneComponent) {
      void (async () => {
        const mod = await import('$lib/components/webphone');
        WebphoneComponent = mod.Webphone as unknown as Component<WebphoneProps>;
      })();
    }
  });
</script>

{#if isFullscreen}
  <!-- Fullscreen layout - no sidebar or header -->
  <div class="h-screen w-screen overflow-hidden bg-surface-100-900">
    {@render children()}
  </div>
{:else if !isAuthenticated || isAuthRoute}
  <!-- Unauthenticated / Auth routes layout - no sidebar or header -->
  <div class="min-h-screen bg-bg-primary">
    <main class="container mx-auto px-4 py-8">
      {@render children()}
    </main>
  </div>
{:else}
  <div class="app-layout">
    <header class="app-header">
      <Header onMenuClick={() => (sidebarOpen = !sidebarOpen)} />
    </header>

    <aside class="app-sidebar" class:open={sidebarOpen}>
      <Sidebar isOpen={sidebarOpen} onClose={() => (sidebarOpen = false)} />
    </aside>

    <main class="app-content">
      {@render children()}
    </main>
  </div>

  <!-- Mobile backdrop -->
  {#if sidebarOpen}
    <div
      class="fixed inset-0 bg-black/50 z-30 lg:hidden"
      onclick={() => (sidebarOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (sidebarOpen = false)}
      role="button"
      tabindex="-1"
      aria-label="Close sidebar"
    ></div>
  {/if}

  <!-- Charlie-driven webphone (dynamic-imported per WEBPHONE.md §4.3) -->
  {#if WebphoneComponent && data.charlie?.appsyncHttp && data.charlie?.appsyncWss}
    {@const Webphone = WebphoneComponent}
    <Webphone appsyncHttp={data.charlie.appsyncHttp} appsyncWss={data.charlie.appsyncWss} />
  {/if}
{/if}
