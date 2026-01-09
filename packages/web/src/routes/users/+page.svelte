<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { Button, Badge } from '$lib/components/ui';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
  import { toasts } from '$lib/stores/toast';
  import {
    Plus,
    Edit,
    Trash2,
    FlaskConical,
    AlertCircle,
    RefreshCw,
    Shield,
    Headphones,
    Monitor,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Phone,
    Eye,
  } from 'lucide-svelte';
  import type { User } from './+page.server';
  import type { PaginationMeta } from '$lib/server/pagination';

  interface Props {
    data: {
      users: User[];
      pagination: PaginationMeta;
      isDemo: boolean;
      error?: string;
    };
    form?: {
      success?: boolean;
      error?: string;
      message?: string;
    };
  }

  let { data, form }: Props = $props();

  // Get current filter from URL
  const currentStatus = $derived($page.url.searchParams.get('status') || '');
  const currentSearch = $derived($page.url.searchParams.get('search') || '');

  // Column definitions
  let columns = $state<Column[]>([
    { key: 'user', label: 'User', sortable: true },
    { key: 'extension', label: 'Extension', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'permissionLevel', label: 'Permission' },
    { key: 'licenses', label: 'Licenses' },
    { key: 'availabilityProfile', label: 'Availability' },
    { key: 'groups', label: 'Groups' },
    { key: 'actions', label: 'Actions', width: '100px' },
  ]);

  // Transform users for the data table (no client-side filtering needed)
  const tableData = $derived(
    data.users.map((user) => ({
      ...user,
      id: user.id,
    }))
  );

  function getStatusVariant(status: User['status']): 'success' | 'error' | 'warning' {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'suspended':
        return 'warning';
    }
  }

  function getLicenseCount(licenses: User['licenses']): number {
    return Object.values(licenses).filter(Boolean).length;
  }

  function getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function handleColumnsChange(updatedColumns: Column[]) {
    columns = updatedColumns;
  }

  function handleRefresh() {
    goto($page.url.pathname + $page.url.search, { invalidateAll: true });
  }

  function handleRowClick(row: Record<string, unknown>) {
    goto(`/users/${row.id}`);
  }

  // Server-side pagination handlers
  function updateUrl(updates: Record<string, string | null>) {
    const url = new URL($page.url);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    }
    // Reset to page 1 when filters change (except for page changes)
    if (!('page' in updates)) {
      url.searchParams.delete('page');
    }
    goto(url.toString());
  }

  function handlePageChange(newPage: number) {
    updateUrl({ page: newPage > 1 ? String(newPage) : null });
  }

  function handleStatusChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    updateUrl({ status: value || null });
  }

  function handleSearchChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    // Debounce search input
    clearTimeout((window as Record<string, ReturnType<typeof setTimeout>>).__searchTimeout);
    (window as Record<string, ReturnType<typeof setTimeout>>).__searchTimeout = setTimeout(() => {
      updateUrl({ search: value || null });
    }, 300);
  }
</script>

<svelte:head>
  <title>Natterbox Users | Natterbox AVS</title>
</svelte:head>

