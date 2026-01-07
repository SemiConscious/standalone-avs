<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import {
    Plus,
    Search,
    Phone,
    Wifi,
    WifiOff,
    User,
    Edit,
    Trash2,
    FlaskConical,
    AlertCircle,
    RefreshCw,
    Check,
    X,
    ChevronDown,
    Columns,
    MapPin,
    Clock,
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

  let searchQuery = $state('');
  let isSyncing = $state(false);
  let isSyncingRegistration = $state(false);
  let syncMessage = $state('');
  let showColumnSelector = $state(false);
  let typeFilter = $state('');
  let statusFilter = $state('');
  let showDeleteConfirm = $state<string | null>(null);

  // Column visibility state
  let columns = $state({
    extension: true,
    location: true,
    description: true,
    model: true,
    type: true,
    assignedUser: true,
    registered: true,
    enabled: true,
    mac: true,
    lastModified: true,
  });

  const filteredDevices = $derived(
    data.devices.filter((device) => {
      const matchesSearch =
        device.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.assignedUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.macAddress.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = !typeFilter || device.type === typeFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'registered' && device.registered) ||
        (statusFilter === 'unregistered' && !device.registered) ||
        (statusFilter === 'enabled' && device.enabled) ||
        (statusFilter === 'disabled' && !device.enabled);

      return matchesSearch && matchesType && matchesStatus;
    })
  );

  const visibleColumnCount = $derived(
    Object.values(columns).filter(Boolean).length + 1 // +1 for actions
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

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.column-selector-container')) {
      showColumnSelector = false;
    }
  }

  $effect(() => {
    if (showColumnSelector) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<svelte:head>
  <title>Devices | Natterbox AVS</title>
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
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Devices</h1>
      <p class="text-text-secondary mt-1">
        Manage phones and softphones
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
  </div>

  <!-- Action Buttons -->
  <Card padding="sm">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="primary" href="/devices/new">
        <Plus class="w-4 h-4" />
        New Device
      </Button>

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
        {isSyncingRegistration ? 'Syncing...' : 'Sync Registration Status'}
      </Button>

      {#if syncMessage}
        <span class="text-sm text-text-secondary">{syncMessage}</span>
      {/if}

      <div class="flex-1"></div>

      <!-- Column Selector -->
      <div class="column-selector-container relative">
        <Button
          variant="ghost"
          size="sm"
          onclick={() => (showColumnSelector = !showColumnSelector)}
        >
          <Columns class="w-4 h-4" />
          Columns
          <ChevronDown class="w-3 h-3" />
        </Button>

        {#if showColumnSelector}
          <div
            class="absolute right-0 top-full mt-2 w-56 bg-bg-secondary border border-border rounded-base shadow-lg z-50 p-3"
          >
            <p class="text-xs font-semibold text-text-secondary uppercase mb-2">Toggle Columns</p>
            <div class="space-y-1.5">
              {#each Object.entries({
                extension: 'Extension',
                location: 'Location',
                description: 'Description',
                model: 'Model',
                type: 'Type',
                assignedUser: 'Assigned to User',
                registered: 'Registered',
                enabled: 'Enabled',
                mac: 'MAC Address',
                lastModified: 'Last Modified',
              }) as [key, label]}
                <label
                  class="flex items-center gap-2 text-sm cursor-pointer hover:bg-bg-tertiary p-1 rounded"
                >
                  <input
                    type="checkbox"
                    bind:checked={columns[key as keyof typeof columns]}
                    class="rounded border-border"
                  />
                  {label}
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </Card>

  <!-- Search and Filters -->
  <Card padding="sm">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <Input
          type="search"
          placeholder="Search by extension, description, location, model, user, or MAC..."
          class="pl-10"
          bind:value={searchQuery}
        />
      </div>
      <div class="flex gap-2">
        <select
          bind:value={typeFilter}
          class="px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
        >
          <option value="">All Types</option>
          {#each deviceTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
        <select
          bind:value={statusFilter}
          class="px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="unregistered">Not Registered</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
    </div>
  </Card>

  <!-- Devices Table -->
  <Card padding="none">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            {#if columns.extension}<th>Extension</th>{/if}
            {#if columns.location}<th>Location</th>{/if}
            {#if columns.description}<th>Description</th>{/if}
            {#if columns.model}<th>Model</th>{/if}
            {#if columns.type}<th>Type</th>{/if}
            {#if columns.assignedUser}<th>Assigned to User</th>{/if}
            {#if columns.registered}<th>Registered</th>{/if}
            {#if columns.enabled}<th>Enabled</th>{/if}
            {#if columns.mac}<th>MAC</th>{/if}
            {#if columns.lastModified}<th>Last Modified</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredDevices as device}
            <tr>
              <td>
                <div class="flex items-center gap-1">
                  <a href="/devices/{device.id}/edit" class="text-accent hover:underline text-sm">
                    Edit
                  </a>
                  {#if device.type !== 'Web Phone'}
                    <span class="text-text-secondary">|</span>
                    {#if showDeleteConfirm === device.id}
                      <button
                        onclick={() => handleDelete(device.id)}
                        class="text-error hover:underline text-sm"
                      >
                        Confirm
                      </button>
                      <button
                        onclick={() => (showDeleteConfirm = null)}
                        class="text-text-secondary hover:underline text-sm"
                      >
                        Cancel
                      </button>
                    {:else}
                      <button
                        onclick={() => (showDeleteConfirm = device.id)}
                        class="text-accent hover:underline text-sm"
                      >
                        Del
                      </button>
                    {/if}
                  {/if}
                </div>
              </td>
              {#if columns.extension}
                <td>
                  <a href="/devices/{device.id}" class="text-accent hover:underline font-mono">
                    {device.extension || '—'}
                  </a>
                </td>
              {/if}
              {#if columns.location}
                <td>
                  <span class="flex items-center gap-1">
                    <MapPin class="w-3 h-3 text-text-secondary" />
                    {device.location || '—'}
                  </span>
                </td>
              {/if}
              {#if columns.description}
                <td>{device.description || '—'}</td>
              {/if}
              {#if columns.model}
                <td>{device.model || '—'}</td>
              {/if}
              {#if columns.type}
                <td>
                  <Badge variant="neutral">{device.type}</Badge>
                </td>
              {/if}
              {#if columns.assignedUser}
                <td>
                  {#if device.assignedUserName}
                    <a
                      href="/users?id={device.assignedUserId}"
                      class="text-accent hover:underline flex items-center gap-1"
                    >
                      <User class="w-3 h-3" />
                      {device.assignedUserName}
                    </a>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.registered}
                <td class="text-center">
                  {#if device.registered}
                    <div class="flex items-center gap-1 justify-center">
                      <Wifi class="w-4 h-4 text-success" />
                      <Check class="w-4 h-4 text-success" />
                    </div>
                  {:else}
                    <WifiOff class="w-4 h-4 text-text-secondary mx-auto" />
                  {/if}
                </td>
              {/if}
              {#if columns.enabled}
                <td class="text-center">
                  {#if device.enabled}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <X class="w-4 h-4 text-error mx-auto" />
                  {/if}
                </td>
              {/if}
              {#if columns.mac}
                <td>
                  <span class="font-mono text-sm">{device.macAddress || '—'}</span>
                </td>
              {/if}
              {#if columns.lastModified}
                <td>
                  <span class="text-sm text-text-secondary flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {formatDate(device.lastModified)}
                  </span>
                </td>
              {/if}
            </tr>
          {:else}
            <tr>
              <td colspan={visibleColumnCount} class="text-center py-8 text-text-secondary">
                {#if data.devices.length === 0}
                  No devices found.
                {:else}
                  No devices found matching your search.
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="border-t border-border px-4 py-3 flex items-center justify-between">
      <p class="text-sm text-text-secondary">
        Showing {filteredDevices.length} of {data.totalCount} devices
      </p>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" disabled>Previous</Button>
        <Button variant="secondary" size="sm" disabled>Next</Button>
      </div>
    </div>
  </Card>
</div>
