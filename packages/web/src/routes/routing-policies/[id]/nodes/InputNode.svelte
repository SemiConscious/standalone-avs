<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { Phone, Hash, MessageSquare } from 'lucide-svelte';
  
  interface Props {
    id: string;
    data: {
      label?: string;
      phoneNumber?: string;
      extensionNumber?: string;
      containerType?: string;
    };
    selected?: boolean;
  }
  
  let { id, data, selected = false }: Props = $props();
  
  const containerIcons: Record<string, typeof Phone> = {
    inboundNumber: Phone,
    extensionNumber: Hash,
    inboundMessage: MessageSquare,
  };
  
  const Icon = $derived(containerIcons[data.containerType || 'inboundNumber'] || Phone);
</script>

<div
  class="input-node px-4 py-3 rounded-lg border-2 transition-all duration-200
    {selected ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'border-primary-500/50'}
    bg-gradient-to-br from-primary-500/20 to-primary-600/10"
>
  <Handle
    type="target"
    position={Position.Left}
    class="!w-3 !h-3 !bg-primary-500 !border-2 !border-primary-300"
  />
  
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-lg bg-primary-500/30 flex items-center justify-center">
      <Icon class="w-5 h-5 text-text-primary" />
    </div>
    <div class="flex flex-col">
      <span class="font-medium text-text-primary text-sm">
        {data.label || 'Input'}
      </span>
      {#if data.phoneNumber}
        <span class="text-xs text-text-secondary">{data.phoneNumber}</span>
      {:else if data.extensionNumber}
        <span class="text-xs text-text-secondary">Ext: {data.extensionNumber}</span>
      {/if}
    </div>
  </div>
  
  <Handle
    type="source"
    position={Position.Right}
    class="!w-3 !h-3 !bg-primary-500 !border-2 !border-primary-300"
  />
</div>

<style>
  .input-node {
    min-width: 160px;
  }
</style>

