<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import { Plus, Search, ListTodo, Play, Pause, Edit, Trash2, Users } from 'lucide-svelte';

  interface DialList {
    id: string;
    name: string;
    description: string;
    itemCount: number;
    completedCount: number;
    status: 'active' | 'paused' | 'completed';
    assignedGroup?: string;
    createdAt: string;
  }

  // Mock data
  const dialLists: DialList[] = [
    {
      id: '1',
      name: 'Q1 Follow-ups',
      description: 'Customer follow-up calls for Q1',
      itemCount: 250,
      completedCount: 180,
      status: 'active',
      assignedGroup: 'Sales Team',
      createdAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Renewal Reminders',
      description: 'Annual subscription renewal calls',
      itemCount: 100,
      completedCount: 45,
      status: 'active',
      assignedGroup: 'Account Management',
      createdAt: '2024-02-01',
    },
    {
      id: '3',
      name: 'Survey Campaign',
      description: 'Customer satisfaction survey calls',
      itemCount: 500,
      completedCount: 500,
      status: 'completed',
      assignedGroup: 'Support Team',
      createdAt: '2024-01-01',
    },
    {
      id: '4',
      name: 'Product Launch',
      description: 'New product announcement calls',
      itemCount: 300,
      completedCount: 0,
      status: 'paused',
      createdAt: '2024-02-15',
    },
  ];

  let searchQuery = $state('');

  const filteredLists = $derived(
    dialLists.filter(
      (list) =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        list.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function getStatusVariant(status: DialList['status']): 'success' | 'warning' | 'neutral' {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'neutral';
    }
  }

  function getProgress(list: DialList): number {
    return Math.round((list.completedCount / list.itemCount) * 100);
  }
</script>

<svelte:head>
  <title>Dial Lists | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold">Dial Lists</h1>
      <p class="text-text-secondary mt-1">Manage outbound calling campaigns</p>
    </div>
    <Button variant="primary">
      <Plus class="w-4 h-4 mr-2" />
      Create Dial List
    </Button>
  </div>

  <!-- Search -->
  <Card padding="sm">
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <Input
        type="search"
        placeholder="Search dial lists..."
        class="pl-10"
        bind:value={searchQuery}
      />
    </div>
  </Card>

  <!-- Dial Lists Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each filteredLists as list}
      <Card class="hover:shadow-lg transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-base bg-accent/10 flex items-center justify-center text-text-primary"
            >
              <ListTodo class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-semibold">{list.name}</h3>
              <Badge variant={getStatusVariant(list.status)}>{list.status}</Badge>
            </div>
          </div>
        </div>

        <p class="text-sm text-text-secondary mb-4">{list.description}</p>

        <!-- Progress Bar -->
        <div class="mb-4">
          <div class="flex items-center justify-between text-sm mb-1">
            <span class="text-text-secondary">Progress</span>
            <span class="font-medium">{getProgress(list)}%</span>
          </div>
          <div class="h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              class="h-full bg-accent transition-all duration-300"
              style="width: {getProgress(list)}%"
            ></div>
          </div>
          <p class="text-xs text-text-secondary mt-1">
            {list.completedCount} of {list.itemCount} completed
          </p>
        </div>

        {#if list.assignedGroup}
          <div class="flex items-center gap-2 text-sm text-text-secondary mb-4">
            <Users class="w-4 h-4" />
            <span>{list.assignedGroup}</span>
          </div>
        {/if}

        <div class="pt-4 border-t border-border flex items-center justify-between">
          <span class="text-sm text-text-secondary">Created {list.createdAt}</span>
          <div class="flex items-center gap-1">
            {#if list.status === 'active'}
              <Button variant="ghost" size="sm" class="text-warning">
                <Pause class="w-4 h-4" />
              </Button>
            {:else if list.status === 'paused'}
              <Button variant="ghost" size="sm" class="text-success">
                <Play class="w-4 h-4" />
              </Button>
            {/if}
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
          <ListTodo class="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p class="text-text-secondary">No dial lists found.</p>
        </Card>
      </div>
    {/each}
  </div>
</div>

