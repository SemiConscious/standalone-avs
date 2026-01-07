<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import { Plus, Search, Workflow, Edit, Copy, Trash2, Play, Pause } from 'lucide-svelte';

  interface CallFlow {
    id: string;
    name: string;
    description: string;
    status: 'draft' | 'published' | 'archived';
    assignedNumbers: number;
    lastModified: string;
    createdBy: string;
  }

  // Mock data for development
  const callFlows: CallFlow[] = [
    {
      id: '1',
      name: 'Main IVR',
      description: 'Primary incoming call flow with department routing',
      status: 'published',
      assignedNumbers: 5,
      lastModified: '2 hours ago',
      createdBy: 'John Smith',
    },
    {
      id: '2',
      name: 'After Hours',
      description: 'After hours voicemail and routing',
      status: 'published',
      assignedNumbers: 2,
      lastModified: '1 day ago',
      createdBy: 'Jane Doe',
    },
    {
      id: '3',
      name: 'Holiday Schedule',
      description: 'Holiday greeting and voicemail',
      status: 'draft',
      assignedNumbers: 0,
      lastModified: '3 days ago',
      createdBy: 'Bob Johnson',
    },
    {
      id: '4',
      name: 'Sales Routing',
      description: 'Route calls to sales team with priority',
      status: 'archived',
      assignedNumbers: 0,
      lastModified: '1 week ago',
      createdBy: 'Alice Williams',
    },
  ];

  let searchQuery = $state('');

  const filteredFlows = $derived(
    callFlows.filter(
      (flow) =>
        flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flow.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function getStatusVariant(status: CallFlow['status']): 'success' | 'warning' | 'neutral' {
    switch (status) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'neutral';
    }
  }
</script>

<svelte:head>
  <title>Call Flows | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Call Flows</h1>
      <p class="text-text-secondary mt-1">Design and manage call routing flows</p>
    </div>
    <Button variant="primary">
      <Plus class="w-4 h-4 mr-2" />
      Create Call Flow
    </Button>
  </div>

  <!-- Search and Filters -->
  <Card padding="sm">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <Input
          type="search"
          placeholder="Search call flows..."
          class="pl-10"
          bind:value={searchQuery}
        />
      </div>
      <div class="flex gap-2">
        <select
          class="px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>
  </Card>

  <!-- Call Flows Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each filteredFlows as flow}
      <Card class="hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-base bg-accent/10 flex items-center justify-center text-accent"
            >
              <Workflow class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-semibold">{flow.name}</h3>
              <Badge variant={getStatusVariant(flow.status)}>{flow.status}</Badge>
            </div>
          </div>
        </div>

        <p class="text-sm text-text-secondary mb-4">{flow.description}</p>

        <div class="flex items-center justify-between text-sm text-text-secondary mb-4">
          <span>{flow.assignedNumbers} phone numbers</span>
          <span>Modified {flow.lastModified}</span>
        </div>

        <div class="pt-4 border-t border-border flex items-center justify-between">
          <span class="text-sm text-text-secondary">By {flow.createdBy}</span>
          <div class="flex items-center gap-1">
            {#if flow.status === 'draft'}
              <Button variant="ghost" size="sm" class="text-success">
                <Play class="w-4 h-4" />
              </Button>
            {:else if flow.status === 'published'}
              <Button variant="ghost" size="sm" class="text-warning">
                <Pause class="w-4 h-4" />
              </Button>
            {/if}
            <Button variant="ghost" size="sm">
              <Copy class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Edit class="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 class="w-4 h-4 text-error" />
            </Button>
          </div>
        </div>
      </Card>
    {:else}
      <div class="col-span-full">
        <Card class="text-center py-12">
          <Workflow class="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p class="text-text-secondary">No call flows found matching your search.</p>
        </Card>
      </div>
    {/each}
  </div>
</div>

