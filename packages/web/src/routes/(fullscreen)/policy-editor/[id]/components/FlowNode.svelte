<script lang="ts">
  import { 
    Phone, PhoneIncoming, PhoneOutgoing, Users, GitBranch, 
    MessageSquare, Mic, Bot, Database, FileText, Settings,
    Voicemail, Send, Clock, AlertTriangle, Search, Workflow,
    Square, Play, Hash, ChevronRight
  } from 'lucide-svelte';
  import { getNodeDisplayTitle, getNodeDisplayDescription } from '$lib/policy-editor';
  
  interface SubItem {
    id: string;
    name?: string;
    data?: { name?: string; label?: string };
  }
  
  interface Output {
    id: string;
    title?: string;
    name?: string;
    data?: { title?: string; name?: string; label?: string };
  }
  
  interface FlowNodeData {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
      label?: string;
      title?: string;
      name?: string;
      description?: string;
      subItems?: SubItem[];
      outputs?: Output[];
      [key: string]: unknown;
    };
    selected?: boolean;
    width?: number;
    height?: number;
  }
  
  interface Props {
    node: FlowNodeData;
    selected?: boolean;
    onDoubleClick?: () => void;
  }
  
  let { node, selected = false, onDoubleClick }: Props = $props();
  
  // Node type configurations with icons and colors
  const nodeConfig: Record<string, { icon: typeof Play; iconColor: string; borderHue: string }> = {
    init: { icon: Play, iconColor: '#22c55e', borderHue: '142' },
    input: { icon: PhoneIncoming, iconColor: '#3b82f6', borderHue: '217' },
    inboundNumber: { icon: Phone, iconColor: '#3b82f6', borderHue: '217' },
    extensionNumber: { icon: Hash, iconColor: '#60a5fa', borderHue: '217' },
    inboundMessage: { icon: MessageSquare, iconColor: '#93c5fd', borderHue: '217' },
    output: { icon: PhoneOutgoing, iconColor: '#ef4444', borderHue: '0' },
    end: { icon: Square, iconColor: '#ef4444', borderHue: '0' },
    callQueue: { icon: Users, iconColor: '#f59e0b', borderHue: '38' },
    huntGroup: { icon: Users, iconColor: '#f97316', borderHue: '25' },
    connectCall: { icon: PhoneOutgoing, iconColor: '#06b6d4', borderHue: '188' },
    rule: { icon: GitBranch, iconColor: '#8b5cf6', borderHue: '258' },
    speak: { icon: MessageSquare, iconColor: '#ec4899', borderHue: '330' },
    recordCall: { icon: Mic, iconColor: '#f43f5e', borderHue: '350' },
    voicemail: { icon: Voicemail, iconColor: '#3b82f6', borderHue: '217' },
    natterboxAI: { icon: Bot, iconColor: '#a855f7', borderHue: '280' },
    queryObject: { icon: Database, iconColor: '#10b981', borderHue: '160' },
    createRecord: { icon: FileText, iconColor: '#14b8a6', borderHue: '173' },
    manageProperties: { icon: Settings, iconColor: '#64748b', borderHue: '215' },
    notify: { icon: Send, iconColor: '#0ea5e9', borderHue: '199' },
    retry: { icon: Clock, iconColor: '#eab308', borderHue: '48' },
    switchBoard: { icon: Search, iconColor: '#84cc16', borderHue: '84' },
    debug: { icon: AlertTriangle, iconColor: '#ef4444', borderHue: '0' },
    omniChannelFlow: { icon: Workflow, iconColor: '#d946ef', borderHue: '292' },
    default: { icon: Settings, iconColor: '#94a3b8', borderHue: '215' }
  };
  
  const config = $derived(nodeConfig[node.type] || nodeConfig.default);
  const Icon = $derived(config.icon);
  
  // Use proper label generation with NODE_DISPLAY_INFO overrides
  const label = $derived(() => {
    // First try explicit label
    if (node.data?.label) return node.data.label;
    
    // Then use the display title function for proper overrides
    return getNodeDisplayTitle({
      title: node.data?.title,
      name: node.data?.name,
      data: {
        title: node.data?.title,
        name: node.data?.name,
      },
    });
  });
  
  // Get proper description with overrides
  const description = $derived(() => {
    return getNodeDisplayDescription({
      title: node.data?.title || node.data?.name,
      data: {
        description: node.data?.description,
      },
    });
  });
  
  // Get sub-items to display (phone numbers, outputs, etc.)
  const subItems = $derived(node.data?.subItems || []);
  const outputs = $derived(node.data?.outputs || []);
  const hasSubItems = $derived(subItems.length > 0 || outputs.length > 0);
  
  // Determine if this node type has input/output handles
  const hasInputHandle = $derived(!['init', 'input', 'inboundNumber', 'extensionNumber', 'inboundMessage'].includes(node.type));
  const hasOutputHandle = $derived(!['output', 'end'].includes(node.type));
  
  // Calculate dimensions
  const baseHeight = 60;
  const subItemHeight = 28;
  const maxDisplayItems = 5;
  
  const displayItems = $derived(() => {
    const items = [...subItems, ...outputs];
    if (items.length <= maxDisplayItems) return items;
    return items.slice(0, maxDisplayItems - 1);
  });
  
  const hiddenCount = $derived(() => {
    const total = subItems.length + outputs.length;
    if (total <= maxDisplayItems) return 0;
    return total - maxDisplayItems + 1;
  });
  
  const calculatedHeight = $derived(() => {
    if (!hasSubItems) return baseHeight;
    const itemCount = Math.min(subItems.length + outputs.length, maxDisplayItems);
    return baseHeight + (itemCount * subItemHeight);
  });
  
  const width = node.width || 150;
  const height = $derived(node.height || calculatedHeight());
  
  // Get item label
  function getItemLabel(item: SubItem | Output): string {
    return item.data?.label 
      || item.data?.name 
      || item.data?.title 
      || (item as SubItem).name 
      || (item as Output).title 
      || 'Item';
  }
