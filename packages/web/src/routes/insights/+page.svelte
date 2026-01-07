<script lang="ts">
  import { Card, Badge } from '$lib/components/ui';
  import { Phone, PhoneIncoming, PhoneMissed, Clock, Users, TrendingUp } from 'lucide-svelte';

  interface StatCard {
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down' | 'neutral';
    icon: typeof Phone;
  }

  const stats: StatCard[] = [
    { label: 'Total Calls', value: '2,847', change: '+12%', trend: 'up', icon: Phone },
    { label: 'Answered', value: '2,456', change: '+8%', trend: 'up', icon: PhoneIncoming },
    { label: 'Missed', value: '391', change: '-5%', trend: 'down', icon: PhoneMissed },
    { label: 'Avg. Duration', value: '4m 32s', change: '+2%', trend: 'up', icon: Clock },
  ];

  const realtimeStats = {
    activeCalls: 12,
    availableAgents: 8,
    callsInQueue: 3,
    longestWait: '2m 15s',
  };

  const topAgents = [
    { name: 'John Smith', calls: 156, avgDuration: '3m 45s' },
    { name: 'Jane Doe', calls: 142, avgDuration: '4m 12s' },
    { name: 'Bob Johnson', calls: 128, avgDuration: '3m 58s' },
    { name: 'Alice Williams', calls: 115, avgDuration: '4m 35s' },
    { name: 'Charlie Brown', calls: 98, avgDuration: '3m 22s' },
  ];
</script>

<svelte:head>
  <title>Insights | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Insights</h1>
      <p class="text-text-secondary mt-1">Analytics and call statistics</p>
    </div>
    <select
      class="px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <option value="today">Today</option>
      <option value="week">This Week</option>
      <option value="month" selected>This Month</option>
      <option value="quarter">This Quarter</option>
    </select>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {#each stats as stat}
      <Card class="hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-text-secondary">{stat.label}</p>
            <p class="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
          <div class="p-2 bg-accent/10 rounded-base">
            <svelte:component this={stat.icon} class="w-5 h-5 text-accent" />
          </div>
        </div>
        <div class="mt-3 flex items-center gap-1">
          <Badge
            variant={stat.trend === 'up' ? 'success' : stat.trend === 'down' ? 'error' : 'neutral'}
            size="sm"
          >
            {stat.change}
          </Badge>
          <span class="text-xs text-text-secondary">vs last period</span>
        </div>
      </Card>
    {/each}
  </div>

  <!-- Two Column Layout -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Real-time Stats -->
    <Card>
      {#snippet header()}
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <h2 class="font-semibold">Real-time</h2>
        </div>
      {/snippet}

      <div class="grid grid-cols-2 gap-4">
        <div class="p-4 bg-bg-secondary rounded-base">
          <p class="text-sm text-text-secondary">Active Calls</p>
          <p class="text-3xl font-bold text-accent mt-1">{realtimeStats.activeCalls}</p>
        </div>
        <div class="p-4 bg-bg-secondary rounded-base">
          <p class="text-sm text-text-secondary">Available Agents</p>
          <p class="text-3xl font-bold text-success mt-1">{realtimeStats.availableAgents}</p>
        </div>
        <div class="p-4 bg-bg-secondary rounded-base">
          <p class="text-sm text-text-secondary">Calls in Queue</p>
          <p class="text-3xl font-bold text-warning mt-1">{realtimeStats.callsInQueue}</p>
        </div>
        <div class="p-4 bg-bg-secondary rounded-base">
          <p class="text-sm text-text-secondary">Longest Wait</p>
          <p class="text-3xl font-bold mt-1">{realtimeStats.longestWait}</p>
        </div>
      </div>
    </Card>

    <!-- Top Performers -->
    <Card>
      {#snippet header()}
        <div class="flex items-center gap-2">
          <TrendingUp class="w-5 h-5 text-accent" />
          <h2 class="font-semibold">Top Performers</h2>
        </div>
      {/snippet}

      <div class="space-y-3">
        {#each topAgents as agent, index}
          <div
            class="flex items-center justify-between p-3 bg-bg-secondary rounded-base"
          >
            <div class="flex items-center gap-3">
              <span
                class="w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-medium flex items-center justify-center"
              >
                {index + 1}
              </span>
              <div>
                <p class="font-medium">{agent.name}</p>
                <p class="text-sm text-text-secondary">{agent.calls} calls</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium">{agent.avgDuration}</p>
              <p class="text-xs text-text-secondary">avg. duration</p>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  </div>

  <!-- Call Distribution Chart Placeholder -->
  <Card>
    {#snippet header()}
      <h2 class="font-semibold">Call Distribution</h2>
    {/snippet}

    <div class="h-64 flex items-center justify-center bg-bg-secondary rounded-base">
      <p class="text-text-secondary">Chart visualization coming soon</p>
    </div>
  </Card>
</div>

