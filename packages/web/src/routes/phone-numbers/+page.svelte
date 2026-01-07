<script lang="ts">
  import { Button, Badge } from '$lib/components/ui';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
  import {
    User,
    Workflow,
    FlaskConical,
    AlertCircle,
    Plus,
    RefreshCw,
    Download,
    Check,
    MessageSquare,
    MapPin,
    Globe,
  } from 'lucide-svelte';
  import type { PhoneNumber } from './+page.server';

  interface Props {
    data: {
      phoneNumbers: PhoneNumber[];
      isDemo: boolean;
      totalCount: number;
      error?: string;
    };
  }

  let { data }: Props = $props();

  let isSyncing = $state(false);
  let syncMessage = $state('');

  // Column definitions
  let columns = $state<Column[]>([
    { key: 'actions', label: 'Action', width: '80px' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'userName', label: 'User', sortable: true },
    { key: 'number', label: 'Number', sortable: true },
    { key: 'country', label: 'Country', sortable: true },
    { key: 'area', label: 'Area', sortable: true },
    { key: 'isDDI', label: 'DDI' },
    { key: 'isGeographic', label: 'Geographic' },
    { key: 'callFlowName', label: 'Call Flow', sortable: true },
    { key: 'localPresenceEnabled', label: 'Local Presence' },
    { key: 'smsEnabled', label: 'SMS', visible: false },
    { key: 'mmsEnabled', label: 'MMS', visible: false },
    { key: 'voiceEnabled', label: 'Voice', visible: false },
    { key: 'lastModified', label: 'Last Modified', sortable: true },
  ]);

  // Transform phone numbers for the data table
  const tableData = $derived(
    data.phoneNumbers.map((pn) => ({
      ...pn,
      id: pn.id,
    }))
  );

  async function handleSync() {
    isSyncing = true;
    syncMessage = 'Synchronizing phone numbers...';

    try {
      const response = await fetch('?/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.ok) {
        syncMessage = 'Sync completed successfully';
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        syncMessage = 'Sync failed. Please try again.';
      }
    } catch (error) {
      syncMessage = 'Sync failed. Please try again.';
    } finally {
      isSyncing = false;
    }
  }

  function handleExport() {
    const headers = [
      'Name',
      'Number',
      'User',
      'Country',
      'Area',
      'DDI',
      'Geographic',
      'Call Flow',
      'Local Presence',
      'SMS',
      'MMS',
      'Voice',
      'Last Modified',
    ];

    const rows = data.phoneNumbers.map((num) => [
      num.name,
      num.number,
      num.userName || '',
      num.country,
      num.area,
      num.isDDI ? 'Yes' : 'No',
      num.isGeographic ? 'Yes' : 'No',
      num.callFlowName || '',
      num.localPresenceEnabled ? 'Yes' : 'No',
      num.smsEnabled ? 'Yes' : 'No',
      num.mmsEnabled ? 'Yes' : 'No',
      num.voiceEnabled ? 'Yes' : 'No',
      num.lastModified,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phone-numbers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  }

  function handleColumnsChange(updatedColumns: Column[]) {
    columns = updatedColumns;
  }

  function handleRefresh() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Phone Numbers | Natterbox AVS</title>
</svelte:head>

<div class="flex flex-col gap-6 h-full min-h-0">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div
      class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-4 flex items-center gap-3 flex-shrink-0"
    >
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div
      class="bg-error/10 border border-error/20 text-error rounded-lg p-4 flex items-center gap-3 flex-shrink-0"
    >
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between flex-shrink-0">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Phone Numbers</h1>
      <p class="text-text-secondary mt-1">
        Manage phone number assignments and routing
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="secondary" onclick={handleSync} disabled={isSyncing || data.isDemo}>
        <RefreshCw class="w-4 h-4 {isSyncing ? 'animate-spin' : ''}" />
        {isSyncing ? 'Syncing...' : 'Sync'}
      </Button>
      <Button variant="secondary" onclick={handleExport}>
        <Download class="w-4 h-4" />
        Export
      </Button>
      <Button variant="primary" href="/phone-numbers/new">
        <Plus class="w-4 h-4" />
        New Phone Number
      </Button>
    </div>
  </div>

  {#if syncMessage}
    <div class="text-sm text-text-secondary flex-shrink-0">{syncMessage}</div>
  {/if}

  <!-- Data Table -->
  <div class="flex-1 min-h-0">
    <DataTable
      data={tableData}
      {columns}
      searchable
      searchPlaceholder="Search by name, number, user, call flow, country, or area..."
      paginated
      pageSize={15}
      columnSelector
      onColumnsChange={handleColumnsChange}
      onRefresh={handleRefresh}
      emptyMessage="No phone numbers found"
    >
      {#snippet cell(column, row)}
        {#if column.key === 'actions'}
          <a
            href="/phone-numbers/{row.id}/edit"
            class="text-accent hover:underline text-sm"
          >
            Edit
          </a>
        {:else if column.key === 'name'}
          <a href="/phone-numbers/{row.id}" class="text-accent hover:underline font-medium">
            {row.name || row.number}
          </a>
        {:else if column.key === 'userName'}
          {#if row.userName}
            <a href="/users?id={row.userId}" class="text-accent hover:underline flex items-center gap-1">
              <User class="w-3 h-3" />
              {row.userName}
            </a>
          {:else}
            <span class="text-text-secondary">—</span>
          {/if}
        {:else if column.key === 'number'}
          <span class="font-mono text-sm">{row.formattedNumber || row.number}</span>
        {:else if column.key === 'country'}
          <span class="flex items-center gap-1">
            <Globe class="w-3 h-3 text-text-secondary" />
            {row.country || '—'}
          </span>
        {:else if column.key === 'area'}
          <span class="flex items-center gap-1">
            <MapPin class="w-3 h-3 text-text-secondary" />
            {row.area || '—'}
          </span>
        {:else if column.key === 'isDDI'}
          <div class="text-center">
            {#if row.isDDI}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'isGeographic'}
          <div class="text-center">
            {#if row.isGeographic}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'callFlowName'}
          {#if row.callFlowName}
            <a href="/routing-policies?id={row.callFlowId}" class="text-accent hover:underline flex items-center gap-1">
              <Workflow class="w-3 h-3" />
              {row.callFlowName}
            </a>
          {:else}
            <span class="text-text-secondary">—</span>
          {/if}
        {:else if column.key === 'localPresenceEnabled'}
          <div class="text-center">
            {#if row.localPresenceEnabled}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'smsEnabled'}
          <div class="text-center">
            {#if row.smsEnabled}
              <Badge variant="success" size="sm">
                <MessageSquare class="w-3 h-3 mr-1" />
                SMS
              </Badge>
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'mmsEnabled'}
          <div class="text-center">
            {#if row.mmsEnabled}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'voiceEnabled'}
          <div class="text-center">
            {#if row.voiceEnabled}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'lastModified'}
          <span class="text-sm text-text-secondary">{formatDate(String(row.lastModified))}</span>
        {:else}
          {row[column.key] ?? '—'}
        {/if}
      {/snippet}
    </DataTable>
  </div>
</div>
