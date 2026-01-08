<script lang="ts">
  import { Card, Badge, Button } from '$lib/components/ui';
  import {
    ArrowLeft,
    Download,
    Phone,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Clock,
    Users,
    TrendingUp,
    BarChart3,
    PieChart,
    FlaskConical,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowLeftRight,
  } from 'lucide-svelte';
  import type { ReportPageData } from './+page.server';

  interface Props {
    data: ReportPageData;
  }

  let { data }: Props = $props();

  function formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  function formatShortDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function getDirectionIcon(direction: string) {
    switch (direction?.toLowerCase()) {
      case 'inbound': return ArrowDownLeft;
      case 'outbound': return ArrowUpRight;
      case 'internal': return ArrowLeftRight;
      default: return Phone;
    }
  }

  function getDirectionColor(direction: string): string {
    switch (direction?.toLowerCase()) {
      case 'inbound': return 'text-success';
      case 'outbound': return 'text-primary-400';
      case 'internal': return 'text-purple-400';
      default: return 'text-text-secondary';
    }
  }

  function exportToCSV() {
    // Build CSV content based on report type
    let csvContent = '';
    const report = data.report;

    if (report.reportType === 'summary' && report.recentCalls) {
      csvContent = 'Name,Date/Time,Direction,Duration,Result,Agent,Number\n';
      report.recentCalls.forEach(call => {
        csvContent += `${call.name},${call.dateTime},${call.direction},${formatDuration(call.duration)},${call.result},${call.agent},${call.number}\n`;
      });
    } else if (report.reportType === 'agent' && report.byAgent) {
      csvContent = 'Agent,Total Calls,Answered,Avg Duration,Answer Rate\n';
      report.byAgent.forEach(agent => {
        csvContent += `${agent.agentName},${agent.totalCalls},${agent.answered},${formatDuration(agent.avgDuration)},${agent.answerRate}%\n`;
      });
    } else if (report.reportType === 'queue' && report.byGroup) {
      csvContent = 'Queue,Total Calls,Answered,Avg Wait Time,Answer Rate\n';
      report.byGroup.forEach(group => {
        csvContent += `${group.groupName},${group.totalCalls},${group.answered},${group.avgWaitTime}s,${group.answerRate}%\n`;
      });
    } else if (report.reportType === 'trend' && report.trend) {
      csvContent = 'Date,Calls,Answered\n';
      report.trend.forEach(day => {
        csvContent += `${day.date},${day.calls},${day.answered}\n`;
      });
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Calculate max values for chart scaling
  const maxTrendCalls = $derived(
    data.report.trend ? Math.max(...data.report.trend.map(t => t.calls)) : 0
  );
  const maxHourCalls = $derived(
    data.report.byHour ? Math.max(...data.report.byHour.map(h => h.count)) : 0
  );
</script>

<svelte:head>
  <title>{data.report.reportName} | Call Reporting</title>
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
  <div class="flex items-start justify-between gap-4">
    <div>
      <nav class="text-sm text-text-secondary mb-2">
        <a href="/call-reporting" class="hover:text-primary-400 inline-flex items-center gap-1">
          <ArrowLeft class="w-4 h-4" />
          Back to Call Reporting
        </a>
      </nav>
      <h1 class="text-2xl font-bold text-text-primary">{data.report.reportName}</h1>
      <p class="text-text-secondary mt-1">{data.report.reportDescription}</p>
    </div>
    <div class="flex gap-2">
      <Badge variant="neutral">
        <Calendar class="w-3 h-3 mr-1" />
        {data.report.dateRange.label}
      </Badge>
      <Button variant="secondary" onclick={exportToCSV}>
        <Download class="w-4 h-4 mr-2" />
        Export CSV
      </Button>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    <Card>
      <div class="text-center">
        <Phone class="w-5 h-5 mx-auto text-primary-400 mb-1" />
        <p class="text-2xl font-bold text-text-primary">{data.report.summary.totalCalls.toLocaleString()}</p>
        <p class="text-xs text-text-secondary">Total Calls</p>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <PhoneIncoming class="w-5 h-5 mx-auto text-success mb-1" />
        <p class="text-2xl font-bold text-text-primary">{data.report.summary.answeredCalls.toLocaleString()}</p>
        <p class="text-xs text-text-secondary">Answered</p>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <PhoneMissed class="w-5 h-5 mx-auto text-error mb-1" />
        <p class="text-2xl font-bold text-text-primary">{data.report.summary.missedCalls.toLocaleString()}</p>
        <p class="text-xs text-text-secondary">Missed</p>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <Clock class="w-5 h-5 mx-auto text-warning mb-1" />
        <p class="text-2xl font-bold text-text-primary">{formatDuration(data.report.summary.avgDuration)}</p>
        <p class="text-xs text-text-secondary">Avg Duration</p>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <Clock class="w-5 h-5 mx-auto text-info mb-1" />
        <p class="text-2xl font-bold text-text-primary">{data.report.summary.avgWaitTime}s</p>
        <p class="text-xs text-text-secondary">Avg Wait</p>
      </div>
    </Card>
    <Card>
      <div class="text-center">
        <TrendingUp class="w-5 h-5 mx-auto text-success mb-1" />
        <p class="text-2xl font-bold text-text-primary">{data.report.summary.answerRate}%</p>
        <p class="text-xs text-text-secondary">Answer Rate</p>
      </div>
    </Card>
  </div>

  <!-- Direction Breakdown -->
  {#if data.report.byDirection && data.report.byDirection.length > 0}
    <Card>
      <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <PieChart class="w-5 h-5 text-primary-400" />
        Call Distribution by Direction
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each data.report.byDirection as item}
          {@const DirIcon = getDirectionIcon(item.direction)}
          <div class="p-4 bg-bg-secondary rounded-base">
            <div class="flex items-center justify-between mb-2">
              <span class="flex items-center gap-2">
                <DirIcon class="w-4 h-4 {getDirectionColor(item.direction)}" />
                <span class="text-text-primary font-medium">{item.direction}</span>
              </span>
              <span class="text-text-primary font-bold">{item.count.toLocaleString()}</span>
            </div>
            <div class="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full {item.direction === 'Inbound' ? 'bg-success' : item.direction === 'Outbound' ? 'bg-primary-500' : 'bg-purple-500'}"
                style="width: {item.percentage}%"
              ></div>
            </div>
            <p class="text-xs text-text-secondary mt-1">{item.percentage}% of total</p>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <!-- Agent Performance Table -->
  {#if data.report.reportType === 'agent' && data.report.byAgent}
    <Card>
      <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Users class="w-5 h-5 text-primary-400" />
        Agent Performance
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Agent</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Total Calls</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Answered</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Avg Duration</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Answer Rate</th>
            </tr>
          </thead>
          <tbody>
            {#each data.report.byAgent as agent}
              <tr class="border-b border-border hover:bg-bg-secondary">
                <td class="py-3 px-4 text-text-primary font-medium">{agent.agentName}</td>
                <td class="py-3 px-4 text-right text-text-primary">{agent.totalCalls.toLocaleString()}</td>
                <td class="py-3 px-4 text-right text-text-primary">{agent.answered.toLocaleString()}</td>
                <td class="py-3 px-4 text-right text-text-primary">{formatDuration(agent.avgDuration)}</td>
                <td class="py-3 px-4 text-right">
                  <Badge variant={agent.answerRate >= 95 ? 'success' : agent.answerRate >= 90 ? 'warning' : 'error'}>
                    {agent.answerRate}%
                  </Badge>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}

  <!-- Queue Analysis Table -->
  {#if data.report.reportType === 'queue' && data.report.byGroup}
    <Card>
      <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Users class="w-5 h-5 text-primary-400" />
        Queue Performance
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Queue</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Total Calls</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Answered</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Avg Wait Time</th>
              <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">Answer Rate</th>
            </tr>
          </thead>
          <tbody>
            {#each data.report.byGroup as group}
              <tr class="border-b border-border hover:bg-bg-secondary">
                <td class="py-3 px-4 text-text-primary font-medium">{group.groupName}</td>
                <td class="py-3 px-4 text-right text-text-primary">{group.totalCalls.toLocaleString()}</td>
                <td class="py-3 px-4 text-right text-text-primary">{group.answered.toLocaleString()}</td>
                <td class="py-3 px-4 text-right text-text-primary">{group.avgWaitTime}s</td>
                <td class="py-3 px-4 text-right">
                  <Badge variant={group.answerRate >= 95 ? 'success' : group.answerRate >= 90 ? 'warning' : 'error'}>
                    {group.answerRate}%
                  </Badge>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}

  <!-- Trend Charts -->
  {#if data.report.reportType === 'trend' && data.report.trend}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Daily Trend -->
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp class="w-5 h-5 text-primary-400" />
          Daily Call Volume
        </h2>
        <div class="h-48 flex items-end gap-1">
          {#each data.report.trend as day}
            <div class="flex-1 flex flex-col items-center group">
              <div 
                class="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-400"
                style="height: {maxTrendCalls > 0 ? (day.calls / maxTrendCalls) * 100 : 0}%"
                title="{day.date}: {day.calls} calls"
              ></div>
            </div>
          {/each}
        </div>
        <div class="flex justify-between mt-2 text-xs text-text-secondary">
          <span>{data.report.trend.length > 0 ? formatShortDate(data.report.trend[0].date) : ''}</span>
          <span>{data.report.trend.length > 0 ? formatShortDate(data.report.trend[data.report.trend.length - 1].date) : ''}</span>
        </div>
      </Card>

      <!-- Hourly Distribution -->
      {#if data.report.byHour}
        <Card>
          <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 class="w-5 h-5 text-primary-400" />
            Hourly Distribution
          </h2>
          <div class="h-48 flex items-end gap-1">
            {#each data.report.byHour as hour}
              <div class="flex-1 flex flex-col items-center">
                <div 
                  class="w-full bg-success rounded-t transition-all hover:bg-success/80"
                  style="height: {maxHourCalls > 0 ? (hour.count / maxHourCalls) * 100 : 0}%"
                  title="{hour.hour}:00 - {hour.count} calls"
                ></div>
              </div>
            {/each}
          </div>
          <div class="flex justify-between mt-2 text-xs text-text-secondary">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:00</span>
          </div>
        </Card>
      {/if}
    </div>

    <!-- Day of Week -->
    {#if data.report.byDay}
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Calendar class="w-5 h-5 text-primary-400" />
          Calls by Day of Week
        </h2>
        <div class="grid grid-cols-7 gap-2">
          {#each data.report.byDay as day}
            {@const maxDayCalls = Math.max(...data.report.byDay.map(d => d.count))}
            <div class="text-center">
              <div class="h-24 flex items-end justify-center mb-2">
                <div 
                  class="w-full max-w-12 bg-purple-500 rounded-t"
                  style="height: {maxDayCalls > 0 ? (day.count / maxDayCalls) * 100 : 0}%"
                ></div>
              </div>
              <p class="text-xs text-text-secondary">{day.day.slice(0, 3)}</p>
              <p class="text-sm font-medium text-text-primary">{day.count.toLocaleString()}</p>
            </div>
          {/each}
        </div>
      </Card>
    {/if}
  {/if}

  <!-- Recent Calls (Summary report) -->
  {#if data.report.reportType === 'summary' && data.report.recentCalls}
    <Card>
      <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Phone class="w-5 h-5 text-primary-400" />
        Recent Calls
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Call</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Date/Time</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Direction</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Duration</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Result</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Agent</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">Number</th>
            </tr>
          </thead>
          <tbody>
            {#each data.report.recentCalls as call}
              {@const DirIcon = getDirectionIcon(call.direction)}
              <tr class="border-b border-border hover:bg-bg-secondary">
                <td class="py-3 px-4 text-primary-400 font-medium">{call.name}</td>
                <td class="py-3 px-4 text-text-secondary text-sm">{formatDate(call.dateTime)}</td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center gap-1 {getDirectionColor(call.direction)}">
                    <DirIcon class="w-4 h-4" />
                    {call.direction}
                  </span>
                </td>
                <td class="py-3 px-4 text-text-primary">{formatDuration(call.duration)}</td>
                <td class="py-3 px-4">
                  <Badge variant={call.result === 'Answered' ? 'success' : call.result === 'Missed' ? 'error' : 'neutral'}>
                    {call.result}
                  </Badge>
                </td>
                <td class="py-3 px-4 text-text-primary">{call.agent}</td>
                <td class="py-3 px-4 text-text-secondary">{call.number}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
</div>
