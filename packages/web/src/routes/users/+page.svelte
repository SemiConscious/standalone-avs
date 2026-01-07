<script lang="ts">
  import { Button, Badge } from '$lib/components/ui';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
  import {
    Plus,
    Mail,
    Phone,
    Edit,
    Trash2,
    FlaskConical,
    AlertCircle,
    UserMinus,
    RefreshCw,
    Shield,
    Headphones,
    Monitor,
    MessageSquare,
    Eye,
  } from 'lucide-svelte';
  import type { User } from './+page.server';

  interface Props {
    data: {
      users: User[];
      isDemo: boolean;
      totalCount: number;
      error?: string;
    };
  }

  let { data }: Props = $props();

  let statusFilter = $state('');

  // Column definitions
  let columns = $state<Column[]>([
    { key: 'user', label: 'User', sortable: true },
    { key: 'extension', label: 'Extension', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'permissionLevel', label: 'Permission' },
    { key: 'licenses', label: 'Licenses' },
    { key: 'availabilityProfile', label: 'Availability' },
    { key: 'groups', label: 'Groups' },
    { key: 'actions', label: 'Actions', width: '120px' },
  ]);

  // Filter users based on status filter
  const filteredUsers = $derived(() => {
    return data.users.filter((user) => {
      const matchesStatus = statusFilter === '' || user.status === statusFilter;
      return matchesStatus;
    });
  });

  // Transform users for the data table
  const tableData = $derived(
    filteredUsers().map((user) => ({
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
    window.location.reload();
  }

  function handleRowClick(row: Record<string, unknown>) {
    window.location.href = `/users/${row.id}`;
  }
</script>

<svelte:head>
  <title>Natterbox Users | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold text-text-primary">Natterbox Users</h1>
      <p class="text-text-secondary mt-1">
        Manage AVS user accounts, licenses, and permissions
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="secondary">
        <RefreshCw class="w-4 h-4" />
        Sync
      </Button>
      <Button variant="primary">
        <Plus class="w-4 h-4" />
        Add User
      </Button>
    </div>
  </div>

  <!-- Data Table -->
  <div class="flex-1 min-h-0">
    <DataTable
      data={tableData}
      {columns}
      searchable
      searchPlaceholder="Search by name, email, username, or extension..."
      paginated
      pageSize={25}
      columnSelector
      onColumnsChange={handleColumnsChange}
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      emptyMessage="No users found"
    >
      {#snippet toolbar()}
        <select
          class="px-3 py-2 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          bind:value={statusFilter}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      {/snippet}

      {#snippet cell(column, row)}
        {#if column.key === 'user'}
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
              class:bg-success={row.status === 'active'}
              class:text-white={row.status === 'active'}
              class:bg-bg-tertiary={row.status !== 'active'}
              class:text-text-secondary={row.status !== 'active'}
            >
              {getInitials(String(row.name))}
            </div>
            <div>
              <span class="font-medium text-accent">{row.name}</span>
              <p class="text-sm text-text-secondary flex items-center gap-1">
                <Mail class="w-3 h-3" />
                {row.username || 'No username'}
              </p>
              {#if row.linkedSalesforceUser}
                <p class="text-xs text-text-secondary">
                  SF: {(row.linkedSalesforceUser as { name: string }).name}
                </p>
              {/if}
            </div>
          </div>
        {:else if column.key === 'extension'}
          <span class="flex items-center gap-1 font-mono">
            <Phone class="w-4 h-4 text-text-secondary" />
            {row.extension || '—'}
          </span>
          {#if row.mobilePhone}
            <p class="text-xs text-text-secondary mt-1">{row.mobilePhone}</p>
          {/if}
        {:else if column.key === 'status'}
          <Badge variant={getStatusVariant(row.status as User['status'])}>
            {row.status}
          </Badge>
        {:else if column.key === 'permissionLevel'}
          <Badge variant={row.permissionLevel === 'Admin' ? 'accent' : 'neutral'}>
            {row.permissionLevel || 'Basic'}
          </Badge>
        {:else if column.key === 'licenses'}
          {@const licenses = row.licenses as User['licenses']}
          <div class="flex flex-wrap gap-1">
            {#if licenses.cti}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-accent/10 text-accent" title="CTI">
                <Headphones class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.pbx}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-success/10 text-success" title="PBX">
                <Phone class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.manager}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-warning/10 text-warning" title="Manager">
                <Shield class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.record}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-error/10 text-error" title="Record">
                <Monitor class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.sms || licenses.whatsApp}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-green-500/10 text-green-500" title="Messaging">
                <MessageSquare class="w-3 h-3" />
              </span>
            {/if}
            {#if licenses.insights}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-500/10 text-purple-500" title="AI Advisor">
                <Eye class="w-3 h-3" />
              </span>
            {/if}
            {#if getLicenseCount(licenses) === 0}
              <span class="text-text-secondary text-sm">—</span>
            {/if}
          </div>
        {:else if column.key === 'availabilityProfile'}
          {#if row.availabilityProfile}
            <div class="text-sm">
              <p>{row.availabilityProfile}</p>
              {#if row.availabilityState}
                <p class="text-text-secondary text-xs">{row.availabilityState}</p>
              {/if}
            </div>
          {:else}
            <span class="text-text-secondary">—</span>
          {/if}
        {:else if column.key === 'groups'}
          {@const groups = row.groups as string[]}
          <div class="flex flex-wrap gap-1 max-w-[150px]">
            {#each groups.slice(0, 2) as group}
              <Badge variant="neutral" size="sm">{group}</Badge>
            {/each}
            {#if groups.length > 2}
              <Badge variant="neutral" size="sm">+{groups.length - 2}</Badge>
            {/if}
            {#if groups.length === 0}
              <span class="text-text-secondary text-sm">—</span>
            {/if}
          </div>
        {:else if column.key === 'actions'}
          <div class="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" href="/users/{row.id}" onclick={(e: MouseEvent) => e.stopPropagation()}>
              <Eye class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" href="/users/{row.id}/edit" onclick={(e: MouseEvent) => e.stopPropagation()}>
              <Edit class="w-4 h-4" />
            </Button>
            {#if row.enabled}
              <Button variant="ghost" size="sm" title="Disable User" onclick={(e: MouseEvent) => e.stopPropagation()}>
                <UserMinus class="w-4 h-4 text-warning" />
              </Button>
            {/if}
            <Button variant="ghost" size="sm" title="Delete User" onclick={(e: MouseEvent) => e.stopPropagation()}>
              <Trash2 class="w-4 h-4 text-error" />
            </Button>
          </div>
        {:else}
          {row[column.key] ?? '—'}
        {/if}
      {/snippet}
    </DataTable>
  </div>
</div>
