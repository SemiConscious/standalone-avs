<script lang="ts">
  import { Card, Badge, Button } from '$lib/components/ui';
  import { currentUser, isAuthenticated } from '$lib/stores/auth';
  import { Users, UsersRound, Phone, Workflow, ArrowRight, Activity, AlertCircle, FlaskConical } from 'lucide-svelte';

  interface Props {
    data: {
      stats: {
        totalUsers: number;
        activeGroups: number;
        registeredDevices: number;
        activeCallFlows: number;
      } | null;
      error?: string;
      isDemo?: boolean;
    };
  }

  let { data }: Props = $props();

  // In demo mode, we show the dashboard even without authentication
  const showDashboard = $derived($isAuthenticated || data.isDemo);

  interface StatCard {
    label: string;
    value: number | string;
    icon: typeof Users;
    href: string;
  }

  const stats = $derived<StatCard[]>(
    data.stats
      ? [
          { label: 'Total Users', value: data.stats.totalUsers, icon: Users, href: '/users' },
          { label: 'Active Groups', value: data.stats.activeGroups, icon: UsersRound, href: '/groups' },
          { label: 'Registered Devices', value: data.stats.registeredDevices, icon: Phone, href: '/devices' },
          { label: 'Active Call Flows', value: data.stats.activeCallFlows, icon: Workflow, href: '/call-flows' },
        ]
      : [
          { label: 'Total Users', value: '—', icon: Users, href: '/users' },
          { label: 'Active Groups', value: '—', icon: UsersRound, href: '/groups' },
          { label: 'Registered Devices', value: '—', icon: Phone, href: '/devices' },
          { label: 'Active Call Flows', value: '—', icon: Workflow, href: '/call-flows' },
        ]
  );

  interface QuickAction {
    label: string;
    description: string;
    href: string;
    icon: typeof Users;
  }

  const quickActions: QuickAction[] = [
    {
      label: 'Add User',
      description: 'Create a new AVS user account',
      href: '/users/new',
      icon: Users,
    },
    {
      label: 'Create Group',
      description: 'Set up a new call group',
      href: '/groups/new',
      icon: UsersRound,
    },
    {
      label: 'Build Call Flow',
      description: 'Design a new call flow',
      href: '/call-flows/new',
      icon: Workflow,
    },
  ];
</script>

<svelte:head>
  <title>Dashboard | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="demo-banner">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <div>
        <p class="font-medium">Demo Mode</p>
        <p class="text-sm opacity-80">Showing sample data. Set DEMO_MODE=false and authenticate with Salesforce to see real data.</p>
      </div>
    </div>
  {/if}

  <!-- Welcome Section -->
  <div>
    <h1 class="text-2xl font-bold text-surface-50">
      {#if $isAuthenticated}
        Welcome back, {$currentUser?.name?.split(' ')[0]}
      {:else if data.isDemo}
        Welcome to Natterbox AVS
      {:else}
        Welcome to Natterbox AVS
      {/if}
    </h1>
    <p class="mt-1 text-surface-400">
      {#if $isAuthenticated || data.isDemo}
        Here's an overview of your voice services platform.
      {:else}
        Sign in to manage your voice services.
      {/if}
    </p>
  </div>

  {#if showDashboard}
    <!-- Error Banner -->
    {#if data.error}
      <div class="error-banner">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <p>{data.error}</p>
      </div>
    {/if}

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each stats as stat}
        <a href={stat.href} class="stat-card group">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-surface-400">{stat.label}</p>
              <p class="text-2xl font-bold mt-1 text-surface-50">{stat.value}</p>
            </div>
            <div class="stat-icon">
              <svelte:component this={stat.icon} class="w-5 h-5" />
            </div>
          </div>
          <div class="mt-3 flex items-center text-sm text-surface-400 group-hover:text-primary-400 transition-colors">
            <span>View all</span>
            <ArrowRight class="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      {/each}
    </div>

    <!-- Quick Actions -->
    <div>
      <h2 class="text-lg font-semibold mb-4 text-surface-100">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each quickActions as action}
          <a href={action.href} class="action-card group">
            <div class="flex items-start gap-4">
              <div class="action-icon">
                <svelte:component this={action.icon} class="w-6 h-6" />
              </div>
              <div class="flex-1">
                <h3 class="font-medium text-surface-100 flex items-center gap-2">
                  {action.label}
                  <ArrowRight
                    class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </h3>
                <p class="text-sm text-surface-400 mt-1">{action.description}</p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    </div>

    <!-- Recent Activity -->
    <div>
      <h2 class="text-lg font-semibold mb-4 text-surface-100">Recent Activity</h2>
      <Card>
        <div class="flex items-center justify-center py-8 text-surface-400">
          <Activity class="w-5 h-5 mr-2" />
          <span>Activity feed coming soon</span>
        </div>
      </Card>
    </div>
  {:else}
    <!-- Login CTA -->
    <Card class="text-center py-12">
      <div class="max-w-md mx-auto">
        <div class="login-icon">
          <Users class="w-8 h-8" />
        </div>
        <h2 class="mt-4 text-xl font-semibold text-surface-100">Get Started with AVS</h2>
        <p class="mt-2 text-surface-400">
          Sign in with your Salesforce account to manage users, groups, devices, and call flows.
        </p>
        <div class="mt-6 space-y-3">
          <a href="/auth/login" class="btn btn-primary inline-flex">
            Sign in with Salesforce
          </a>
          <p class="text-xs text-surface-500">
            Or set <code class="code-inline">DEMO_MODE=true</code> in your .env file to preview with sample data
          </p>
        </div>
      </div>
    </Card>
  {/if}
</div>

<style>
  .demo-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.2);
    border-radius: 8px;
    color: rgb(251, 191, 36);
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    color: rgb(248, 113, 113);
  }

  .stat-card {
    display: block;
    padding: 1.25rem;
    background: rgb(var(--color-surface-800));
    border: 1px solid rgb(var(--color-surface-700));
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    border-color: rgb(var(--color-primary-500));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .stat-icon {
    padding: 0.5rem;
    background: rgba(var(--color-primary-500), 0.1);
    border-radius: 8px;
    color: rgb(var(--color-primary-400));
    transition: background 0.2s ease;
  }

  .stat-card:hover .stat-icon {
    background: rgba(var(--color-primary-500), 0.2);
  }

  .action-card {
    display: block;
    padding: 1.25rem;
    background: rgb(var(--color-surface-800));
    border: 1px solid rgb(var(--color-surface-700));
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .action-card:hover {
    border-color: rgb(var(--color-primary-500));
  }

  .action-icon {
    padding: 0.75rem;
    background: rgba(var(--color-primary-500), 0.1);
    border-radius: 8px;
    color: rgb(var(--color-primary-400));
    transition: background 0.2s ease;
  }

  .action-card:hover .action-icon {
    background: rgba(var(--color-primary-500), 0.2);
  }

  .login-icon {
    width: 4rem;
    height: 4rem;
    background: rgba(var(--color-primary-500), 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    color: rgb(var(--color-primary-400));
  }

  .code-inline {
    padding: 0.125rem 0.375rem;
    background: rgb(var(--color-surface-700));
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
  }

  /* Text colors */
  .text-surface-50 { color: rgb(var(--color-surface-50)); }
  .text-surface-100 { color: rgb(var(--color-surface-100)); }
  .text-surface-400 { color: rgb(var(--color-surface-400)); }
  .text-surface-500 { color: rgb(var(--color-surface-500)); }
  .text-primary-400 { color: rgb(var(--color-primary-400)); }
</style>
