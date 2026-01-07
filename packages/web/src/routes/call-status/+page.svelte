<script lang="ts">
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
  } from 'lucide-svelte';
  import type { CallStatusPageData, ActiveCall, AgentStatus } from './+page.server';

  interface Props {
    data: CallStatusPageData;
  }

  let { data }: Props = $props();

  // Column definitions for active calls table
  let columns = $state<Column[]>([
    { key: 'status', label: 'Status' },
    { key: 'direction', label: 'Direction' },
    { key: 'fromNumber', label: 'From' },
    { key: 'toNumber', label: 'To' },
    { key: 'agentName', label: 'Agent', sortable: true },
    { key: 'duration', label: 'Duration', sortable: true },
    { key: 'queueName', label: 'Queue' },
  ]);

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

  function refreshData() {
    window.location.reload();
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
  {:else if data.usingSapien}
    <div class="bg-success/10 border border-success/20 text-success rounded-lg p-4 flex items-center gap-3">
      <CheckCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Connected to Sapien API - showing real-time call data.</p>
    </div>
  {:else if data.sapienError}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">{data.sapienError}. Showing agent data from Salesforce.</p>
    </div>
  {:else if !data.error}
    <div class="bg-accent/10 border border-accent/20 text-accent rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Configure SAPIEN_HOST for real-time call data. Showing agent statuses from Salesforce.</p>
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
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Call Status</h1>
      <p class="text-text-secondary mt-1">Real-time call monitoring dashboard</p>
    </div>
    <button
      onclick={refreshData}
      class="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
    >
      <RefreshCw class="w-4 h-4" />
      Refresh
    </button>
  </div>

  <!-- Live Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-success/10 rounded-lg">
          <PhoneCall class="w-6 h-6 text-success {data.stats.activeCalls > 0 ? 'animate-pulse' : ''}" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.activeCalls}</p>
          <p class="text-sm text-text-secondary">Active Calls</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-warning/10 rounded-lg">
          <Clock class="w-6 h-6 text-warning" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.callsWaiting}</p>
          <p class="text-sm text-text-secondary">Calls Waiting</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-accent/10 rounded-lg">
          <Users class="w-6 h-6 text-accent" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.agentsAvailable}</p>
          <p class="text-sm text-text-secondary">Agents Available</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-error/10 rounded-lg">
          <PhoneOff class="w-6 h-6 text-error" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.agentsBusy}</p>
          <p class="text-sm text-text-secondary">Agents Busy</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-500/10 rounded-lg">
          <Activity class="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <p class="text-2xl font-bold">{formatDuration(data.stats.avgWaitTime)}</p>
          <p class="text-sm text-text-secondary">Avg Wait Time</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-red-500/10 rounded-lg">
          <Clock class="w-6 h-6 text-red-500" />
        </div>
        <div>
          <p class="text-2xl font-bold">{formatDuration(data.stats.longestWait)}</p>
          <p class="text-sm text-text-secondary">Longest Wait</p>
        </div>
      </div>
    </Card>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <!-- Active Calls -->
    <div class="lg:col-span-3">
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
            {#if column.key === 'status'}
              {@const statusInfo = getStatusBadge(row.status as ActiveCall['status'])}
              {@const StatusIcon = getStatusIcon(row.status as ActiveCall['status'])}
              <div class="flex items-center gap-2">
                <svelte:component
                  this={StatusIcon}
                  class="w-4 h-4 {row.status === 'connected' ? 'text-success' : row.status === 'ringing' ? 'text-warning' : 'text-accent'}"
                />
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
            {:else if column.key === 'direction'}
              <div class="flex items-center gap-1">
                {#if row.direction === 'inbound'}
                  <PhoneIncoming class="w-4 h-4 text-success" />
                  <span class="text-xs">In</span>
                {:else if row.direction === 'outbound'}
                  <PhoneOutgoing class="w-4 h-4 text-accent" />
                  <span class="text-xs">Out</span>
                {:else}
                  <ArrowRightLeft class="w-4 h-4 text-text-secondary" />
                  <span class="text-xs">Int</span>
                {/if}
              </div>
            {:else if column.key === 'fromNumber'}
              <span class="font-mono text-sm">{row.fromNumber}</span>
            {:else if column.key === 'toNumber'}
              <span class="font-mono text-sm">{row.toNumber}</span>
            {:else if column.key === 'agentName'}
              {#if row.agentName}
                <div>
                  <p class="font-medium">{row.agentName}</p>
                  <p class="text-xs text-text-secondary">Ext. {row.agentExtension}</p>
                </div>
              {:else}
                <span class="text-text-secondary">—</span>
              {/if}
            {:else if column.key === 'duration'}
              <span class="font-mono">{formatDuration(Number(row.duration))}</span>
            {:else if column.key === 'queueName'}
              {#if row.queueName}
                <Badge variant="neutral">{row.queueName}</Badge>
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
          <p>No active calls at the moment.</p>
          {#if !data.isDemo && !data.usingSapien}
            <p class="text-sm mt-2">Configure SAPIEN_HOST for real-time call monitoring.</p>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Agent Status -->
    <div>
      <Card>
        <h2 class="text-lg font-semibold mb-4">Agent Status</h2>
        {#if data.agents.length > 0}
          <div class="space-y-2 max-h-96 overflow-y-auto">
            {#each data.agents as agent}
              {@const statusInfo = getAgentStatusBadge(agent.status)}
              <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="p-1.5 rounded-full {agent.status === 'available' ? 'bg-success/20' : agent.status === 'on_call' || agent.status === 'busy' ? 'bg-warning/20' : 'bg-gray-500/20'}">
                    <User class="w-3 h-3 {agent.status === 'available' ? 'text-success' : agent.status === 'on_call' || agent.status === 'busy' ? 'text-warning' : 'text-gray-500'}" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-sm truncate">{agent.name}</p>
                    <p class="text-xs text-text-secondary">Ext. {agent.extension || 'N/A'}</p>
                  </div>
                </div>
                <Badge variant={statusInfo.variant} class="text-xs flex-shrink-0">{statusInfo.label}</Badge>
              </div>
            {/each}
          </div>
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
