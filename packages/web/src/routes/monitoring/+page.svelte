<script lang="ts">
  import { Card, Badge } from '$lib/components/ui';
  import {
    Monitor,
    Activity,
    Server,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    FlaskConical,
    AlertCircle,
    Clock,
    RefreshCw,
  } from 'lucide-svelte';
  import type { MonitoringPageData, ServiceStatus, SystemEvent } from './+page.server';

  interface Props {
    data: MonitoringPageData;
  }

  let { data }: Props = $props();

  function getStatusBadge(status: ServiceStatus['status']) {
    switch (status) {
      case 'operational':
        return { variant: 'success' as const, label: 'Operational' };
      case 'degraded':
        return { variant: 'warning' as const, label: 'Degraded' };
      case 'outage':
        return { variant: 'error' as const, label: 'Outage' };
    }
  }

  function getEventIcon(type: SystemEvent['type']) {
    switch (type) {
      case 'success':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return XCircle;
      default:
        return Activity;
    }
  }

  function getEventColor(type: SystemEvent['type']): string {
    switch (type) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'error':
        return 'text-error';
      default:
        return 'text-accent';
    }
  }

  function formatTimestamp(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 2) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  function refreshData() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Natterbox Monitoring | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Natterbox Monitoring</h1>
      <p class="text-text-secondary mt-1">System health and service status monitoring</p>
    </div>
    <button
      onclick={refreshData}
      class="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border rounded-base hover:bg-bg-tertiary transition-colors"
    >
      <RefreshCw class="w-4 h-4" />
      Refresh
    </button>
  </div>

  <!-- Overall Status -->
  {#if data.overallStatus === 'operational'}
    <Card class="border-success/50 bg-success/5">
      <div class="flex items-center gap-3">
        <CheckCircle2 class="w-8 h-8 text-success" />
        <div>
          <h2 class="text-lg font-semibold text-success">All Systems Operational</h2>
          <p class="text-text-secondary">All services are running normally</p>
        </div>
      </div>
    </Card>
  {:else if data.overallStatus === 'degraded'}
    <Card class="border-warning/50 bg-warning/5">
      <div class="flex items-center gap-3">
        <AlertTriangle class="w-8 h-8 text-warning" />
        <div>
          <h2 class="text-lg font-semibold text-warning">Partial System Degradation</h2>
          <p class="text-text-secondary">Some services are experiencing issues</p>
        </div>
      </div>
    </Card>
  {:else}
    <Card class="border-error/50 bg-error/5">
      <div class="flex items-center gap-3">
        <XCircle class="w-8 h-8 text-error" />
        <div>
          <h2 class="text-lg font-semibold text-error">System Outage</h2>
          <p class="text-text-secondary">Critical services are unavailable</p>
        </div>
      </div>
    </Card>
  {/if}

  <!-- Stats Summary -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-error/10 rounded-base">
          <XCircle class="w-6 h-6 text-error" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.errorCount24h}</p>
          <p class="text-sm text-text-secondary">Errors (24h)</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-warning/10 rounded-base">
          <AlertTriangle class="w-6 h-6 text-warning" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.warningCount24h}</p>
          <p class="text-sm text-text-secondary">Warnings (24h)</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Service Status -->
  <Card>
    <h2 class="text-lg font-semibold mb-4">Service Status</h2>
    {#if data.services.length > 0}
      <div class="space-y-3">
        {#each data.services as service}
          {@const statusInfo = getStatusBadge(service.status)}
          <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-base">
            <div class="flex items-center gap-3">
              <Server class="w-5 h-5 text-text-secondary" />
              <div>
                <span class="font-medium">{service.name}</span>
                {#if service.message}
                  <p class="text-xs text-text-secondary">{service.message}</p>
                {/if}
              </div>
            </div>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8 text-text-secondary">
        <p>No service status information available.</p>
      </div>
    {/if}
  </Card>

  <!-- Recent Events -->
  <Card>
    <h2 class="text-lg font-semibold mb-4">Recent Events</h2>
    {#if data.recentEvents.length > 0}
      <div class="space-y-2">
        {#each data.recentEvents as event}
          {@const EventIcon = getEventIcon(event.type)}
          <div class="flex items-start gap-3 p-3 hover:bg-bg-secondary rounded-base transition-colors">
            <EventIcon class="w-4 h-4 mt-0.5 {getEventColor(event.type)}" />
            <div class="flex-1">
              <p class="text-sm">{event.message}</p>
              <div class="flex items-center gap-2 text-xs text-text-secondary mt-1">
                <span>{event.source}</span>
                <span>•</span>
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8 text-text-secondary">
        <Activity class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No recent events.</p>
      </div>
    {/if}
  </Card>
</div>
