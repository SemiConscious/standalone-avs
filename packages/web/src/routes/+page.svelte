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
  <title>Dashboard | AVS Platform</title>
</svelte:head>

<div class="space-y-8">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <div>
        <p class="font-medium">Demo Mode</p>
        <p class="text-sm opacity-80">Showing sample data. Set DEMO_MODE=false and authenticate with Salesforce to see real data.</p>
      </div>
    </div>
  {/if}

  <!-- Welcome Section -->
  <div>
    <h1 class="text-2xl font-bold text-text-primary">
      {#if $isAuthenticated}
        Welcome back, {$currentUser?.name?.split(' ')[0]}
      {:else if data.isDemo}
        Welcome to AVS Platform
      {:else}
        Welcome to AVS Platform
      {/if}
    </h1>
    <p class="mt-1 text-text-secondary">
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
      <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <p>{data.error}</p>
      </div>
    {/if}

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each stats as stat}
        <a href={stat.href} class="group">
          <Card class="hover:shadow-lg hover:border-accent transition-all">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm text-text-secondary">{stat.label}</p>
                <p class="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div class="p-2 bg-accent/10 rounded-base group-hover:bg-accent/20 transition-colors">
                <svelte:component this={stat.icon} class="w-5 h-5 text-accent" />
              </div>
            </div>
            <div class="mt-3 flex items-center text-sm text-text-secondary group-hover:text-accent transition-colors">
              <span>View all</span>
              <ArrowRight class="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Card>
        </a>
      {/each}
    </div>

    <!-- Quick Actions -->
    <div>
      <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each quickActions as action}
          <a href={action.href} class="group">
            <Card class="h-full hover:border-accent transition-colors">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-accent/10 rounded-base group-hover:bg-accent/20 transition-colors">
                  <svelte:component this={action.icon} class="w-6 h-6 text-accent" />
                </div>
                <div class="flex-1">
                  <h3 class="font-medium flex items-center gap-2">
                    {action.label}
                    <ArrowRight
                      class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </h3>
                  <p class="text-sm text-text-secondary mt-1">{action.description}</p>
                </div>
              </div>
            </Card>
          </a>
        {/each}
      </div>
    </div>

    <!-- Recent Activity -->
    <div>
      <h2 class="text-lg font-semibold mb-4">Recent Activity</h2>
      <Card>
        <div class="flex items-center justify-center py-8 text-text-secondary">
          <Activity class="w-5 h-5 mr-2" />
          <span>Activity feed coming soon</span>
        </div>
      </Card>
    </div>
  {:else}
    <!-- Login CTA -->
    <Card class="text-center py-12">
      <div class="max-w-md mx-auto">
        <div class="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
          <Users class="w-8 h-8 text-accent" />
        </div>
        <h2 class="mt-4 text-xl font-semibold">Get Started with AVS</h2>
        <p class="mt-2 text-text-secondary">
          Sign in with your Salesforce account to manage users, groups, devices, and call flows.
        </p>
        <div class="mt-6 space-y-3">
          <Button variant="primary">
            <a href="/auth/login">Sign in with Salesforce</a>
          </Button>
          <p class="text-xs text-text-secondary">
            Or set <code class="bg-bg-secondary px-1 py-0.5 rounded">DEMO_MODE=true</code> in your .env file to preview with sample data
          </p>
        </div>
      </div>
    </Card>
  {/if}
</div>
