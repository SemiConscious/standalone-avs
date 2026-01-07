<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { Users, Clock, Music, Volume2 } from 'lucide-svelte';
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  // Local state
  let label = $state(node.data?.label as string || 'Call Queue');
  let queueName = $state(node.data?.queueName as string || '');
  let timeout = $state(node.data?.timeout as number || 300);
  let maxWaitTime = $state(node.data?.maxWaitTime as number || 600);
  let holdMusicId = $state(node.data?.holdMusicId as string || '');
  let announcePosition = $state(node.data?.announcePosition as boolean || false);
  let announceWaitTime = $state(node.data?.announceWaitTime as boolean || false);
  let selectedGroups = $state<string[]>(node.data?.groups as string[] || []);
  let selectedUsers = $state<string[]>(node.data?.users as string[] || []);
  
  // Tabs
  let activeTab = $state<'general' | 'agents' | 'announcements' | 'advanced'>('general');
  
  function handleUpdate() {
    onUpdate({
      label,
      queueName,
      timeout,
      maxWaitTime,
      holdMusicId,
      announcePosition,
      announceWaitTime,
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
  <!-- Tabs -->
  <div class="flex border-b border-surface-300-700">
    {#each [
      { id: 'general', label: 'General', icon: Users },
      { id: 'agents', label: 'Agents', icon: Users },
      { id: 'announcements', label: 'Announce', icon: Volume2 },
      { id: 'advanced', label: 'Advanced', icon: Clock },
    ] as tab}
      <button
        class="px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
          {activeTab === tab.id 
            ? 'border-primary-500 text-primary-500' 
            : 'border-transparent text-text-secondary hover:text-text-primary'}"
        onclick={() => activeTab = tab.id as typeof activeTab}
      >
        <svelte:component this={tab.icon} class="w-4 h-4 inline mr-1" />
        {tab.label}
      </button>
    {/each}
  </div>
  
  <!-- General Tab -->
  {#if activeTab === 'general'}
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">Label</label>
        <input
          type="text"
          bind:value={label}
          onblur={handleUpdate}
          class="input w-full"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">Queue Name</label>
        <input
          type="text"
          bind:value={queueName}
          onblur={handleUpdate}
          class="input w-full"
          placeholder="e.g., Sales Queue"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">
          <Clock class="w-4 h-4 inline mr-1" />
          Ring Timeout (seconds)
        </label>
        <input
          type="number"
          bind:value={timeout}
          onblur={handleUpdate}
          class="input w-full"
          min="10"
          max="600"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">
          <Music class="w-4 h-4 inline mr-1" />
          Hold Music
        </label>
        <select
          bind:value={holdMusicId}
          onchange={handleUpdate}
          class="select w-full"
        >
          <option value="">Default hold music</option>
          {#each context.sounds as sound}
            <option value={sound.id}>{sound.name}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
  
  <!-- Agents Tab -->
  {#if activeTab === 'agents'}
    <div class="space-y-4">
      <div>
        <h4 class="text-sm font-medium text-text-secondary mb-2">Groups</h4>
        <div class="space-y-1 max-h-40 overflow-y-auto">
          {#each context.groups as group}
            <label class="flex items-center gap-2 p-2 rounded hover:bg-surface-300-700 cursor-pointer">
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
      
      <div>
        <h4 class="text-sm font-medium text-text-secondary mb-2">Users</h4>
        <div class="space-y-1 max-h-40 overflow-y-auto">
          {#each context.users as user}
            <label class="flex items-center gap-2 p-2 rounded hover:bg-surface-300-700 cursor-pointer">
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
  {/if}
  
  <!-- Announcements Tab -->
  {#if activeTab === 'announcements'}
    <div class="space-y-4">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={announcePosition}
          onchange={handleUpdate}
          class="checkbox"
        />
        <span class="text-sm text-text-primary">Announce queue position</span>
      </label>
      
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          bind:checked={announceWaitTime}
          onchange={handleUpdate}
          class="checkbox"
        />
        <span class="text-sm text-text-primary">Announce estimated wait time</span>
      </label>
    </div>
  {/if}
  
  <!-- Advanced Tab -->
  {#if activeTab === 'advanced'}
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-secondary mb-1">
          Max Wait Time (seconds)
        </label>
        <input
          type="number"
          bind:value={maxWaitTime}
          onblur={handleUpdate}
          class="input w-full"
          min="60"
          max="3600"
        />
        <p class="text-xs text-text-secondary mt-1">
          Maximum time a caller can wait in queue
        </p>
      </div>
    </div>
  {/if}
</div>

