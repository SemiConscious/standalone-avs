<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import {
    Route,
    Plus,
    Search,
    FlaskConical,
    AlertCircle,
    Edit,
    Trash2,
    Play,
    Pause,
    Phone,
    Clock,
    User,
    ChevronDown,
    Columns,
    X,
  } from 'lucide-svelte';
  import type { RoutingPolicy } from './+page.server';
  import type { ActionData } from './$types';

  interface Props {
    data: {
      policies: RoutingPolicy[];
      isDemo: boolean;
      totalCount: number;
      error?: string;
    };
    form: ActionData;
  }

  let { data, form }: Props = $props();

  let searchQuery = $state('');
  let sourceFilter = $state('');
  let statusFilter = $state('');
  let showColumnSelector = $state(false);
  let showDeleteConfirm = $state<string | null>(null);
  let showCreateModal = $state(false);
  let isCreating = $state(false);
  let newPolicyName = $state('');
  let newPolicyDescription = $state('');
  let newPolicyType = $state('Call');

  // Column visibility
  let columns = $state({
    name: true,
    source: true,
    type: true,
    status: true,
    phoneNumbers: true,
    description: false,
    createdBy: false,
    lastModified: true,
  });

  const filteredPolicies = $derived(
    data.policies.filter((policy) => {
      const matchesSearch =
        policy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.phoneNumbers.some((pn) => pn.includes(searchQuery));

      const matchesSource = !sourceFilter || policy.source === sourceFilter;
      const matchesStatus = !statusFilter || policy.status === statusFilter;

      return matchesSearch && matchesSource && matchesStatus;
    })
  );

  const visibleColumnCount = $derived(Object.values(columns).filter(Boolean).length + 1);

  const sources = $derived([...new Set(data.policies.map((p) => p.source))].filter(Boolean).sort());
  const statuses = $derived([...new Set(data.policies.map((p) => p.status))].filter(Boolean).sort());

  async function handleDelete(policyId: string) {
    try {
      const formData = new FormData();
      formData.append('policyId', policyId);

      const response = await fetch('?/delete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete routing policy');
      }
    } catch (error) {
      alert('Failed to delete routing policy');
    } finally {
      showDeleteConfirm = null;
    }
  }

  async function handleToggleStatus(policyId: string, currentStatus: string) {
    try {
      const formData = new FormData();
      formData.append('policyId', policyId);
      formData.append('status', currentStatus === 'Enabled' ? 'Disabled' : 'Enabled');

      const response = await fetch('?/toggleStatus', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to toggle policy status');
      }
    } catch (error) {
      alert('Failed to toggle policy status');
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
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
  <title>Routing Policies | Natterbox AVS</title>
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
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Routing Policies</h1>
      <p class="text-text-secondary mt-1">
        Configure call routing rules and policies
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
  </div>

  <!-- Action Buttons -->
  <Card padding="sm">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="primary" onclick={() => { showCreateModal = true; }} disabled={data.isDemo}>
        <Plus class="w-4 h-4" />
        New Policy
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
          <div class="absolute right-0 top-full mt-2 w-56 bg-bg-secondary border border-border rounded-base shadow-lg z-50 p-3">
            <p class="text-xs font-semibold text-text-secondary uppercase mb-2">Toggle Columns</p>
            <div class="space-y-1.5">
              {#each Object.entries({
                name: 'Policy Name',
                source: 'Source',
                type: 'Type',
                status: 'Status',
                phoneNumbers: 'Phone Numbers',
                description: 'Description',
                createdBy: 'Created By',
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

  <!-- Search and Filters -->
  <Card padding="sm">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <Input
          type="search"
          placeholder="Search policies by name, description, or phone number..."
          class="pl-10"
          bind:value={searchQuery}
        />
      </div>
      <div class="flex gap-2">
        <select
          bind:value={sourceFilter}
          class="px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
        >
          <option value="">All Sources</option>
          {#each sources as source}
            <option value={source}>{source}</option>
          {/each}
        </select>
        <select
          bind:value={statusFilter}
          class="px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent text-sm"
        >
          <option value="">All Statuses</option>
          {#each statuses as status}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </div>
    </div>
  </Card>

  <!-- Policies Table -->
  <Card padding="none">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            {#if columns.name}<th>Policy Name</th>{/if}
            {#if columns.source}<th>Source</th>{/if}
            {#if columns.type}<th>Type</th>{/if}
            {#if columns.status}<th>Status</th>{/if}
            {#if columns.phoneNumbers}<th>Phone Numbers</th>{/if}
            {#if columns.description}<th>Description</th>{/if}
            {#if columns.createdBy}<th>Created By</th>{/if}
            {#if columns.lastModified}<th>Last Modified</th>{/if}
          </tr>
        </thead>
        <tbody>
          {#each filteredPolicies as policy}
            <tr>
              <td>
                <div class="flex items-center gap-1">
                  <a href="/policy-editor/{policy.id}" class="text-accent hover:underline text-sm">
                    Edit
                  </a>
                  <span class="text-text-secondary">|</span>
                  <button
                    onclick={() => handleToggleStatus(policy.id, policy.status)}
                    class="text-accent hover:underline text-sm"
                    disabled={data.isDemo}
                  >
                    {policy.status === 'Enabled' ? 'Disable' : 'Enable'}
                  </button>
                  <span class="text-text-secondary">|</span>
                  {#if showDeleteConfirm === policy.id}
                    <button onclick={() => handleDelete(policy.id)} class="text-error hover:underline text-sm">
                      Confirm
                    </button>
                    <button onclick={() => (showDeleteConfirm = null)} class="text-text-secondary hover:underline text-sm">
                      Cancel
                    </button>
                  {:else}
                    <button
                      onclick={() => (showDeleteConfirm = policy.id)}
                      class="text-accent hover:underline text-sm"
                      disabled={data.isDemo}
                    >
                      Del
                    </button>
                  {/if}
                </div>
              </td>
              {#if columns.name}
                <td>
                  <a href="/policy-editor/{policy.id}" class="text-accent hover:underline font-medium">
                    {policy.name}
                  </a>
                </td>
              {/if}
              {#if columns.source}
                <td>
                  <Badge variant={policy.source === 'Inbound' ? 'accent' : 'neutral'}>
                    {policy.source}
                  </Badge>
                </td>
              {/if}
              {#if columns.type}
                <td>{policy.type}</td>
              {/if}
              {#if columns.status}
                <td>
                  <Badge variant={policy.status === 'Enabled' ? 'success' : 'neutral'}>
                    {policy.status}
                  </Badge>
                </td>
              {/if}
              {#if columns.phoneNumbers}
                <td>
                  {#if policy.phoneNumbers.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each policy.phoneNumbers.slice(0, 2) as pn}
                        <span class="text-sm font-mono">{pn}</span>
                      {/each}
                      {#if policy.phoneNumbers.length > 2}
                        <span class="text-text-secondary text-sm">+{policy.phoneNumbers.length - 2} more</span>
                      {/if}
                    </div>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </td>
              {/if}
              {#if columns.description}
                <td>
                  <span class="text-sm text-text-secondary line-clamp-1">{policy.description || '—'}</span>
                </td>
              {/if}
              {#if columns.createdBy}
                <td>
                  <span class="flex items-center gap-1 text-sm">
                    <User class="w-3 h-3 text-text-secondary" />
                    {policy.createdByName}
                  </span>
                </td>
              {/if}
              {#if columns.lastModified}
                <td>
                  <span class="text-sm text-text-secondary flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {formatDate(policy.lastModifiedDate)}
                  </span>
                </td>
              {/if}
            </tr>
          {:else}
            <tr>
              <td colspan={visibleColumnCount} class="text-center py-8 text-text-secondary">
                {#if data.policies.length === 0}
                  No routing policies found.
                {:else}
                  No routing policies found matching your search.
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
        Showing {filteredPolicies.length} of {data.totalCount} routing policies
      </p>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" disabled>Previous</Button>
        <Button variant="secondary" size="sm" disabled>Next</Button>
      </div>
    </div>
  </Card>
</div>

<!-- Create Policy Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={() => { showCreateModal = false; }}
      onkeydown={(e) => e.key === 'Escape' && (showCreateModal = false)}
      role="button"
      tabindex="0"
    ></div>
    
    <!-- Modal -->
    <div class="relative z-10 bg-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h2 class="text-lg font-semibold">Create New Policy</h2>
        <button 
          onclick={() => { showCreateModal = false; }}
          class="p-1 hover:bg-bg-tertiary rounded"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <form 
        method="POST" 
        action="?/create"
        use:enhance={() => {
          isCreating = true;
          return async ({ result, update }) => {
            isCreating = false;
            if (result.type === 'redirect') {
              // Let SvelteKit handle the redirect
              await update();
            } else if (result.type === 'failure') {
              await update();
            }
          };
        }}
        class="p-4 space-y-4"
      >
        <div>
          <label for="policy-name" class="block text-sm font-medium mb-1">Policy Name *</label>
          <Input
            id="policy-name"
            name="name"
            bind:value={newPolicyName}
            placeholder="Enter policy name"
            required
          />
        </div>
        
        <div>
          <label for="policy-description" class="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="policy-description"
            name="description"
            bind:value={newPolicyDescription}
            placeholder="Enter policy description (optional)"
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            rows="3"
          ></textarea>
        </div>
        
        <div>
          <label for="policy-type" class="block text-sm font-medium mb-1">Policy Type</label>
          <select
            id="policy-type"
            name="type"
            bind:value={newPolicyType}
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="Call">Call</option>
            <option value="Digital">Digital</option>
            <option value="DataAnalytics">Data Analytics</option>
          </select>
        </div>
        
        {#if form?.error}
          <div class="bg-error/10 border border-error/20 text-error rounded-base p-3 flex items-center gap-2 text-sm">
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span>{form.error}</span>
          </div>
        {/if}
        
        <div class="flex justify-end gap-3 pt-2">
          <Button 
            type="button" 
            variant="secondary" 
            onclick={() => { showCreateModal = false; }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={isCreating || !newPolicyName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Policy'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
