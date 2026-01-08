<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { Square, PhoneOff, ArrowRight } from 'lucide-svelte';
  
  interface Props {
    id: string;
    data: {
      label?: string;
      outputType?: 'end' | 'hangup' | 'toPolicy';
      targetPolicy?: string;
    };
    selected?: boolean;
  }
  
  let { id, data, selected = false }: Props = $props();
  
  const outputConfig: Record<string, { icon: typeof Square; color: string }> = {
    end: { icon: Square, color: 'error' },
    hangup: { icon: PhoneOff, color: 'error' },
    toPolicy: { icon: ArrowRight, color: 'warning' },
  };
  
  const config = $derived(outputConfig[data.outputType || 'end'] || outputConfig.end);
  const Icon = $derived(config.icon);
</script>

<div
  class="output-node px-4 py-3 rounded-lg border-2 transition-all duration-200
    {selected ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'border-error-500/50'}
    bg-gradient-to-br from-error-500/20 to-error-600/10"
>
  <Handle
    type="target"
    position={Position.Left}
    class="!w-3 !h-3 !bg-error-500 !border-2 !border-error-300"
  />
  
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 rounded-full bg-error-500 flex items-center justify-center">
      <Icon class="w-4 h-4 text-white" />
    </div>
    <div class="flex flex-col">
      <span class="font-medium text-error-400">
        {data.label || 'End'}
      </span>
      {#if data.outputType === 'toPolicy' && data.targetPolicy}
        <span class="text-xs text-text-secondary">→ {data.targetPolicy}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .output-node {
    min-width: 120px;
  }
</style>

