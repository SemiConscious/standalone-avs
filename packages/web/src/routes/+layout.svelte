<script lang="ts">
  import '../app.css';
  import { Header, Sidebar } from '$lib/components/layout';
  import { auth } from '$lib/stores/auth';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  interface Props {
    data: {
      user?: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
      };
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
  const fullscreenRoutes = ['/policy-editor'];
  let isFullscreen = $derived(
    fullscreenRoutes.some(route => $page.url.pathname.startsWith(route))
  );
  
  // Check if user is authenticated
  let isAuthenticated = $derived(!!data.user);
  
  // Auth routes that should show minimal layout (don't redirect from these)
  const authRoutes = ['/auth/login', '/auth/callback', '/auth/logout'];
  let isAuthRoute = $derived(
    authRoutes.some(route => $page.url.pathname.startsWith(route))
  );
  
  // Redirect unauthenticated users to login (except on auth routes)
  $effect(() => {
    if (browser && !isAuthenticated && !isAuthRoute && !isFullscreen) {
      goto('/auth/login');
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
{/if}
