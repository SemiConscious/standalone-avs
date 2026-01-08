<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { FolderOpen } from 'lucide-svelte';
  
  interface Props {
    id: string;
    data: {
      label?: string;
      color?: string;
      collapsed?: boolean;
    };
    selected?: boolean;
    style?: string;
  }
  
  let { id, data, selected = false, style = '' }: Props = $props();
</script>

<div
  class="group-node rounded-xl border-2 border-dashed transition-all duration-200
    {selected ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-violet-500/40'}
    bg-violet-500/5"
  {style}
>
  <Handle
    type="target"
    position={Position.Left}
    class="!w-3 !h-3 !bg-violet-500 !border-2 !border-violet-300"
  />
  
  <!-- Group header -->
  <div class="absolute -top-3 left-3 px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/40">
    <div class="flex items-center gap-1.5">
      <FolderOpen class="w-3 h-3 text-violet-400" />
      <span class="text-xs font-medium text-violet-400">
        {data.label || 'Group'}
      </span>
    </div>
  </div>
  
  <!-- Group content area - child nodes render here -->
  <div class="p-4 pt-6 min-h-[100px]">
    <slot />
  </div>
  
  <Handle
    type="source"
    position={Position.Right}
    class="!w-3 !h-3 !bg-violet-500 !border-2 !border-violet-300"
  />
</div>

<style>
  .group-node {
    min-width: 200px;
    min-height: 150px;
  }
</style>