</script>

<div 
  class="flow-node absolute rounded-lg cursor-move select-none transition-all"
  class:selected
  style="
    left: {node.position.x}px; 
    top: {node.position.y}px; 
    width: {width}px; 
    min-height: {height}px;
    --node-border-hue: {config.borderHue};
  "
  data-node-id={node.id}
  ondblclick={onDoubleClick}
  role="button"
  tabindex="0"
>
  <!-- Input Handle -->
  {#if hasInputHandle}
    <div 
      class="node-handle input-handle"
      data-handle-type="target"
      style="top: {height / 2}px;"
    ></div>
  {/if}
  
  <!-- Node Header -->
  <div class="flex items-center gap-3 p-3">
    <div class="flex-shrink-0" style="color: {config.iconColor}">
      <svelte:component this={Icon} class="w-5 h-5" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="node-label text-sm font-semibold truncate">
        {label()}
      </div>
      {#if description() && !hasSubItems}
        <div class="node-description text-xs truncate">
          {description()}
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Sub-items / Outputs -->
  {#if hasSubItems}
    <div class="sub-items-container">
      {#each displayItems() as item, index (item.id || index)}
        <div class="sub-item">
          <ChevronRight class="w-3 h-3 flex-shrink-0 opacity-50" />
          <span class="truncate">{getItemLabel(item)}</span>
        </div>
      {/each}
      {#if hiddenCount() > 0}
        <div class="sub-item more-items">
          <span class="text-xs opacity-70">+{hiddenCount()} more...</span>
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Output Handle -->
  {#if hasOutputHandle}
    <div 
      class="node-handle output-handle"
      data-handle-type="source"
      style="top: {height / 2}px;"
    ></div>
  {/if}
  
  <!-- Rule node has multiple output handles -->
  {#if node.type === 'rule'}
    <div 
      class="node-handle output-handle-true"
      data-handle-type="source"
      data-handle-id="true"
      title="True"
      style="top: {height * 0.25}px;"
    ></div>
    <div 
      class="node-handle output-handle-false"
      data-handle-type="source"
      data-handle-id="false"
      title="False"
      style="top: {height * 0.75}px;"
    ></div>
  {/if}
</div>

<style>
  .flow-node {
    background-color: rgb(var(--color-surface-800));
    border: 1px solid hsl(var(--node-border-hue, 215), 30%, 40%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .flow-node:hover {
    border-color: hsl(var(--node-border-hue, 215), 40%, 50%);
  }
  
  .flow-node.selected {
    border-color: rgb(var(--color-primary-500));
    box-shadow: 0 0 0 2px rgba(var(--color-primary-500), 0.3), 0 4px 12px rgba(0, 0, 0, 0.4);
  }
  
  .node-label {
    color: rgb(var(--color-surface-100));
  }
  
  .node-description {
    color: rgb(var(--color-surface-400));
  }
  
  .sub-items-container {
    border-top: 1px solid hsl(var(--node-border-hue, 215), 20%, 30%);
    margin: 0 8px 8px 8px;
    padding-top: 6px;
  }
  
  .sub-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    font-size: 0.75rem;
    color: rgb(var(--color-surface-300));
    border-radius: 4px;
    margin-bottom: 2px;
  }
  
  .sub-item:hover {
    background-color: rgba(var(--color-surface-700), 0.5);
  }
  
  .more-items {
    color: rgb(var(--color-surface-400));
    font-style: italic;
  }
  
  .node-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: rgb(var(--color-surface-500));
    border: 2px solid rgb(var(--color-surface-800));
    cursor: crosshair;
    transition: all 0.15s ease;
  }
  
  .node-handle:hover {
    background-color: rgb(var(--color-primary-500));
    transform: scale(1.3);
  }
  
  .input-handle {
    left: -5px;
    transform: translateY(-50%);
  }
  
  .input-handle:hover {
    transform: translateY(-50%) scale(1.3);
  }
  
  .output-handle {
    right: -5px;
    transform: translateY(-50%);
  }
  
  .output-handle:hover {
    transform: translateY(-50%) scale(1.3);
  }
  
  .output-handle-true {
    right: -5px;
    transform: translateY(-50%);
    background-color: #22c55e;
  }
  
  .output-handle-true:hover {
    transform: translateY(-50%) scale(1.3);
    background-color: #4ade80;
  }
  
  .output-handle-false {
    right: -5px;
    transform: translateY(-50%);
    background-color: #ef4444;
  }
  
  .output-handle-false:hover {
    transform: translateY(-50%) scale(1.3);
    background-color: #f87171;
  }
</style>