<div class="flex flex-col h-[calc(100vh-120px)]">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-2 flex items-center gap-2 flex-shrink-0 mb-3 text-sm">
      <FlaskConical class="w-4 h-4 flex-shrink-0" />
      <span>Demo Mode - showing sample data</span>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error || form?.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-lg p-2 flex items-center gap-2 flex-shrink-0 mb-3 text-sm">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <span>{data.error || form?.error}</span>
    </div>
  {/if}

  <!-- Success Banner -->
  {#if form?.success}
    <div class="bg-success/10 border border-success/20 text-success rounded-lg p-2 flex items-center gap-2 flex-shrink-0 mb-3 text-sm">
      <span>{form?.message || 'Operation completed successfully'}</span>
    </div>
  {/if}

  <!-- Page Header - compact -->
  <div class="flex items-center justify-between flex-shrink-0 mb-3">
    <div>
      <h1 class="text-lg font-bold text-text-primary">Natterbox Users</h1>
      <p class="text-text-secondary text-xs">
        {#if data.pagination.totalItems > 0}
          {data.pagination.totalItems} users
        {:else}
          Manage user accounts and licenses
        {/if}
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="secondary" size="sm" onclick={handleRefresh}>
        <RefreshCw class="w-3.5 h-3.5" />
        Sync
      </Button>
      <Button variant="primary" size="sm" href="/users/new">
        <Plus class="w-3.5 h-3.5" />
        Add User
      </Button>
    </div>
  </div>

  <!-- Data Table - flex-1 to fill remaining space -->
  <div class="flex-1 min-h-0">
    <DataTable
      data={tableData}
      {columns}
      searchable={false}
      paginated={false}
      columnSelector
      onColumnsChange={handleColumnsChange}
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      emptyMessage="No users found"
    >
      {#snippet toolbar()}
        <!-- Server-side search input -->
        <input
          type="text"
          placeholder="Search users..."
          value={currentSearch}
          oninput={handleSearchChange}
          class="px-3 py-1.5 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
        />
        <!-- Server-side status filter -->
        <select
          class="px-3 py-1.5 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={currentStatus}
          onchange={handleStatusChange}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      {/snippet}

      {#snippet cell(column, row)}
        {#if column.key === 'user'}
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
              class:bg-success={row.status === 'active'}
              class:text-white={row.status === 'active'}
              class:bg-bg-tertiary={row.status !== 'active'}
              class:text-text-secondary={row.status !== 'active'}
            >
              {getInitials(String(row.name))}
            </div>
            <div class="min-w-0">
              <span class="font-medium text-text-primary hover:text-primary-300 text-sm block truncate">{row.name}</span>
              <p class="text-xs text-text-secondary truncate">{row.username || 'No username'}</p>
            </div>
          </div>
        {:else if column.key === 'extension'}
          <span class="font-mono text-sm">{row.extension || '—'}</span>
        {:else if column.key === 'status'}
          <Badge variant={getStatusVariant(row.status as User['status'])} size="sm">
            {row.status}
          </Badge>
        {:else if column.key === 'permissionLevel'}
          <Badge variant={row.permissionLevel === 'Admin' ? 'accent' : 'neutral'} size="sm">
            {row.permissionLevel || 'Basic'}
          </Badge>
        {:else if column.key === 'licenses'}
          {@const licenses = row.licenses as User['licenses']}
          <div class="flex flex-wrap gap-0.5">
            {#if licenses.cti}
              <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-accent/10 text-text-primary" title="CTI">
                <Headphones class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.pbx}
              <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-success/10 text-success" title="PBX">
                <Phone class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.manager}
              <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-warning/10 text-warning" title="Manager">
                <Shield class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.record}
              <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-error/10 text-error" title="Record">
                <Monitor class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.sms || licenses.whatsApp}
              <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-green-500/10 text-green-500" title="Messaging">
                <MessageSquare class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.insights}
              <span class="inline-flex items-center justify-center w-5 h-5 rounded bg-purple-500/10 text-purple-500" title="AI Advisor">
                <Eye class="w-3 h-3" />
              </span>
            {/if}
            {#if getLicenseCount(licenses) === 0}
              <span class="text-text-secondary text-xs">—</span>
            {/if}
          </div>
        {:else if column.key === 'availabilityProfile'}
          <span class="text-sm truncate">{row.availabilityProfile || '—'}</span>
        {:else if column.key === 'groups'}
          {@const groups = row.groups as string[]}
          <div class="flex flex-wrap gap-0.5 max-w-[100px]">
            {#each groups.slice(0, 2) as group}
              <Badge variant="neutral" size="sm">{group}</Badge>
            {/each}
            {#if groups.length > 2}
              <Badge variant="neutral" size="sm">+{groups.length - 2}</Badge>
            {/if}
            {#if groups.length === 0}
              <span class="text-text-secondary text-xs">—</span>
            {/if}
          </div>
        {:else if column.key === 'actions'}
          <div class="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" href="/users/{row.id}" title="View/Edit User">
              <Edit class="w-3.5 h-3.5" />
            </Button>
            <form
              method="POST"
              action="?/delete"
              use:enhance={() => {
                return async ({ result, update }) => {
                  await update();
                  if (result.type === 'success' && result.data?.success) {
                    toasts.success('User deleted successfully');
                    goto($page.url.pathname + $page.url.search, { invalidateAll: true });
                  } else if (result.type === 'failure') {
                    toasts.error(result.data?.error || 'Failed to delete user');
                  }
                };
              }}
              onclick={(e: MouseEvent) => e.stopPropagation()}
            >
              <input type="hidden" name="userId" value={row.id} />
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                title="Delete User"
                onclick={(e: MouseEvent) => {
                  if (!confirm(`Are you sure you want to delete user "${row.name}"? This action cannot be undone.`)) {
                    e.preventDefault();
                  }
                }}
              >
                <Trash2 class="w-3.5 h-3.5 text-error" />
              </Button>
            </form>
          </div>
        {:else}
          {row[column.key] ?? '—'}
        {/if}
      {/snippet}
    </DataTable>
  </div>

  <!-- Server-Side Pagination Controls -->
  {#if data.pagination.totalPages > 1}
    <div class="flex items-center justify-between px-3 py-2 border-t border-surface-600 bg-surface-700 flex-shrink-0 rounded-b-lg mt-px">
      <div class="text-xs text-text-secondary">
        {((data.pagination.page - 1) * data.pagination.pageSize) + 1}–{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalItems)} of {data.pagination.totalItems}
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!data.pagination.hasPreviousPage}
          onclick={() => handlePageChange(data.pagination.page - 1)}
        >
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <span class="text-xs text-text-secondary">
          {data.pagination.page}/{data.pagination.totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!data.pagination.hasNextPage}
          onclick={() => handlePageChange(data.pagination.page + 1)}
        >
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
  {/if}
</div>
