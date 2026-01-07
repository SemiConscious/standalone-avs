<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { Button, Badge, Input } from '$lib/components/ui';
  import DataTable, { type Column } from '$lib/components/ui/DataTable.svelte';
  import { Plus, FlaskConical, AlertCircle, X } from 'lucide-svelte';
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

  let showDeleteConfirm = $state<string | null>(null);
  let showCreateModal = $state(false);
  let isCreating = $state(false);
  let newPolicyName = $state('');
  let newPolicyDescription = $state('');
  let newPolicyType = $state('Call');

  // Filters
  let sourceFilter = $state('');
  let statusFilter = $state('');

  // Table columns with visibility state
  let columns = $state<Column[]>([
    { key: 'actions', label: 'Action', width: '120px', visible: true },
    { key: 'name', label: 'Policy Name', sortable: true, visible: true },
    { key: 'source', label: 'Source', sortable: true, visible: true },
    { key: 'type', label: 'Type', sortable: true, visible: true },
    { key: 'status', label: 'Status', sortable: true, visible: true },
    { key: 'phoneNumbers', label: 'Phone Numbers', visible: true },
    { key: 'description', label: 'Description', visible: false },
    { key: 'createdByName', label: 'Created By', sortable: true, visible: false },
    { key: 'lastModifiedDate', label: 'Last Modified', sortable: true, visible: true },
  ]);

  // Get unique sources and statuses for filter dropdowns
  const sources = $derived([...new Set(data.policies.map((p) => p.source))].filter(Boolean).sort());
  const statuses = $derived(
    [...new Set(data.policies.map((p) => p.status))].filter(Boolean).sort()
  );

  // Filter and transform policies for the data table
  const tableData = $derived(
    data.policies
      .filter((policy) => {
        const matchesSource = !sourceFilter || policy.source === sourceFilter;
        const matchesStatus = !statusFilter || policy.status === statusFilter;
        return matchesSource && matchesStatus;
      })
      .map((policy) => ({
        ...policy,
        id: policy.id,
      }))
  );

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
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  function handleRowClick(row: Record<string, unknown>) {
    goto(`/policy-editor/${row.id}`);
  }

  function handleRefresh() {
    window.location.reload();
  }

  function handleColumnsChange(updatedColumns: Column[]) {
    columns = updatedColumns;
  }
</script>

<svelte:head>
  <title>Routing Policies | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold text-text-primary">Routing Policies</h1>
      <p class="text-text-secondary mt-1">
        Configure call routing rules and policies
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
    <Button
      variant="primary"
      onclick={() => {
        showCreateModal = true;
      }}
      disabled={data.isDemo}
    >
      <Plus class="w-4 h-4" />
      New Policy
    </Button>
  </div>

  <!-- Data Table -->
  <div class="flex-1 min-h-0">
    <DataTable
      data={tableData}
      {columns}
      searchable
      searchPlaceholder="Search policies by name, description, or phone number..."
      paginated
      pageSize={15}
      columnSelector
      onRowClick={handleRowClick}
      onRefresh={handleRefresh}
      onColumnsChange={handleColumnsChange}
      emptyMessage="No routing policies found"
    >
      {#snippet toolbar()}
        <!-- Source Filter -->
        <select
          bind:value={sourceFilter}
          class="px-3 py-2 text-sm bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Sources</option>
          {#each sources as source}
            <option value={source}>{source}</option>
          {/each}
        </select>

        <!-- Status Filter -->
        <select
          bind:value={statusFilter}
          class="px-3 py-2 text-sm bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          {#each statuses as status}
            <option value={status}>{status}</option>
          {/each}
        </select>
      {/snippet}

      {#snippet cell(column, row)}
        {#if column.key === 'actions'}
          <div class="flex items-center gap-1">
            <button
              onclick={(e) => {
                e.stopPropagation();
                handleToggleStatus(String(row.id), String(row.status));
              }}
              class="text-accent hover:underline text-sm"
              disabled={data.isDemo}
            >
              {row.status === 'Enabled' ? 'Disable' : 'Enable'}
            </button>
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
                disabled={data.isDemo}
              >
                Del
              </button>
            {/if}
          </div>
        {:else if column.key === 'name'}
          <span class="text-accent font-medium">{row.name}</span>
        {:else if column.key === 'source'}
          <Badge variant={row.source === 'Inbound' ? 'accent' : 'neutral'}>
            {row.source}
          </Badge>
        {:else if column.key === 'status'}
          <Badge variant={row.status === 'Enabled' ? 'success' : 'neutral'}>
            {row.status}
          </Badge>
        {:else if column.key === 'phoneNumbers'}
          {#if Array.isArray(row.phoneNumbers) && row.phoneNumbers.length > 0}
            <div class="flex flex-wrap gap-1">
              {#each (row.phoneNumbers as string[]).slice(0, 2) as pn}
                <span class="text-sm font-mono">{pn}</span>
              {/each}
              {#if (row.phoneNumbers as string[]).length > 2}
                <span class="text-text-secondary text-sm"
                  >+{(row.phoneNumbers as string[]).length - 2} more</span
                >
              {/if}
            </div>
          {:else}
            <span class="text-text-secondary">—</span>
          {/if}
        {:else if column.key === 'description'}
          <span class="text-sm text-text-secondary line-clamp-1">{row.description || '—'}</span>
        {:else if column.key === 'lastModifiedDate'}
          <span class="text-sm text-text-secondary">{formatDate(String(row.lastModifiedDate))}</span
          >
        {:else}
          {row[column.key] ?? '-'}
        {/if}
      {/snippet}
    </DataTable>
  </div>
</div>

<!-- Create Policy Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={() => {
        showCreateModal = false;
      }}
      onkeydown={(e) => e.key === 'Escape' && (showCreateModal = false)}
      role="button"
      tabindex="0"
    ></div>

    <!-- Modal -->
    <div
      class="relative z-10 bg-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4 border border-border"
    >
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h2 class="text-lg font-semibold">Create New Policy</h2>
        <button
          onclick={() => {
            showCreateModal = false;
          }}
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
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            rows="3"
          ></textarea>
        </div>

        <div>
          <label for="policy-type" class="block text-sm font-medium mb-1">Policy Type</label>
          <select
            id="policy-type"
            name="type"
            bind:value={newPolicyType}
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="Call">Call</option>
            <option value="Digital">Digital</option>
            <option value="DataAnalytics">Data Analytics</option>
          </select>
        </div>

        {#if form?.error}
          <div
            class="bg-error/10 border border-error/20 text-error rounded-lg p-3 flex items-center gap-2 text-sm"
          >
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span>{form.error}</span>
          </div>
        {/if}

        <div class="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onclick={() => {
              showCreateModal = false;
            }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isCreating || !newPolicyName.trim()}>
            {isCreating ? 'Creating...' : 'Create Policy'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
