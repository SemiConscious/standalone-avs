<script lang="ts">
  import { Button, Badge } from '$lib/components/ui';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
  import {
    Plus,
    Phone,
    Wifi,
    WifiOff,
    User,
    FlaskConical,
    AlertCircle,
    RefreshCw,
    Check,
    X,
    MapPin,
    Clock,
    Edit,
    Trash2,
  } from 'lucide-svelte';
  import type { Device } from './+page.server';

  interface Props {
    data: {
      devices: Device[];
      isDemo: boolean;
      totalCount: number;
      error?: string;
    };
  }

  let { data }: Props = $props();

  let isSyncing = $state(false);
  let isSyncingRegistration = $state(false);
  let syncMessage = $state('');
  let showDeleteConfirm = $state<string | null>(null);
  let typeFilter = $state('');
  let statusFilter = $state('');

  // Column definitions
  let columns = $state<Column[]>([
    { key: 'actions', label: '', width: '80px' },
    { key: 'extension', label: 'Extension', sortable: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'model', label: 'Model', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'assignedUserName', label: 'Assigned to User', sortable: true },
    { key: 'registered', label: 'Registered' },
    { key: 'enabled', label: 'Enabled' },
    { key: 'macAddress', label: 'MAC' },
    { key: 'lastModified', label: 'Last Modified', sortable: true },
  ]);

  // Filter devices based on type and status filters
  const filteredDevices = $derived(() => {
    return data.devices.filter((device) => {
      const matchesType = !typeFilter || device.type === typeFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'registered' && device.registered) ||
        (statusFilter === 'unregistered' && !device.registered) ||
        (statusFilter === 'enabled' && device.enabled) ||
        (statusFilter === 'disabled' && !device.enabled);

      return matchesType && matchesStatus;
    });
  });

  // Transform devices for the data table
  const tableData = $derived(
    filteredDevices().map((device) => ({
      ...device,
      id: device.id,
    }))
  );

  const deviceTypes = $derived([...new Set(data.devices.map((d) => d.type))].filter(Boolean).sort());

  async function handleSync() {
    isSyncing = true;
    syncMessage = 'Synchronizing devices...';

    try {
      const response = await fetch('?/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.ok) {
        syncMessage = 'Device sync completed successfully';
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        syncMessage = 'Device sync failed. Please try again.';
      }
    } catch (error) {
      syncMessage = 'Device sync failed. Please try again.';
    } finally {
      isSyncing = false;
    }
  }

  async function handleSyncRegistration() {
    isSyncingRegistration = true;
    syncMessage = 'Synchronizing registration status...';

    try {
      const response = await fetch('?/syncRegistration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.ok) {
        syncMessage = 'Registration status sync completed';
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        syncMessage = 'Registration sync failed. Please try again.';
      }
    } catch (error) {
      syncMessage = 'Registration sync failed. Please try again.';
    } finally {
      isSyncingRegistration = false;
    }
  }

  async function handleDelete(deviceId: string) {
    try {
      const formData = new FormData();
      formData.append('deviceId', deviceId);

      const response = await fetch('?/delete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete device');
      }
    } catch (error) {
      alert('Failed to delete device');
    } finally {
      showDeleteConfirm = null;
    }
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
  <title>Devices | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold text-text-primary">Devices</h1>
      <p class="text-text-secondary mt-1">
        Manage phones and softphones
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
      <Button
        variant="secondary"
        onclick={handleSyncRegistration}
        disabled={isSyncingRegistration || data.isDemo}
      >
        <Wifi class="w-4 h-4 {isSyncingRegistration ? 'animate-pulse' : ''}" />
        {isSyncingRegistration ? 'Syncing...' : 'Sync Registration'}
      </Button>
      <Button variant="primary" href="/devices/new">
        <Plus class="w-4 h-4" />
        New Device
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
      searchPlaceholder="Search by extension, description, location, model, user, or MAC..."
      paginated
      pageSize={15}
      columnSelector
      onColumnsChange={handleColumnsChange}
      onRefresh={handleRefresh}
      emptyMessage="No devices found"
    >
      {#snippet toolbar()}
        <select
          bind:value={typeFilter}
          class="px-3 py-2 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Types</option>
          {#each deviceTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
        <select
          bind:value={statusFilter}
          class="px-3 py-2 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="unregistered">Not Registered</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      {/snippet}

      {#snippet cell(column, row)}
        {#if column.key === 'actions'}
          <div class="flex items-center justify-end gap-1">
            <a href="/devices/{row.id}" class="text-text-primary hover:text-primary-300" title="Edit Device">
              <Edit class="w-3.5 h-3.5" />
            </a>
            {#if row.type !== 'Web Phone'}
              <span class="text-text-secondary">|</span>
              {#if showDeleteConfirm === row.id}
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    handleDelete(String(row.id));
                  }}
                  class="text-error hover:text-error/80 text-sm"
                >
                  Confirm
                </button>
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    showDeleteConfirm = null;
                  }}
                  class="text-text-secondary hover:text-text-primary text-sm"
                >
                  Cancel
                </button>
              {:else}
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    showDeleteConfirm = String(row.id);
                  }}
                  class="text-text-primary hover:text-primary-300"
                  title="Delete Device"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              {/if}
            {/if}
          </div>
        {:else if column.key === 'extension'}
          <a href="/devices/{row.id}" class="text-text-primary hover:text-primary-300 hover:underline font-mono">
            {row.extension || '—'}
          </a>
        {:else if column.key === 'location'}
          <span class="flex items-center gap-1">
            <MapPin class="w-3 h-3 text-text-secondary" />
            {row.location || '—'}
          </span>
        {:else if column.key === 'description'}
          {row.description || '—'}
        {:else if column.key === 'model'}
          {row.model || '—'}
        {:else if column.key === 'type'}
          <Badge variant="neutral">{row.type}</Badge>
        {:else if column.key === 'assignedUserName'}
          {#if row.assignedUserName}
            <a
              href="/users/{row.assignedUserId}"
              class="text-text-primary hover:text-primary-300 hover:underline flex items-center gap-1"
            >
              <User class="w-3 h-3" />
              {row.assignedUserName}
            </a>
          {:else}
            <span class="text-text-secondary">—</span>
          {/if}
        {:else if column.key === 'registered'}
          <div class="text-center">
            {#if row.registered}
              <div class="flex items-center gap-1 justify-center">
                <Wifi class="w-4 h-4 text-success" />
                <Check class="w-4 h-4 text-success" />
              </div>
            {:else}
              <WifiOff class="w-4 h-4 text-text-secondary mx-auto" />
            {/if}
          </div>
        {:else if column.key === 'enabled'}
          <div class="text-center">
            {#if row.enabled}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <X class="w-4 h-4 text-error mx-auto" />
            {/if}
          </div>
        {:else if column.key === 'macAddress'}
          <span class="font-mono text-sm">{row.macAddress || '—'}</span>
        {:else if column.key === 'lastModified'}
          <span class="text-sm text-text-secondary flex items-center gap-1">
            <Clock class="w-3 h-3" />
            {formatDate(String(row.lastModified))}
          </span>
        {:else}
          {row[column.key] ?? '—'}
        {/if}
      {/snippet}
    </DataTable>
  </div>
</div>
