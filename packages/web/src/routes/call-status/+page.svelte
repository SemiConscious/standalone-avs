<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { Card, Badge } from '$lib/components/ui';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
  import {
    Activity,
    Phone,
    PhoneCall,
    PhoneOff,
    PhoneIncoming,
    PhoneOutgoing,
    Clock,
    Users,
    FlaskConical,
    AlertCircle,
    Pause,
    ArrowRightLeft,
    RefreshCw,
    User,
    CheckCircle,
    Play,
    Square,
    Headphones,
    Filter,
    Search,
  } from 'lucide-svelte';
  import type { CallStatusPageData, ActiveCall, AgentStatus, GroupOption } from './+page.server';

  interface Props {
    data: CallStatusPageData;
  }

  let { data }: Props = $props();

  // Group filter
  let selectedGroup = $state(data.selectedGroupId || '');

  // Agent search
  let agentSearch = $state('');
  const filteredAgents = $derived.by(() => {
    const agents = data.agents;
    if (!agentSearch.trim()) return agents;
    const search = agentSearch.toLowerCase();
    return agents.filter((agent) =>
      agent.name.toLowerCase().includes(search) ||
      agent.extension?.toLowerCase().includes(search)
    );
  });

  function handleGroupChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const groupId = target.value;
    const url = new URL(window.location.href);
    if (groupId) {
      url.searchParams.set('group', groupId);
    } else {
      url.searchParams.delete('group');
    }
    window.location.href = url.toString();
  }

  // Auto-refresh state
  let autoRefreshEnabled = $state(true);
  let refreshInterval: ReturnType<typeof setInterval> | null = null;
  let lastRefreshTime = $state<Date | null>(null);
  const REFRESH_INTERVAL_MS = 10000; // 10 seconds (avs-sfdx uses 5s but that's aggressive)

  onMount(() => {
    lastRefreshTime = new Date();
    if (autoRefreshEnabled) {
      startAutoRefresh();
    }
  });

  onDestroy(() => {
    stopAutoRefresh();
  });

  function startAutoRefresh() {
    if (refreshInterval) return;
    refreshInterval = setInterval(async () => {
      await invalidateAll();
      lastRefreshTime = new Date();
    }, REFRESH_INTERVAL_MS);
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    if (autoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  }

  // Column definitions for active calls table
  let columns = $state<Column[]>([
    { key: 'actions', label: '', width: '50px' },
    { key: 'status', label: 'Status' },
    { key: 'direction', label: 'Dir', width: '60px' },
    { key: 'fromNumber', label: 'From' },
    { key: 'fromUserName', label: 'From User', visible: true },
    { key: 'toNumber', label: 'To' },
    { key: 'toUserName', label: 'To User', visible: true },
    { key: 'duration', label: 'Duration', sortable: true },
    { key: 'feature', label: 'Feature', visible: false },
  ]);

  // Listen In state
  let listenInTarget = $state<ActiveCall | null>(null);
  let showListenInModal = $state(false);

  function handleListenIn(call: ActiveCall) {
    listenInTarget = call;
    showListenInModal = true;
  }

  function closeListenInModal() {
    showListenInModal = false;
    listenInTarget = null;
  }

  // Transform active calls for the data table
  const tableData = $derived(
    data.activeCalls.map((call, index) => ({
      ...call,
      id: call.id || String(index),
    }))
  );

  function getStatusBadge(status: ActiveCall['status']) {
    switch (status) {
      case 'connected':
        return { variant: 'success' as const, label: 'Connected' };
      case 'ringing':
        return { variant: 'warning' as const, label: 'Ringing' };
      case 'on_hold':
        return { variant: 'accent' as const, label: 'On Hold' };
      case 'transferring':
        return { variant: 'neutral' as const, label: 'Transferring' };
    }
  }

  function getStatusIcon(status: ActiveCall['status']) {
    switch (status) {
      case 'connected':
        return PhoneCall;
      case 'ringing':
        return Phone;
      case 'on_hold':
        return Pause;
      case 'transferring':
        return ArrowRightLeft;
    }
  }

  function getAgentStatusBadge(status: AgentStatus['status']) {
    switch (status) {
      case 'available':
        return { variant: 'success' as const, label: 'Available' };
      case 'busy':
        return { variant: 'error' as const, label: 'Busy' };
      case 'on_call':
        return { variant: 'warning' as const, label: 'On Call' };
      case 'wrap_up':
        return { variant: 'accent' as const, label: 'Wrap Up' };
      case 'offline':
        return { variant: 'neutral' as const, label: 'Offline' };
    }
  }

  function formatDuration(seconds: number): string {
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async function refreshData() {
    await invalidateAll();
    lastRefreshTime = new Date();
  }

  function handleColumnsChange(updatedColumns: Column[]) {
    columns = updatedColumns;
  }
</script>

<svelte:head>
  <title>Call Status | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Status Banners -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data.</p>
    </div>
  {:else if data.permissionError}
    <div class="bg-error/10 border border-error/20 text-error rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">{data.permissionError}</p>
    </div>
  {:else if data.usingSapien}
    <div class="bg-success/10 border border-success/20 text-success rounded-lg p-4 flex items-center gap-3">
      <CheckCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">
        Connected to Sapien API - showing real-time call data.
        {#if data.canListenIn}
          <span class="ml-2 text-xs opacity-75">(Listen In enabled)</span>
        {/if}
      </p>
    </div>
  {:else if data.sapienError}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <div class="text-sm">
        <p class="font-medium">{data.sapienError}</p>
        <p class="text-xs opacity-75 mt-1">Generating call data based on Salesforce.</p>
      </div>
    </div>
  {:else if !data.sapienConfigured && !data.error}
    <div class="bg-info/10 border border-info/20 text-info rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <div class="text-sm">
        <p class="font-medium">Real-time call monitoring not configured</p>
        <p class="text-xs opacity-75 mt-1">
          SAPIEN_HOST environment variable is required for live call data. Showing agent statuses from Salesforce.
        </p>
      </div>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Call Status</h1>
      <p class="text-text-secondary mt-1">
        Real-time call monitoring dashboard
        {#if lastRefreshTime}
          <span class="text-xs ml-2">
            Last updated: {lastRefreshTime.toLocaleTimeString()}
          </span>
        {/if}
      </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Group Filter -->
      {#if data.groups.length > 0}
        <select
          bind:value={selectedGroup}
          onchange={handleGroupChange}
          class="px-3 py-2 text-sm bg-surface-700 border border-surface-600 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Groups</option>
          {#each data.groups as group}
            <option value={group.id}>{group.name}</option>
          {/each}
        </select>
      {/if}
      
      <button
        onclick={toggleAutoRefresh}
        class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors {autoRefreshEnabled ? 'bg-success/20 text-success' : 'bg-bg-secondary text-text-secondary'}"
        title={autoRefreshEnabled ? 'Auto-refresh ON (10s)' : 'Auto-refresh OFF'}
      >
        {#if autoRefreshEnabled}
          <Play class="w-3.5 h-3.5" />
          Auto
        {:else}
          <Square class="w-3.5 h-3.5" />
          Auto
        {/if}
      </button>
      <button
        onclick={refreshData}
        class="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
      >
        <RefreshCw class="w-4 h-4" />
        Refresh
      </button>
    </div>
  </div>

  <!-- Live Stats - Responsive single card on narrow screens -->
  <Card class="p-0">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-border">
      <!-- Active Calls -->
      <div class="p-4 flex items-center gap-3">
        <div class="p-2 sm:p-3 bg-success/10 rounded-lg flex-shrink-0">
          <PhoneCall class="w-5 h-5 sm:w-6 sm:h-6 text-success {data.stats.activeCalls > 0 ? 'animate-pulse' : ''}" />
        </div>
        <div class="min-w-0">
          <p class="text-xl sm:text-2xl font-bold text-text-primary">{data.stats.activeCalls}</p>
          <p class="text-xs sm:text-sm text-text-secondary truncate">Active Calls</p>
        </div>
      </div>
      <!-- Calls Waiting -->
      <div class="p-4 flex items-center gap-3">
        <div class="p-2 sm:p-3 bg-warning/10 rounded-lg flex-shrink-0">
          <Clock class="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
        </div>
        <div class="min-w-0">
          <p class="text-xl sm:text-2xl font-bold text-text-primary">{data.stats.callsWaiting}</p>
          <p class="text-xs sm:text-sm text-text-secondary truncate">Waiting</p>
        </div>
      </div>
      <!-- Agents Available -->
      <div class="p-4 flex items-center gap-3">
        <div class="p-2 sm:p-3 bg-primary-500/10 rounded-lg flex-shrink-0">
          <Users class="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
        </div>
        <div class="min-w-0">
          <p class="text-xl sm:text-2xl font-bold text-text-primary">{data.stats.agentsAvailable}</p>
          <p class="text-xs sm:text-sm text-text-secondary truncate">Available</p>
        </div>
      </div>
      <!-- Agents Busy -->
      <div class="p-4 flex items-center gap-3">
        <div class="p-2 sm:p-3 bg-error/10 rounded-lg flex-shrink-0">
          <PhoneOff class="w-5 h-5 sm:w-6 sm:h-6 text-error" />
        </div>
        <div class="min-w-0">
          <p class="text-xl sm:text-2xl font-bold text-text-primary">{data.stats.agentsBusy}</p>
          <p class="text-xs sm:text-sm text-text-secondary truncate">Busy</p>
        </div>
      </div>
      <!-- Avg Wait -->
      <div class="p-4 flex items-center gap-3">
        <div class="p-2 sm:p-3 bg-purple-500/10 rounded-lg flex-shrink-0">
          <Activity class="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
        </div>
        <div class="min-w-0">
          <p class="text-xl sm:text-2xl font-bold font-mono text-text-primary">{formatDuration(data.stats.avgWaitTime)}</p>
          <p class="text-xs sm:text-sm text-text-secondary truncate">Avg Wait</p>
        </div>
      </div>
      <!-- Longest Wait -->
      <div class="p-4 flex items-center gap-3">
        <div class="p-2 sm:p-3 bg-red-500/10 rounded-lg flex-shrink-0">
          <Clock class="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
        </div>
        <div class="min-w-0">
          <p class="text-xl sm:text-2xl font-bold font-mono text-text-primary">{formatDuration(data.stats.longestWait)}</p>
          <p class="text-xs sm:text-sm text-text-secondary truncate">Max Wait</p>
        </div>
      </div>
    </div>
  </Card>

  <div class="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6">
    <!-- Active Calls -->
    <div class="xl:col-span-3 lg:col-span-2">
      <h2 class="text-lg font-semibold mb-4 text-text-primary">Active Calls</h2>
      {#if data.activeCalls.length > 0}
        <DataTable
          data={tableData}
          {columns}
          paginated
          pageSize={10}
          columnSelector
          onColumnsChange={handleColumnsChange}
          onRefresh={refreshData}
          emptyMessage="No active calls at the moment."
        >
          {#snippet cell(column, row)}
            {#if column.key === 'actions'}
              {#if data.canListenIn && row.status === 'connected'}
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    handleListenIn(row as unknown as ActiveCall);
                  }}
                  class="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded"
                  title="Listen In"
                >
                  <Headphones class="w-4 h-4" />
                </button>
              {:else}
                <span class="text-text-tertiary">—</span>
              {/if}
            {:else if column.key === 'status'}
              {@const statusInfo = getStatusBadge(row.status as ActiveCall['status'])}
              {@const StatusIcon = getStatusIcon(row.status as ActiveCall['status'])}
              <div class="flex items-center gap-2">
                <svelte:component
                  this={StatusIcon}
                  class="w-4 h-4 {row.status === 'connected' ? 'text-success' : row.status === 'ringing' ? 'text-warning' : 'text-primary-400'}"
                />
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
            {:else if column.key === 'direction'}
              <div class="flex items-center gap-1">
                {#if row.direction === 'inbound'}
                  <PhoneIncoming class="w-4 h-4 text-success" />
                  <span class="text-xs">In</span>
                {:else if row.direction === 'outbound'}
                  <PhoneOutgoing class="w-4 h-4 text-primary-400" />
                  <span class="text-xs">Out</span>
                {:else}
                  <ArrowRightLeft class="w-4 h-4 text-text-secondary" />
                  <span class="text-xs">Int</span>
                {/if}
              </div>
            {:else if column.key === 'fromNumber'}
              <span class="font-mono text-sm">{row.fromNumber || '—'}</span>
            {:else if column.key === 'fromUserName'}
              {#if row.fromUserName}
                <span class="text-sm">{row.fromUserName}</span>
              {:else}
                <span class="text-text-secondary text-sm">External</span>
              {/if}
            {:else if column.key === 'toNumber'}
              <span class="font-mono text-sm">{row.toNumber || '—'}</span>
            {:else if column.key === 'toUserName'}
              {#if row.toUserName}
                <span class="text-sm">{row.toUserName}</span>
              {:else}
                <span class="text-text-secondary text-sm">External</span>
              {/if}
            {:else if column.key === 'duration'}
              <span class="font-mono">{formatDuration(Number(row.duration))}</span>
            {:else if column.key === 'feature'}
              {#if row.feature}
                <Badge variant="neutral">{row.feature}</Badge>
              {:else}
                <span class="text-text-secondary">—</span>
              {/if}
            {:else}
              {row[column.key] ?? '—'}
            {/if}
          {/snippet}
        </DataTable>
      {:else}
        <div class="bg-surface-800 rounded-lg border border-surface-700 text-center py-12 text-text-secondary">
          <PhoneOff class="w-12 h-12 mx-auto mb-4 opacity-50" />
          {#if data.permissionError}
            <p>You don't have permission to view calls.</p>
            <p class="text-sm mt-2 text-text-tertiary">Contact your administrator to enable access.</p>
          {:else if !data.sapienConfigured}
            <p>Real-time call monitoring not configured.</p>
            <p class="text-sm mt-2 text-text-tertiary">SAPIEN_HOST environment variable is required.</p>
          {:else if data.sapienError}
            <p>Unable to retrieve call data.</p>
            <p class="text-sm mt-2 text-text-tertiary">{data.sapienError}</p>
          {:else}
            <p>No active calls at the moment.</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Agent Status -->
    <div>
      <Card>
        <h2 class="text-lg font-semibold mb-3 text-text-primary">Agent Status</h2>
        
        <!-- Agent Search -->
        {#if data.agents.length > 0}
          <div class="relative mb-3">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search agents..."
              bind:value={agentSearch}
              class="w-full pl-9 pr-3 py-2 text-sm bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        {/if}

        {#if data.agents.length > 0}
          <div class="space-y-2 max-h-80 overflow-y-auto">
            {#each filteredAgents as agent}
              {@const statusInfo = getAgentStatusBadge(agent.status)}
              <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-lg gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="p-1.5 rounded-full flex-shrink-0 {agent.status === 'available' ? 'bg-success/20' : agent.status === 'on_call' || agent.status === 'busy' ? 'bg-warning/20' : 'bg-gray-500/20'}">
                    <User class="w-3 h-3 {agent.status === 'available' ? 'text-success' : agent.status === 'on_call' || agent.status === 'busy' ? 'text-warning' : 'text-gray-500'}" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-sm text-text-primary truncate" title={agent.name}>{agent.name}</p>
                    <p class="text-xs text-text-secondary">Ext. {agent.extension || 'N/A'}</p>
                  </div>
                </div>
                <Badge variant={statusInfo.variant} class="text-xs flex-shrink-0">{statusInfo.label}</Badge>
              </div>
            {/each}
            {#if filteredAgents.length === 0 && agentSearch}
              <div class="text-center py-4 text-text-secondary">
                <p class="text-sm">No agents match "{agentSearch}"</p>
              </div>
            {/if}
          </div>
          <p class="text-xs text-text-tertiary mt-2 text-center">
            {filteredAgents.length} of {data.agents.length} agents
          </p>
        {:else}
          <div class="text-center py-8 text-text-secondary">
            <Users class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p class="text-sm">No CTI-enabled agents found.</p>
          </div>
        {/if}
      </Card>
    </div>
  </div>
</div>

<!-- Listen In Modal -->
{#if showListenInModal && listenInTarget}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={closeListenInModal}
      onkeydown={(e) => e.key === 'Escape' && closeListenInModal()}
      role="button"
      tabindex="0"
    ></div>

    <!-- Modal -->
    <div class="relative z-10 bg-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <div class="flex items-center gap-2">
          <Headphones class="w-5 h-5 text-primary-400" />
          <h2 class="text-lg font-semibold text-text-primary">Listen In</h2>
        </div>
        <button
          onclick={closeListenInModal}
          class="p-1 hover:bg-bg-tertiary rounded text-text-secondary hover:text-text-primary"
        >
          ✕
        </button>
      </div>

      <div class="p-4 space-y-4">
        <div class="bg-bg-primary rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-secondary">Call Direction</span>
            <Badge variant={listenInTarget.direction === 'inbound' ? 'success' : 'neutral'}>
              {listenInTarget.direction === 'inbound' ? 'Inbound' : listenInTarget.direction === 'outbound' ? 'Outbound' : 'Internal'}
            </Badge>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-secondary">From</span>
            <span class="text-sm font-mono">{listenInTarget.fromNumber}</span>
          </div>
          {#if listenInTarget.fromUserName}
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">From User</span>
              <span class="text-sm">{listenInTarget.fromUserName}</span>
            </div>
          {/if}
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-secondary">To</span>
            <span class="text-sm font-mono">{listenInTarget.toNumber}</span>
          </div>
          {#if listenInTarget.toUserName}
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">To User</span>
              <span class="text-sm">{listenInTarget.toUserName}</span>
            </div>
          {/if}
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-secondary">Duration</span>
            <span class="text-sm font-mono">{formatDuration(listenInTarget.duration)}</span>
          </div>
        </div>

        <div class="bg-warning/10 border border-warning/20 rounded-lg p-3">
          <p class="text-sm text-warning">
            <strong>Note:</strong> Listen In functionality requires a connected device. 
            Select your device to join this call in listen-only mode.
          </p>
        </div>

        <p class="text-xs text-text-tertiary text-center">
          Listen In API integration coming soon. This feature will allow you to silently monitor calls.
        </p>
      </div>

      <div class="flex justify-end gap-3 p-4 border-t border-border">
        <button
          onclick={closeListenInModal}
          class="px-4 py-2 text-sm bg-bg-primary border border-border rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          Cancel
        </button>
        <button
          disabled
          class="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg opacity-50 cursor-not-allowed"
          title="Listen In API not yet implemented"
        >
          <Headphones class="w-4 h-4 inline mr-1" />
          Listen In
        </button>
      </div>
    </div>
  </div>
{/if}

