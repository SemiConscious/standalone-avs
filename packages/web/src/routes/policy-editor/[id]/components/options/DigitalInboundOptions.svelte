<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { CheckSquare, Square, Loader2, RefreshCw, Search } from 'lucide-svelte';
  
  interface DigitalChannel {
    id: string;
    name: string;
    address: string;
    channelType: string;
    disabled?: boolean;
  }
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Inbound Digital Address');
  let selectedChannels = $state<string[]>((node.data?.selectedChannels as string[]) || []);
  let isLoading = $state(false);
  let searchQuery = $state('');
  
  // Available digital channels (loaded from API)
  let availableChannels = $state<DigitalChannel[]>([]);
  
  // Filter channels based on search
  const filteredChannels = $derived(
    availableChannels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.channelType.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  // Load digital channels (would call the omnichannel service in practice)
  async function loadChannels() {
    isLoading = true;
    try {
      // In a real implementation, this would call the API:
      // const response = await fetch('/api/omnichannel/channels');
      // availableChannels = await response.json();
      
      // For now, use demo data
      availableChannels = [
        { id: 'wa-1', name: 'Main WhatsApp', address: '+1 555 0100', channelType: 'WHATSAPP', disabled: false },
        { id: 'wa-2', name: 'Support WhatsApp', address: '+1 555 0101', channelType: 'WHATSAPP', disabled: false },
        { id: 'sms-1', name: 'Marketing SMS', address: '+1 555 0200', channelType: 'SMS', disabled: false },
        { id: 'email-1', name: 'Support Email', address: 'support@example.com', channelType: 'EMAIL', disabled: false },
        { id: 'chat-1', name: 'Website Chat', address: 'webchat.example.com', channelType: 'WEBCHAT', disabled: false },
      ];
    } catch (e) {
      console.error('Failed to load digital channels:', e);
    } finally {
      isLoading = false;
    }
  }
  
  function handleLabelChange() {
    onUpdate({ label });
  }
  
  function toggleChannel(channelId: string) {
    if (selectedChannels.includes(channelId)) {
      selectedChannels = selectedChannels.filter(id => id !== channelId);
    } else {
      selectedChannels = [...selectedChannels, channelId];
    }
    
    // Build subItems from selected channels
    const subItems = availableChannels
      .filter(ch => selectedChannels.includes(ch.id))
      .map(ch => ({
        id: ch.id,
        name: `${ch.name} (${ch.address})`,
        channelType: ch.channelType,
        address: ch.address,
      }));
    
    onUpdate({ selectedChannels, subItems });
  }
  
  function selectAll() {
    selectedChannels = filteredChannels.filter(ch => !ch.disabled).map(ch => ch.id);
    const subItems = availableChannels
      .filter(ch => selectedChannels.includes(ch.id))
      .map(ch => ({
        id: ch.id,
        name: `${ch.name} (${ch.address})`,
        channelType: ch.channelType,
        address: ch.address,
      }));
    onUpdate({ selectedChannels, subItems });
  }
  
  function deselectAll() {
    selectedChannels = [];
    onUpdate({ selectedChannels, subItems: [] });
  }
  
  function getChannelTypeColor(type: string): string {
    switch (type) {
      case 'WHATSAPP': return 'bg-green-500/10 text-green-400';
      case 'SMS': return 'bg-blue-500/10 text-blue-400';
      case 'EMAIL': return 'bg-purple-500/10 text-purple-400';
      case 'WEBCHAT': return 'bg-orange-500/10 text-orange-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  }
  
  // Load channels on mount
  $effect(() => {
    loadChannels();
  });
</script>

<div class="space-y-4">
  <!-- Label -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Label
    </label>
    <input
      type="text"
      bind:value={label}
      onblur={handleLabelChange}
      class="input w-full"
      placeholder="Enter label..."
    />
  </div>
  
  <!-- Channel Selection -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="block text-sm font-medium text-text-secondary">
        Digital Channels
      </label>
      <button
        type="button"
        onclick={loadChannels}
        disabled={isLoading}
        class="p-1 hover:bg-surface-100-900 rounded transition-colors"
        title="Refresh channels"
      >
        {#if isLoading}
          <Loader2 class="w-4 h-4 animate-spin" />
        {:else}
          <RefreshCw class="w-4 h-4" />
        {/if}
      </button>
    </div>
    
    <!-- Search -->
    <div class="relative mb-2">
      <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <input
        type="text"
        bind:value={searchQuery}
        class="input w-full pl-8"
        placeholder="Search channels..."
      />
    </div>
    
    <!-- Select/Deselect All -->
    <div class="flex gap-2 mb-2">
      <button
        type="button"
        onclick={selectAll}
        class="text-xs text-accent hover:underline"
      >
        Select all
      </button>
      <span class="text-text-secondary">|</span>
      <button
        type="button"
        onclick={deselectAll}
        class="text-xs text-accent hover:underline"
      >
        Deselect all
      </button>
    </div>
    
    <!-- Channel List -->
    <div class="max-h-64 overflow-y-auto border border-surface-300-700 rounded">
      {#if isLoading}
        <div class="p-4 text-center text-text-secondary">
          <Loader2 class="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading channels...
        </div>
      {:else if filteredChannels.length === 0}
        <div class="p-4 text-center text-text-secondary">
          No channels found
        </div>
      {:else}
        {#each filteredChannels as channel (channel.id)}
          <button
            type="button"
            onclick={() => toggleChannel(channel.id)}
            disabled={channel.disabled}
            class="w-full p-2 flex items-start gap-2 hover:bg-surface-100-900 transition-colors text-left border-b border-surface-300-700 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="pt-0.5">
              {#if selectedChannels.includes(channel.id)}
                <CheckSquare class="w-4 h-4 text-accent" />
              {:else}
                <Square class="w-4 h-4 text-text-secondary" />
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium truncate">{channel.name}</span>
                <span class="text-xs px-1.5 py-0.5 rounded {getChannelTypeColor(channel.channelType)}">
                  {channel.channelType}
                </span>
              </div>
              <div class="text-xs text-text-secondary truncate">
                {channel.address}
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
    
    <p class="text-xs text-text-secondary mt-1">
      {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} selected
    </p>
  </div>
  
  <!-- Node Info -->
  <div class="pt-4 border-t border-surface-300-700">
    <h4 class="text-sm font-medium text-text-secondary mb-2">Node Info</h4>
    <dl class="text-xs space-y-1">
      <div class="flex justify-between">
        <dt class="text-text-secondary">ID:</dt>
        <dd class="text-text-primary font-mono">{node.id}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-text-secondary">Type:</dt>
        <dd class="text-text-primary">{node.type}</dd>
      </div>
    </dl>
  </div>
</div>

