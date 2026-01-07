<script lang="ts">
  import { Button, Badge } from '$lib/components/ui';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
  import {
    Plus,
    Phone,
    FlaskConical,
    AlertCircle,
    Check,
    Mail,
    Clock,
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

  let showDeleteConfirm = $state<string | null>(null);

  // Column definitions
  let columns = $state<Column[]>([
    { key: 'actions', label: 'Action', width: '120px' },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'extension', label: 'Extension', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'pbx', label: 'PBX' },
    { key: 'manager', label: 'Manager' },
    { key: 'record', label: 'Record' },
    { key: 'lastModified', label: 'Last Modified', sortable: true },
  ]);

  // Transform groups for the data table
  const tableData = $derived(
    data.groups.map((group) => ({
      ...group,
      id: group.id,
    }))
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

  function handleColumnsChange(updatedColumns: Column[]) {
    columns = updatedColumns;
  }

  function handleRefresh() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Groups | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold text-text-primary">Groups</h1>
      <p class="text-text-secondary mt-1">
        Manage ring groups, queues, and hunt groups
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
    <Button variant="primary" href="/groups/new">
      <Plus class="w-4 h-4" />
      New Group
    </Button>
  </div>

  <!-- Data Table -->
  <div class="flex-1 min-h-0">
    <DataTable
      data={tableData}
      {columns}
      searchable
      searchPlaceholder="Search by name, email, extension, or description..."
      paginated
      pageSize={15}
      columnSelector
      onColumnsChange={handleColumnsChange}
      onRefresh={handleRefresh}
      emptyMessage="No groups found"
    >
      {#snippet cell(column, row)}
        {#if column.key === 'actions'}
          <div class="flex items-center gap-1">
            <a href="/groups/{row.id}/edit" class="text-accent hover:underline text-sm">
              Edit
            </a>
            <span class="text-text-secondary">|</span>
            {#if showDeleteConfirm === row.id}
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  handleDelete(String(row.id));
                }}
                class="text-error hover:underline text-sm"
              >
                Confirm
              </button>
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  showDeleteConfirm = null;
                }}
                class="text-text-secondary hover:underline text-sm"
              >
                Cancel
              </button>
            {:else}
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  showDeleteConfirm = String(row.id);
                }}
                class="text-accent hover:underline text-sm"
              >
                Del
              </button>
            {/if}
          </div>
        {:else if column.key === 'name'}
          <a href="/groups/{row.id}" class="text-accent hover:underline font-medium">
            {row.name}
          </a>
          {#if row.memberCount !== undefined}
            <span class="text-text-secondary text-sm ml-1">({row.memberCount} members)</span>
          {/if}
        {:else if column.key === 'email'}
          {#if row.email}
            <a href="mailto:{row.email}" class="text-accent hover:underline flex items-center gap-1">
              <Mail class="w-3 h-3" />
              {row.email}
            </a>
          {:else}
            <span class="text-text-secondary">—</span>
          {/if}
        {:else if column.key === 'extension'}
          <span class="font-mono text-sm flex items-center gap-1">
            <Phone class="w-3 h-3 text-text-secondary" />
            {row.extension || '—'}
          </span>
        {:else if column.key === 'description'}
          <span class="text-sm text-text-secondary">{row.description || '—'}</span>
        {:else if column.key === 'pbx'}
          <div class="text-center">
            {#if row.pbx}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'manager'}
          <div class="text-center">
            {#if row.manager}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else if column.key === 'record'}
          <div class="text-center">
            {#if row.record}
              <Check class="w-4 h-4 text-success mx-auto" />
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
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
