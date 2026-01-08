<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { Play } from 'lucide-svelte';
  
  interface Props {
    id: string;
    data: {
      label?: string;
    };
    selected?: boolean;
  }
  
  let { id, data, selected = false }: Props = $props();
</script>

<div
  class="init-node px-4 py-3 rounded-lg border-2 transition-all duration-200
    {selected ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'border-success-500/50'}
    bg-gradient-to-br from-success-500/20 to-success-600/10"
>
  <div class="flex items-center gap-2">
    <div class="w-8 h-8 rounded-full bg-success-500 flex items-center justify-center">
      <Play class="w-4 h-4 text-white" />
    </div>
    <span class="font-medium text-success-400">
      {data.label || 'Start'}
    </span>
  </div>
  
  <Handle
    type="source"
    position={Position.Right}
    class="!w-3 !h-3 !bg-success-500 !border-2 !border-success-300"
  />
</div>

<style>
  .init-node {
    min-width: 120px;
  }
</style>

