<script lang="ts">
  import { Card } from '$lib/components/ui';
  import { onMount, onDestroy } from 'svelte';
  import {
    PhoneCall,
    PhoneOff,
    Clock,
    Users,
    Activity,
    PhoneIncoming,
    PhoneOutgoing,
    ArrowRightLeft,
    RefreshCw,
    Maximize,
    Minimize,
    Zap,
  } from 'lucide-svelte';
  import type { WallboardStats } from '../../api/wallboards/stats/+server';

  let stats = $state<WallboardStats | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let lastUpdated = $state<Date | null>(null);
  let isFullscreen = $state(false);
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  async function fetchStats() {
    try {
      const response = await fetch('/api/wallboards/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      stats = await response.json();
      lastUpdated = new Date();
      error = null;
    } catch (e) {
      error = 'Failed to load live data';
      console.error('Wallboard stats error:', e);
    } finally {
      loading = false;
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      isFullscreen = true;
    } else {
      document.exitFullscreen();
      isFullscreen = false;
    }
  }

  onMount(() => {
    fetchStats();
    // Auto-refresh every 5 seconds
    refreshInterval = setInterval(fetchStats, 5000);

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement;
    });
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  function formatTime(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<svelte:head>
  <title>Live Wallboard | Natterbox AVS</title>
</svelte:head>

<div class="min-h-screen bg-bg-primary p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <Activity class="w-8 h-8 text-accent animate-pulse" />
      <div>
        <h1 class="text-2xl font-bold">Live Wallboard</h1>
        <p class="text-sm text-text-secondary">
          {#if lastUpdated}
            Last updated: {lastUpdated.toLocaleTimeString()}
          {:else}
            Loading...
          {/if}
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={fetchStats}
        class="p-2 hover:bg-bg-secondary rounded-base transition-colors"
        title="Refresh now"
      >
        <RefreshCw class="w-5 h-5 {loading ? 'animate-spin' : ''}" />
      </button>
      <button
        onclick={toggleFullscreen}
        class="p-2 hover:bg-bg-secondary rounded-base transition-colors"
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {#if isFullscreen}
          <Minimize class="w-5 h-5" />
        {:else}
          <Maximize class="w-5 h-5" />
        {/if}
      </button>
    </div>
  </div>

  {#if error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4">
      {error}
    </div>
  {/if}

  {#if stats}
    <!-- Main Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <!-- Active Calls -->
      <Card class="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <div class="text-center">
          <PhoneCall class="w-8 h-8 mx-auto mb-2 text-success {stats.activeCalls > 0 ? 'animate-pulse' : ''}" />
          <p class="text-4xl font-bold text-success">{stats.activeCalls}</p>
          <p class="text-sm text-text-secondary">Active Calls</p>
        </div>
      </Card>

      <!-- Calls Waiting -->
      <Card class="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
        <div class="text-center">
          <Clock class="w-8 h-8 mx-auto mb-2 text-warning" />
          <p class="text-4xl font-bold text-warning">{stats.callsWaiting}</p>
          <p class="text-sm text-text-secondary">Calls Waiting</p>
        </div>
      </Card>

      <!-- Agents Available -->
      <Card class="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
        <div class="text-center">
          <Users class="w-8 h-8 mx-auto mb-2 text-accent" />
          <p class="text-4xl font-bold text-accent">{stats.agentsAvailable}</p>
          <p class="text-sm text-text-secondary">Available</p>
        </div>
      </Card>

      <!-- Agents Busy -->
      <Card class="bg-gradient-to-br from-error/10 to-error/5 border-error/20">
        <div class="text-center">
          <PhoneOff class="w-8 h-8 mx-auto mb-2 text-error" />
          <p class="text-4xl font-bold text-error">{stats.agentsBusy}</p>
          <p class="text-sm text-text-secondary">Busy</p>
        </div>
      </Card>

      <!-- Avg Wait Time -->
      <Card>
        <div class="text-center">
          <Clock class="w-8 h-8 mx-auto mb-2 text-purple-500" />
          <p class="text-4xl font-bold">{formatTime(stats.avgWaitTime)}</p>
          <p class="text-sm text-text-secondary">Avg Wait</p>
        </div>
      </Card>

      <!-- Longest Wait -->
      <Card class={stats.longestWait > 120 ? 'bg-error/10 border-error/20' : ''}>
        <div class="text-center">
          <Clock class="w-8 h-8 mx-auto mb-2 {stats.longestWait > 120 ? 'text-error' : 'text-text-secondary'}" />
          <p class="text-4xl font-bold {stats.longestWait > 120 ? 'text-error' : ''}">{formatTime(stats.longestWait)}</p>
          <p class="text-sm text-text-secondary">Longest Wait</p>
        </div>
      </Card>
    </div>

    <!-- Secondary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Calls by Direction -->
      <Card>
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <Activity class="w-5 h-5 text-accent" />
          Calls by Direction
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-base">
            <div class="flex items-center gap-2">
              <PhoneIncoming class="w-5 h-5 text-success" />
              <span>Inbound</span>
            </div>
            <span class="text-2xl font-bold">{stats.callsByDirection.inbound}</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-base">
            <div class="flex items-center gap-2">
              <PhoneOutgoing class="w-5 h-5 text-accent" />
              <span>Outbound</span>
            </div>
            <span class="text-2xl font-bold">{stats.callsByDirection.outbound}</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-base">
            <div class="flex items-center gap-2">
              <ArrowRightLeft class="w-5 h-5 text-purple-500" />
              <span>Internal</span>
            </div>
            <span class="text-2xl font-bold">{stats.callsByDirection.internal}</span>
          </div>
        </div>
      </Card>

      <!-- Queues -->
      <Card>
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <Users class="w-5 h-5 text-accent" />
          Calls by Queue
        </h3>
        {#if stats.callsByQueue.length > 0}
          <div class="space-y-2">
            {#each stats.callsByQueue as queue}
              <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-base">
                <span class="truncate">{queue.name}</span>
                <span class="text-xl font-bold ml-2">{queue.count}</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 text-text-secondary">
            <p>No active queue calls</p>
          </div>
        {/if}
      </Card>

      <!-- Agent Summary -->
      <Card>
        <h3 class="font-semibold mb-4 flex items-center gap-2">
          <Users class="w-5 h-5 text-accent" />
          Agent Summary
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span>Available</span>
            <div class="flex items-center gap-2">
              <div class="w-24 h-3 bg-bg-secondary rounded-full overflow-hidden">
                <div 
                  class="h-full bg-success rounded-full"
                  style="width: {stats.agentsAvailable + stats.agentsBusy + stats.agentsOffline > 0 ? (stats.agentsAvailable / (stats.agentsAvailable + stats.agentsBusy + stats.agentsOffline)) * 100 : 0}%"
                ></div>
              </div>
              <span class="font-bold w-8 text-right">{stats.agentsAvailable}</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span>Busy</span>
            <div class="flex items-center gap-2">
              <div class="w-24 h-3 bg-bg-secondary rounded-full overflow-hidden">
                <div 
                  class="h-full bg-error rounded-full"
                  style="width: {stats.agentsAvailable + stats.agentsBusy + stats.agentsOffline > 0 ? (stats.agentsBusy / (stats.agentsAvailable + stats.agentsBusy + stats.agentsOffline)) * 100 : 0}%"
                ></div>
              </div>
              <span class="font-bold w-8 text-right">{stats.agentsBusy}</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span>Offline</span>
            <div class="flex items-center gap-2">
              <div class="w-24 h-3 bg-bg-secondary rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gray-500 rounded-full"
                  style="width: {stats.agentsAvailable + stats.agentsBusy + stats.agentsOffline > 0 ? (stats.agentsOffline / (stats.agentsAvailable + stats.agentsBusy + stats.agentsOffline)) * 100 : 0}%"
                ></div>
              </div>
              <span class="font-bold w-8 text-right">{stats.agentsOffline}</span>
            </div>
          </div>
          <div class="border-t border-border pt-3 mt-3">
            <div class="flex items-center justify-between">
              <span class="font-medium">Total Agents</span>
              <span class="text-xl font-bold">{stats.agentsAvailable + stats.agentsBusy + stats.agentsOffline}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Today's Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">Total Calls Today</h3>
            <p class="text-sm text-text-secondary">Since midnight</p>
          </div>
          <p class="text-4xl font-bold text-accent">{stats.totalCallsToday}</p>
        </div>
      </Card>
      <Card>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">Connection Status</h3>
            <p class="text-sm text-text-secondary">Real-time data feed</p>
          </div>
          <div class="flex items-center gap-2">
            <Zap class="w-6 h-6 text-success" />
            <span class="text-success font-medium">Connected</span>
          </div>
        </div>
      </Card>
    </div>
  {:else if loading}
    <div class="text-center py-20">
      <RefreshCw class="w-12 h-12 mx-auto mb-4 animate-spin text-accent" />
      <p class="text-text-secondary">Loading wallboard data...</p>
    </div>
  {/if}
</div>

