<script lang="ts">
  import { Card, Button, Badge } from '$lib/components/ui';
  import {
    ClipboardList,
    Download,
    Calendar,
    BarChart3,
    PieChart,
    TrendingUp,
    TrendingDown,
    FlaskConical,
    AlertCircle,
    Phone,
    PhoneIncoming,
    PhoneOutgoing,
    ArrowLeftRight,
  } from 'lucide-svelte';
  import type { CallReportingPageData, ReportType } from './+page.server';

  interface Props {
    data: CallReportingPageData;
  }

  let { data }: Props = $props();

  function getReportIcon(iconName: string) {
    switch (iconName) {
      case 'clipboard-list':
        return ClipboardList;
      case 'bar-chart-3':
        return BarChart3;
      case 'pie-chart':
        return PieChart;
      case 'trending-up':
        return TrendingUp;
      case 'calendar':
        return Calendar;
      case 'download':
        return Download;
      default:
        return ClipboardList;
    }
  }
</script>

<svelte:head>
  <title>Call Reporting | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold text-text-primary">Call Reporting</h1>
      <p class="text-text-secondary mt-1">Analytics and report generation for call data</p>
    </div>
    <div class="flex gap-2">
      <Button variant="primary" href="/call-reporting/export">
        <Download class="w-4 h-4 mr-2" />
        Export Data
      </Button>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-primary-500/10 rounded-base">
          <Phone class="w-6 h-6 text-text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-text-primary">{data.stats.totalCalls.toLocaleString()}</p>
          <p class="text-sm text-text-secondary">Total Calls (This Month)</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-success/10 rounded-base">
          {#if data.stats.changeFromLastMonth >= 0}
            <TrendingUp class="w-6 h-6 text-success" />
          {:else}
            <TrendingDown class="w-6 h-6 text-error" />
          {/if}
        </div>
        <div>
          <p class="text-2xl font-bold text-text-primary">
            {data.stats.changeFromLastMonth >= 0 ? '+' : ''}{data.stats.changeFromLastMonth}%
          </p>
          <p class="text-sm text-text-secondary">vs Last Month</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-warning/10 rounded-base">
          <PieChart class="w-6 h-6 text-warning" />
        </div>
        <div>
          <p class="text-2xl font-bold text-text-primary">{data.stats.avgDuration}</p>
          <p class="text-sm text-text-secondary">Avg Call Duration</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-accent/10 rounded-base">
          <ClipboardList class="w-6 h-6 text-text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold text-text-primary">{data.stats.answerRate}%</p>
          <p class="text-sm text-text-secondary">Answer Rate</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Call Distribution -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-success/10 rounded-base">
          <PhoneIncoming class="w-5 h-5 text-success" />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-secondary">Inbound</span>
            <span class="font-bold">{data.stats.inboundCalls.toLocaleString()}</span>
          </div>
          <div class="mt-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              class="h-full bg-success rounded-full"
              style="width: {data.stats.totalCalls > 0 ? (data.stats.inboundCalls / data.stats.totalCalls) * 100 : 0}%"
            ></div>
          </div>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-primary-500/10 rounded-base">
          <PhoneOutgoing class="w-5 h-5 text-text-primary" />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-secondary">Outbound</span>
            <span class="font-bold">{data.stats.outboundCalls.toLocaleString()}</span>
          </div>
          <div class="mt-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-500 rounded-full"
              style="width: {data.stats.totalCalls > 0 ? (data.stats.outboundCalls / data.stats.totalCalls) * 100 : 0}%"
            ></div>
          </div>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-accent/10 rounded-base">
          <ArrowLeftRight class="w-5 h-5 text-text-primary" />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <span class="text-sm text-text-secondary">Internal</span>
            <span class="font-bold">{data.stats.internalCalls.toLocaleString()}</span>
          </div>
          <div class="mt-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              class="h-full bg-purple-500 rounded-full"
              style="width: {data.stats.totalCalls > 0 ? (data.stats.internalCalls / data.stats.totalCalls) * 100 : 0}%"
            ></div>
          </div>
        </div>
      </div>
    </Card>
  </div>

  <!-- Report Types -->
  <Card>
    <h2 class="text-lg font-semibold text-text-primary mb-4">Available Reports</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each data.reportTypes as report}
        {@const ReportIcon = getReportIcon(report.icon)}
        {@const href = report.id === 'custom' ? '/call-reporting/export' : `/call-reporting/${report.id}`}
        {@const isDisabled = report.id === 'scheduled'}
        {#if isDisabled}
          <div
            class="p-4 border border-border rounded-base bg-bg-secondary/50 text-left opacity-60"
            title="Coming soon"
          >
            <ReportIcon class="w-6 h-6 text-text-secondary mb-2" />
            <h3 class="font-medium text-text-primary">{report.name}</h3>
            <p class="text-sm text-text-secondary">{report.description}</p>
            <p class="text-xs text-text-secondary mt-2 italic">Coming soon</p>
          </div>
        {:else}
          <a
            {href}
            class="p-4 border border-border rounded-base hover:border-primary-500/50 transition-colors text-left block"
          >
            <ReportIcon class="w-6 h-6 text-text-primary mb-2" />
            <h3 class="font-medium text-text-primary">{report.name}</h3>
            <p class="text-sm text-text-secondary">{report.description}</p>
          </a>
        {/if}
      {/each}
    </div>
  </Card>
</div>
