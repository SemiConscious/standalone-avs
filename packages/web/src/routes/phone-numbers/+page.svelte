<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import {
    Search,
    Phone,
    User,
    Workflow,
    Edit,
    FlaskConical,
    AlertCircle,
    Plus,
    RefreshCw,
    Download,
    Check,
    X,
    ChevronDown,
    Columns,
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

  let searchQuery = $state('');
  let isSyncing = $state(false);
  let syncMessage = $state('');
  let showColumnSelector = $state(false);

  // Column visibility state
  let columns = $state({
    name: true,
    user: true,
    number: true,
    country: true,
    area: true,
    ddi: true,
    geographic: true,
    callFlow: true,
    localPresence: true,
    sms: false,
    mms: false,
    voice: false,
    lastModified: true,
  });

  const filteredNumbers = $derived(
    data.phoneNumbers.filter(
      (num) =>
        num.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        num.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        num.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        num.callFlowName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        num.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        num.area?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const visibleColumnCount = $derived(
    Object.values(columns).filter(Boolean).length + 1 // +1 for actions
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
        // Reload the page to get fresh data
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
    // Generate CSV from current data
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
  <title>Phone Numbers | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold">Phone Numbers</h1>
      <p class="text-text-secondary mt-1">
        Manage phone number assignments and routing
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
  </div>

  <!-- Action Buttons -->
  <Card padding="sm">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="primary" href="/phone-numbers/new">
        <Plus class="w-4 h-4" />
        New Phone Number
      </Button>
      
      <Button variant="secondary" onclick={handleSync} disabled={isSyncing || data.isDemo}>
        <RefreshCw class="w-4 h-4 {isSyncing ? 'animate-spin' : ''}" />
        {isSyncing ? 'Syncing...' : 'Sync'}
      </Button>
      
      <Button variant="secondary" onclick={handleExport}>
        <Download class="w-4 h-4" />
        Export
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
          <div class="absolute right-0 top-full mt-2 w-56 bg-bg-secondary border border-border rounded-base shadow-lg z-50 p-3">
            <p class="text-xs font-semibold text-text-secondary uppercase mb-2">Toggle Columns</p>
            <div class="space-y-1.5">
              {#each Object.entries({
                name: 'Name',
                user: 'User',
                number: 'Number',
                country: 'Country',
                area: 'Area',
                ddi: 'DDI Number',
                geographic: 'Geographic',
                callFlow: 'Call Flow',
                localPresence: 'Local Presence',
                sms: 'SMS',
                mms: 'MMS',
                voice: 'Voice',
                lastModified: 'Last Modified',
              }) as [key, label]}
                <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-bg-tertiary p-1 rounded">
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

  <!-- Search -->
  <Card padding="sm">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <Input
        type="search"
        placeholder="Search by name, number, user, call flow, country, or area..."
        class="pl-10"
        bind:value={searchQuery}
      />
    </div>
  </Card>

  <!-- Phone Numbers Table -->
  <Card padding="none">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            {#if columns.name}<th>Name</th>{/if}
            {#if columns.user}<th>User</th>{/if}
            {#if columns.number}<th>Number</th>{/if}
            {#if columns.country}<th>Country</th>{/if}
            {#if columns.area}<th>Area</th>{/if}
            {#if columns.ddi}<th>DDI</th>{/if}
            {#if columns.geographic}<th>Geographic</th>{/if}
            {#if columns.callFlow}<th>Call Flow</th>{/if}
            {#if columns.localPresence}<th>Local Presence</th>{/if}
            {#if columns.sms}<th>SMS</th>{/if}
            {#if columns.mms}<th>MMS</th>{/if}
            {#if columns.voice}<th>Voice</th>{/if}
            {#if columns.lastModified}<th>Last Modified</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredNumbers as number}
            <tr>
              <td>
                <a
                  href="/phone-numbers/{number.id}/edit"
                  class="text-accent hover:underline text-sm"
                >
                  Edit
                </a>
              </td>
              {#if columns.name}
                <td>
                  <a href="/phone-numbers/{number.id}" class="text-accent hover:underline font-medium">
                    {number.name || number.number}
                  </a>
                </td>
              {/if}
              {#if columns.user}
                <td>
                  {#if number.userName}
                    <a href="/users?id={number.userId}" class="text-accent hover:underline flex items-center gap-1">
                      <User class="w-3 h-3" />
                      {number.userName}
                    </a>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.number}
                <td>
                  <span class="font-mono text-sm">{number.formattedNumber || number.number}</span>
                </td>
              {/if}
              {#if columns.country}
                <td>
                  <span class="flex items-center gap-1">
                    <Globe class="w-3 h-3 text-text-secondary" />
                    {number.country || '—'}
                  </span>
                </td>
              {/if}
              {#if columns.area}
                <td>
                  <span class="flex items-center gap-1">
                    <MapPin class="w-3 h-3 text-text-secondary" />
                    {number.area || '—'}
                  </span>
                </td>
              {/if}
              {#if columns.ddi}
                <td class="text-center">
                  {#if number.isDDI}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.geographic}
                <td class="text-center">
                  {#if number.isGeographic}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.callFlow}
                <td>
                  {#if number.callFlowName}
                    <a href="/routing-policies?id={number.callFlowId}" class="text-accent hover:underline flex items-center gap-1">
                      <Workflow class="w-3 h-3" />
                      {number.callFlowName}
                    </a>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.localPresence}
                <td class="text-center">
                  {#if number.localPresenceEnabled}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.sms}
                <td class="text-center">
                  {#if number.smsEnabled}
                    <Badge variant="success" size="sm">
                      <MessageSquare class="w-3 h-3 mr-1" />
                      SMS
                    </Badge>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.mms}
                <td class="text-center">
                  {#if number.mmsEnabled}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.voice}
                <td class="text-center">
                  {#if number.voiceEnabled}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.lastModified}
                <td>
                  <span class="text-sm text-text-secondary">{formatDate(number.lastModified)}</span>
                </td>
              {/if}
            </tr>
          {:else}
            <tr>
              <td colspan={visibleColumnCount} class="text-center py-8 text-text-secondary">
                {#if data.phoneNumbers.length === 0}
                  No phone numbers found.
                {:else}
                  No phone numbers found matching your search.
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
        Showing {filteredNumbers.length} of {data.totalCount} phone numbers
      </p>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" disabled>Previous</Button>
        <Button variant="secondary" size="sm" disabled>Next</Button>
      </div>
    </div>
  </Card>
</div>

