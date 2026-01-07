<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import {
    Plus,
    Search,
    Users,
    Phone,
    Edit,
    Trash2,
    FlaskConical,
    AlertCircle,
    Check,
    X,
    ChevronDown,
    Columns,
    Mail,
    Clock,
    Headphones,
    Mic,
  } from 'lucide-svelte';
  import type { Group } from './+page.server';

  interface Props {
    data: {
      groups: Group[];
      isDemo: boolean;
      totalCount: number;
      error?: string;
    };
  }

  let { data }: Props = $props();

  let searchQuery = $state('');
  let showColumnSelector = $state(false);
  let showDeleteConfirm = $state<string | null>(null);

  // Column visibility state
  let columns = $state({
    name: true,
    email: true,
    extension: true,
    description: true,
    pbx: true,
    manager: true,
    record: true,
    lastModified: true,
  });

  const filteredGroups = $derived(
    data.groups.filter(
      (group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.extension.includes(searchQuery)
    )
  );

  const visibleColumnCount = $derived(
    Object.values(columns).filter(Boolean).length + 1 // +1 for actions
  );

  async function handleDelete(groupId: string) {
    try {
      const formData = new FormData();
      formData.append('groupId', groupId);

      const response = await fetch('?/delete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete group');
      }
    } catch (error) {
      alert('Failed to delete group');
    } finally {
      showDeleteConfirm = null;
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-GB');
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
  <title>Groups | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold">Groups</h1>
      <p class="text-text-secondary mt-1">
        Manage ring groups, queues, and hunt groups
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
  </div>

  <!-- Action Buttons -->
  <Card padding="sm">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="primary" href="/groups/new">
        <Plus class="w-4 h-4" />
        New Group
      </Button>

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
                name: 'Name',
                email: 'Email',
                extension: 'Extension',
                description: 'Description',
                pbx: 'PBX',
                manager: 'Manager',
                record: 'Record',
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

  <!-- Search -->
  <Card padding="sm">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <Input
        type="search"
        placeholder="Search by name, email, extension, or description..."
        class="pl-10"
        bind:value={searchQuery}
      />
    </div>
  </Card>

  <!-- Groups Table -->
  <Card padding="none">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            {#if columns.name}<th>Name</th>{/if}
            {#if columns.email}<th>Email</th>{/if}
            {#if columns.extension}<th>Extension</th>{/if}
            {#if columns.description}<th>Description</th>{/if}
            {#if columns.pbx}<th>PBX</th>{/if}
            {#if columns.manager}<th>Manager</th>{/if}
            {#if columns.record}<th>Record</th>{/if}
            {#if columns.lastModified}<th>Last Modified</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredGroups as group}
            <tr>
              <td>
                <div class="flex items-center gap-1">
                  <a href="/groups/{group.id}/edit" class="text-accent hover:underline text-sm">
                    Edit
                  </a>
                  <span class="text-text-secondary">|</span>
                  {#if showDeleteConfirm === group.id}
                    <button
                      onclick={() => handleDelete(group.id)}
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
                      onclick={() => (showDeleteConfirm = group.id)}
                      class="text-accent hover:underline text-sm"
                    >
                      Del
                    </button>
                  {/if}
                </div>
              </td>
              {#if columns.name}
                <td>
                  <a href="/groups/{group.id}" class="text-accent hover:underline font-medium">
                    {group.name}
                  </a>
                  {#if group.memberCount !== undefined}
                    <span class="text-text-secondary text-sm ml-1">({group.memberCount} members)</span>
                  {/if}
                </td>
              {/if}
              {#if columns.email}
                <td>
                  {#if group.email}
                    <a href="mailto:{group.email}" class="text-accent hover:underline flex items-center gap-1">
                      <Mail class="w-3 h-3" />
                      {group.email}
                    </a>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.extension}
                <td>
                  <span class="font-mono text-sm flex items-center gap-1">
                    <Phone class="w-3 h-3 text-text-secondary" />
                    {group.extension || '—'}
                  </span>
                </td>
              {/if}
              {#if columns.description}
                <td>
                  <span class="text-sm text-text-secondary">{group.description || '—'}</span>
                </td>
              {/if}
              {#if columns.pbx}
                <td class="text-center">
                  {#if group.pbx}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.manager}
                <td class="text-center">
                  {#if group.manager}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.record}
                <td class="text-center">
                  {#if group.record}
                    <Check class="w-4 h-4 text-success mx-auto" />
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.lastModified}
                <td>
                  <span class="text-sm text-text-secondary flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {formatDate(group.lastModified)}
                  </span>
                </td>
              {/if}
            </tr>
          {:else}
            <tr>
              <td colspan={visibleColumnCount} class="text-center py-8 text-text-secondary">
                {#if data.groups.length === 0}
                  No groups found.
                {:else}
                  No groups found matching your search.
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
        Showing {filteredGroups.length} of {data.totalCount} groups
      </p>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" disabled>Previous</Button>
        <Button variant="secondary" size="sm" disabled>Next</Button>
      </div>
    </div>
  </Card>
</div>
