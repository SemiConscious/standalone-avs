<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { Users, Clock, Shuffle } from 'lucide-svelte';
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Hunt Group');
  let huntType = $state(node.data?.huntType as string || 'simultaneous');
  let ringTimeout = $state(node.data?.ringTimeout as number || 30);
  let selectedGroups = $state<string[]>(node.data?.groups as string[] || []);
  let selectedUsers = $state<string[]>(node.data?.users as string[] || []);
  
  const huntTypes = [
    { value: 'simultaneous', label: 'Ring All', description: 'Ring all agents at once' },
    { value: 'sequential', label: 'Sequential', description: 'Ring agents one by one' },
    { value: 'roundRobin', label: 'Round Robin', description: 'Rotate through agents' },
    { value: 'random', label: 'Random', description: 'Ring a random agent' },
  ];
  
  function handleUpdate() {
    onUpdate({
      label,
      huntType,
      ringTimeout,
      groups: selectedGroups,
      users: selectedUsers,
    });
  }
  
  function toggleGroup(groupId: string) {
    if (selectedGroups.includes(groupId)) {
      selectedGroups = selectedGroups.filter(g => g !== groupId);
    } else {
      selectedGroups = [...selectedGroups, groupId];
    }
    handleUpdate();
  }
  
  function toggleUser(userId: string) {
    if (selectedUsers.includes(userId)) {
      selectedUsers = selectedUsers.filter(u => u !== userId);
    } else {
      selectedUsers = [...selectedUsers, userId];
    }
    handleUpdate();
  }
</script>

<div class="space-y-4">
  <!-- Label -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">Label</label>
    <input
      type="text"
      bind:value={label}
      onblur={handleUpdate}
      class="input w-full"
    />
  </div>
  
  <!-- Hunt Type -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-2">
      <Shuffle class="w-4 h-4 inline mr-1" />
      Hunt Strategy
    </label>
    <div class="space-y-2">
      {#each huntTypes as type}
        <label class="flex items-start gap-3 p-2 rounded border border-surface-300-700 cursor-pointer hover:bg-surface-300-700/50
          {huntType === type.value ? 'border-primary-500 bg-primary-500/10' : ''}">
          <input
            type="radio"
            name="huntType"
            value={type.value}
            bind:group={huntType}
            onchange={handleUpdate}
            class="radio mt-0.5"
          />
          <div>
            <span class="text-sm font-medium text-text-primary">{type.label}</span>
            <p class="text-xs text-text-secondary">{type.description}</p>
          </div>
        </label>
      {/each}
    </div>
  </div>
  
  <!-- Ring Timeout -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      <Clock class="w-4 h-4 inline mr-1" />
      Ring Timeout (seconds)
    </label>
    <input
      type="number"
      bind:value={ringTimeout}
      onblur={handleUpdate}
      class="input w-full"
      min="5"
      max="120"
    />
  </div>
  
  <!-- Groups -->
  <div>
    <h4 class="text-sm font-medium text-text-secondary mb-2">
      <Users class="w-4 h-4 inline mr-1" />
      Groups
    </h4>
    <div class="space-y-1 max-h-32 overflow-y-auto border border-surface-300-700 rounded p-2">
      {#each context.groups as group}
        <label class="flex items-center gap-2 p-1 rounded hover:bg-surface-300-700 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedGroups.includes(group.id)}
            onchange={() => toggleGroup(group.id)}
            class="checkbox"
          />
          <span class="text-sm text-text-primary">{group.name}</span>
        </label>
      {:else}
        <p class="text-sm text-text-secondary italic">No groups available</p>
      {/each}
    </div>
  </div>
  
  <!-- Users -->
  <div>
    <h4 class="text-sm font-medium text-text-secondary mb-2">
      <Users class="w-4 h-4 inline mr-1" />
      Users
    </h4>
    <div class="space-y-1 max-h-32 overflow-y-auto border border-surface-300-700 rounded p-2">
      {#each context.users as user}
        <label class="flex items-center gap-2 p-1 rounded hover:bg-surface-300-700 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedUsers.includes(user.id)}
            onchange={() => toggleUser(user.id)}
            class="checkbox"
          />
          <span class="text-sm text-text-primary">{user.name}</span>
        </label>
      {:else}
        <p class="text-sm text-text-secondary italic">No users available</p>
      {/each}
    </div>
  </div>
</div>

