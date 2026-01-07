<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import {
    Plus,
    Search,
    Mail,
    Phone,
    Edit,
    Trash2,
    FlaskConical,
    AlertCircle,
    UserMinus,
    RefreshCw,
    ChevronDown,
    ChevronUp,
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

  let searchQuery = $state('');
  let statusFilter = $state('');
  let sortField = $state<'name' | 'extension' | 'status'>('name');
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let currentPage = $state(1);
  const pageSize = 25;

  const filteredUsers = $derived(() => {
    let result = data.users.filter((user) => {
      const matchesSearch =
        searchQuery === '' ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.extension.includes(searchQuery);

      const matchesStatus = statusFilter === '' || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'extension':
          comparison = (a.extension || '').localeCompare(b.extension || '');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  const paginatedUsers = $derived(
    filteredUsers().slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );

  const totalPages = $derived(Math.ceil(filteredUsers().length / pageSize));

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
  }

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
</script>

<svelte:head>
  <title>Natterbox Users | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold">Natterbox Users</h1>
      <p class="text-text-secondary mt-1">
        Manage AVS user accounts, licenses, and permissions
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="secondary">
        <RefreshCw class="w-4 h-4 mr-2" />
        Sync
      </Button>
      <Button variant="primary">
        <Plus class="w-4 h-4 mr-2" />
        Add User
      </Button>
    </div>
  </div>

  <!-- Search and Filters -->
  <Card padding="sm">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <Input
          type="search"
          placeholder="Search by name, email, username, or extension..."
          class="pl-10"
          bind:value={searchQuery}
        />
      </div>
      <div class="flex gap-2">
        <select
          class="input max-w-[150px]"
          bind:value={statusFilter}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
    </div>
  </Card>

  <!-- Users Table -->
  <Card padding="none">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>
              <button
                class="flex items-center gap-1 hover:text-text-primary transition-colors"
                onclick={() => toggleSort('name')}
              >
                User
                {#if sortField === 'name'}
                  {#if sortDirection === 'asc'}
                    <ChevronUp class="w-3 h-3" />
                  {:else}
                    <ChevronDown class="w-3 h-3" />
                  {/if}
                {/if}
              </button>
            </th>
            <th>
              <button
                class="flex items-center gap-1 hover:text-text-primary transition-colors"
                onclick={() => toggleSort('extension')}
              >
                Extension
                {#if sortField === 'extension'}
                  {#if sortDirection === 'asc'}
                    <ChevronUp class="w-3 h-3" />
                  {:else}
                    <ChevronDown class="w-3 h-3" />
                  {/if}
                {/if}
              </button>
            </th>
            <th>
              <button
                class="flex items-center gap-1 hover:text-text-primary transition-colors"
                onclick={() => toggleSort('status')}
              >
                Status
                {#if sortField === 'status'}
                  {#if sortDirection === 'asc'}
                    <ChevronUp class="w-3 h-3" />
                  {:else}
                    <ChevronDown class="w-3 h-3" />
                  {/if}
                {/if}
              </button>
            </th>
            <th>Permission</th>
            <th>Licenses</th>
            <th>Availability</th>
            <th>Groups</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedUsers as user}
            <tr>
              <td>
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                    class:bg-success={user.status === 'active'}
                    class:text-white={user.status === 'active'}
                    class:bg-bg-tertiary={user.status !== 'active'}
                    class:text-text-secondary={user.status !== 'active'}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <a href="/users/{user.id}" class="font-medium hover:text-accent transition-colors">
                      {user.name}
                    </a>
                    <p class="text-sm text-text-secondary flex items-center gap-1">
                      <Mail class="w-3 h-3" />
                      {user.username || 'No username'}
                    </p>
                    {#if user.linkedSalesforceUser}
                      <p class="text-xs text-text-secondary">
                        SF: {user.linkedSalesforceUser.name}
                      </p>
                    {/if}
                  </div>
                </div>
              </td>
              <td>
                <span class="flex items-center gap-1 font-mono">
                  <Phone class="w-4 h-4 text-text-secondary" />
                  {user.extension || '—'}
                </span>
                {#if user.mobilePhone}
                  <p class="text-xs text-text-secondary mt-1">{user.mobilePhone}</p>
                {/if}
              </td>
              <td>
                <Badge variant={getStatusVariant(user.status)}>
                  {user.status}
                </Badge>
              </td>
              <td>
                <Badge variant={user.permissionLevel === 'Admin' ? 'accent' : 'neutral'}>
                  {user.permissionLevel || 'Basic'}
                </Badge>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  {#if user.licenses.cti}
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-accent/10 text-accent" title="CTI">
                      <Headphones class="w-3 h-3" />
                    </span>
                  {/if}
                  {#if user.licenses.pbx}
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-success/10 text-success" title="PBX">
                      <Phone class="w-3 h-3" />
                    </span>
                  {/if}
                  {#if user.licenses.manager}
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-warning/10 text-warning" title="Manager">
                      <Shield class="w-3 h-3" />
                    </span>
                  {/if}
                  {#if user.licenses.record}
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-error/10 text-error" title="Record">
                      <Monitor class="w-3 h-3" />
                    </span>
                  {/if}
                  {#if user.licenses.sms || user.licenses.whatsApp}
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-green-500/10 text-green-500" title="Messaging">
                      <MessageSquare class="w-3 h-3" />
                    </span>
                  {/if}
                  {#if user.licenses.insights}
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-500/10 text-purple-500" title="AI Advisor">
                      <Eye class="w-3 h-3" />
                    </span>
                  {/if}
                  {#if getLicenseCount(user.licenses) === 0}
                    <span class="text-text-secondary text-sm">—</span>
                  {/if}
                </div>
              </td>
              <td>
                {#if user.availabilityProfile}
                  <div class="text-sm">
                    <p>{user.availabilityProfile}</p>
                    {#if user.availabilityState}
                      <p class="text-text-secondary text-xs">{user.availabilityState}</p>
                    {/if}
                  </div>
                {:else}
                  <span class="text-text-secondary">—</span>
                {/if}
              </td>
              <td>
                <div class="flex flex-wrap gap-1 max-w-[150px]">
                  {#each user.groups.slice(0, 2) as group}
                    <Badge variant="neutral" size="sm">{group}</Badge>
                  {/each}
                  {#if user.groups.length > 2}
                    <Badge variant="neutral" size="sm">+{user.groups.length - 2}</Badge>
                  {/if}
                  {#if user.groups.length === 0}
                    <span class="text-text-secondary text-sm">—</span>
                  {/if}
                </div>
              </td>
              <td>
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" href="/users/{user.id}">
                    <Eye class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" href="/users/{user.id}/edit">
                    <Edit class="w-4 h-4" />
                  </Button>
                  {#if user.enabled}
                    <Button variant="ghost" size="sm" title="Disable User">
                      <UserMinus class="w-4 h-4 text-warning" />
                    </Button>
                  {/if}
                  <Button variant="ghost" size="sm" title="Delete User">
                    <Trash2 class="w-4 h-4 text-error" />
                  </Button>
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="8" class="text-center py-8 text-text-secondary">
                {#if data.users.length === 0}
                  No users found. Click "Add User" to create one.
                {:else}
                  No users found matching your search.
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
        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredUsers().length)} of {filteredUsers().length} users
        {#if filteredUsers().length !== data.totalCount}
          (filtered from {data.totalCount})
        {/if}
      </p>
      <div class="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage === 1}
          onclick={() => (currentPage = currentPage - 1)}
        >
          Previous
        </Button>
        <span class="flex items-center px-3 text-sm text-text-secondary">
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onclick={() => (currentPage = currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  </Card>
</div>
