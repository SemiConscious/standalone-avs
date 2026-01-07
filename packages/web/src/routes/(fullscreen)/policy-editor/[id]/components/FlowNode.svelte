<script lang="ts">
  import { 
    Phone, PhoneIncoming, PhoneOutgoing, Users, GitBranch, 
    MessageSquare, Mic, Bot, Database, FileText, Settings,
    Voicemail, Send, Clock, AlertTriangle, Search, Workflow,
    Square, Play, Hash, ChevronRight
  } from 'lucide-svelte';
  import { getNodeDisplayTitle, getNodeDisplayDescription } from '$lib/policy-editor';
  
  /**
   * FlowNode - Unified node component for the policy editor
   * 
   * Supports two rendering modes:
   * 1. Container mode ("burger" style) - for Action, SwitchBoard, etc.
   * 2. Simple mode - for leaf nodes like Init, Input, Output
   * 
   * Container nodes have:
   * - Upper bun (header) with entry handle
   * - Body with child items ("meat")
   * - Lower bun (footer) with default output handle
   */
  
  interface SubItem {
    id: string;
    name?: string;
    title?: string;
    templateClass?: string;
    data?: { name?: string; label?: string; title?: string };
  }
  
  interface Output {
    id: string;
    title?: string;
    name?: string;
    templateClass?: string;
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
      templateClass?: string;
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
    onChildDoubleClick?: (childId: string, child: SubItem | Output) => void;
    onAppDrop?: (nodeId: string, appType: string, appLabel: string) => void;
  }
  
  let { node, selected = false, onDoubleClick, onChildDoubleClick, onAppDrop }: Props = $props();
  
  // Handle double-click on a child item
  function handleChildDblClick(e: MouseEvent, childId: string, child: SubItem | Output) {
    e.stopPropagation(); // Prevent container double-click from firing
    onChildDoubleClick?.(childId, child);
  }
  
  // State for drag-over visual feedback
  let isDragOver = $state(false);
  
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    isDragOver = true;
  }
  
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragOver = false;
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragOver = false;
    
    const data = e.dataTransfer?.getData('application/json');
    if (!data || !onAppDrop) return;
    
    try {
      const appData = JSON.parse(data);
      onAppDrop(node.id, appData.type, appData.label);
    } catch (err) {
      console.error('Failed to parse dropped app data:', err);
    }
  }
  
  // Determine if this is a container node (burger style) or simple node
  const containerTypes = [
    'action', 'default', 'switchBoard', 'natterboxAI', 'finish', 
    'toPolicy', 'fromPolicy', 'omniChannelFlow', 'inboundNumber',
    'extensionNumber', 'digital', 'invokableDestination', 'sipTrunk',
    'aiSupportChat', 'inboundMessage', 'ddi'
  ];
  
  // Map templateClass to our type system
  function getNodeType(templateClass?: string, nodeType?: string): string {
    const classMap: Record<string, string> = {
      'ModAction': 'action',
      'ModFromPolicy': 'init',
      'ModNumber': 'inboundNumber',
      'ModNumber_Public': 'inboundNumber',
      'ModAction_Say': 'speak',
      'ModAction_Record': 'recordCall',
      'ModAction_Notify': 'notify',
      'ModConnect': 'connectCall',
      'ModConnector_SFQuery': 'queryObject',
      'ModVoicemail': 'voicemail',
      'ModHuntGroup': 'huntGroup',
      'ModCallQueue': 'callQueue',
      'ModRule': 'rule',
      'ModNatterboxAI': 'natterboxAI',
      'ModSwitchboard': 'switchBoard',
      'ModFinish': 'finish',
      'ModToPolicy': 'toPolicy',
      'ModOmniChannelFlow': 'omniChannelFlow',
    };
    
    if (templateClass && classMap[templateClass]) {
      return classMap[templateClass];
    }
    return nodeType || 'default';
  }
  
  const effectiveType = $derived(getNodeType(node.data?.templateClass, node.type));
  const isContainer = $derived(containerTypes.includes(effectiveType));
  
  // Container colors - refined, more pleasant palette
  // Softer, more sophisticated versions of the original colors
  const containerColors: Record<string, { header: string; footer: string }> = {
    action: { header: '#3ba99e', footer: '#3ba99e' },        // Softer teal-green
    default: { header: '#3ba99e', footer: '#3ba99e' },
    natterboxAI: { header: '#4ea8a0', footer: '#4ea8a0' },   // Muted teal
    switchBoard: { header: '#c46b8a', footer: '#c46b8a' },   // Dusty rose
    finish: { header: '#5e6578', footer: '#5e6578' },        // Slate gray
    toPolicy: { header: '#8e6aaf', footer: '#8e6aaf' },      // Soft purple
    fromPolicy: { header: '#8e6aaf', footer: '#8e6aaf' },
    omniChannelFlow: { header: '#4a9ec7', footer: '#4a9ec7' }, // Soft blue
    inboundNumber: { header: '#d4a24a', footer: '#d4a24a' }, // Warm gold
    digital: { header: '#d4a24a', footer: '#d4a24a' },
    extensionNumber: { header: '#c98860', footer: '#c98860' }, // Terracotta
    invokableDestination: { header: '#4a98b0', footer: '#4a98b0' }, // Ocean blue
    sipTrunk: { header: '#4a98b0', footer: '#4a98b0' },
    aiSupportChat: { header: '#5a6075', footer: '#5a6075' }, // Blue-gray
    inboundMessage: { header: '#5a9bc7', footer: '#5a9bc7' }, // Sky blue
    ddi: { header: '#b06888', footer: '#b06888' },           // Muted pink
  };
  
  // Simple node icon/color config
  const nodeConfig: Record<string, { icon: typeof Play; iconColor: string; borderHue: string }> = {
    init: { icon: Play, iconColor: '#22c55e', borderHue: '142' },
    input: { icon: PhoneIncoming, iconColor: '#3b82f6', borderHue: '217' },
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
    action: { icon: Play, iconColor: '#2ecbbf', borderHue: '174' },
    default: { icon: Settings, iconColor: '#94a3b8', borderHue: '215' }
  };
  
  const colors = $derived(containerColors[effectiveType] || containerColors.default);
  const config = $derived(nodeConfig[effectiveType] || nodeConfig.default);
  const Icon = $derived(config.icon);
  
  // Label
  const label = $derived(() => {
    if (node.data?.label) return node.data.label;
    return getNodeDisplayTitle({
      title: node.data?.title,
      name: node.data?.name,
      data: { title: node.data?.title, name: node.data?.name },
    });
  });
  
  // Description
  const description = $derived(() => {
    return getNodeDisplayDescription({
      title: node.data?.title || node.data?.name,
      data: { description: node.data?.description },
    });
  });
  
  // Child items for container nodes
  const childItems = $derived(() => {
    const outputs = node.data?.outputs || [];
    const subItems = node.data?.subItems || [];
    return [...outputs, ...subItems];
  });
  
  const hasChildren = $derived(childItems().length > 0);
  
  // Get child item display name
  function getItemName(item: SubItem | Output): string {
    return item.data?.label || item.data?.name || item.data?.title || item.name || item.title || 'Item';
  }
  
  // Handles configuration
  const hasInputHandle = $derived(!['init', 'input', 'inboundNumber', 'extensionNumber', 'inboundMessage', 'fromPolicy'].includes(effectiveType));
  const hasOutputHandle = $derived(!['output', 'end', 'finish'].includes(effectiveType));
  
  // Dimensions
  const containerWidth = 200;
  const headerHeight = 30;
  const footerHeight = 30;
  const childItemHeight = 32;
  const dividerHeight = 1;
  
  const simpleWidth = 150;
  const simpleBaseHeight = 60;
  const simpleSubItemHeight = 28;
  const maxDisplayItems = 5;
  
  // Container dimensions - body only exists when there are children
  const containerBodyHeight = $derived(() => {
    const items = childItems();
    if (items.length === 0) return 0; // No body when no children
    return items.length * childItemHeight;
  });
  
  const containerTotalHeight = $derived(() => {
    if (!hasChildren) {
      // Header + single divider + footer
      return headerHeight + dividerHeight + footerHeight;
    }
    // Header + divider + body + divider + footer
    return headerHeight + dividerHeight + containerBodyHeight() + dividerHeight + footerHeight;
  });
  
  // Simple node dimensions
  const displayItems = $derived(() => {
    const items = childItems();
    if (items.length <= maxDisplayItems) return items;
    return items.slice(0, maxDisplayItems - 1);
  });
  
  const hiddenCount = $derived(() => {
    const total = childItems().length;
    if (total <= maxDisplayItems) return 0;
    return total - maxDisplayItems + 1;
  });
  
  const simpleHeight = $derived(() => {
    if (!hasChildren) return simpleBaseHeight;
    const itemCount = Math.min(childItems().length, maxDisplayItems);
    return simpleBaseHeight + (itemCount * simpleSubItemHeight);
  });
  
  // Final dimensions
  const width = $derived(node.width || (isContainer ? containerWidth : simpleWidth));
  const height = $derived(node.height || (isContainer ? containerTotalHeight() : simpleHeight()));
</script>

{#if isContainer}
  <!-- Container Node (Burger Style) -->
  <div 
    class="container-node absolute select-none transition-all duration-200"
    class:selected
    style="
      left: {node.position.x}px; 
      top: {node.position.y}px; 
      width: {width}px;
    "
    data-node-id={node.id}
    ondblclick={onDoubleClick}
    role="button"
    tabindex="0"
  >
    <!-- Input Handle (on upper bun) -->
    {#if hasInputHandle}
      <div 
        class="node-handle input-handle"
        data-handle-type="target"
        style="top: {headerHeight / 2}px;"
      ></div>
    {/if}
    
    <!-- Upper Bun (Header) -->
    <div 
      class="container-header"
      style="background-color: {colors.header}; height: {headerHeight}px;"
    >
      <span class="container-name">{label()}</span>
    </div>
    
    <!-- Divider between header and body/footer -->
    <div class="bun-divider"></div>
    
    <!-- Body - Only shown when there are children, otherwise just a thin divider -->
    {#if hasChildren}
      <div 
        class="container-body"
        class:drag-over={isDragOver}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        role="region"
        aria-label="Drop zone for apps"
      >
        {#each childItems() as item, index (item.id || index)}
          <div 
            class="child-item"
            ondblclick={(e) => handleChildDblClick(e, item.id, item)}
            role="button"
            tabindex="0"
          >
            <span class="item-name">{getItemName(item)}</span>
            
            <!-- Per-child output handle (pink circle with +) -->
            <div 
              class="child-output-handle"
              data-handle-type="source"
              data-handle-id={item.id}
            ></div>
          </div>
        {/each}
      </div>
      
      <!-- Divider between body and footer -->
      <div class="bun-divider"></div>
    {/if}
    
    <!-- Lower Bun (Footer) - Default Output -->
    <div 
      class="container-footer"
      style="background-color: {colors.footer}; height: {footerHeight}px;"
    >
      {#if hasOutputHandle}
        <div 
          class="node-handle output-handle footer-output"
          data-handle-type="source"
          data-handle-id="default"
        ></div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Simple Node -->
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
        class="simple-handle input-handle"
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
        {#if description() && !hasChildren}
          <div class="node-description text-xs truncate">
            {description()}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Sub-items / Outputs (for simple nodes that still have children) -->
    {#if hasChildren}
      <div class="sub-items-container">
        {#each displayItems() as item, index (item.id || index)}
          <div class="sub-item">
            <ChevronRight class="w-3 h-3 flex-shrink-0 opacity-50" />
            <span class="truncate">{getItemName(item)}</span>
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
        class="simple-handle output-handle"
        data-handle-type="source"
        style="top: {height / 2}px;"
      ></div>
    {/if}
    
    <!-- Rule node has multiple output handles -->
    {#if effectiveType === 'rule'}
      <div 
        class="simple-handle output-handle-true"
        data-handle-type="source"
        data-handle-id="true"
        title="True"
        style="top: {height * 0.25}px;"
      ></div>
      <div 
        class="simple-handle output-handle-false"
        data-handle-type="source"
        data-handle-id="false"
        title="False"
        style="top: {height * 0.75}px;"
      ></div>
    {/if}
  </div>
{/if}

<style>
  /* ===== Container Node Styles (Burger) ===== */
  .container-node {
    border-radius: 8px;
    overflow: visible; /* Allow handles to extend beyond container */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    cursor: move;
  }
  
  .container-node:hover {
    box-shadow: 0 0 0 3px rgba(207, 215, 230, 0.6);
  }
  
  .container-node.selected {
    box-shadow: 
      0 0 0 3px rgba(12, 142, 255, 0.9),
      0 0 20px 4px rgba(12, 142, 255, 0.4),
      0 8px 24px rgba(0, 0, 0, 0.3);
  }
  
  /* Upper Bun - Header */
  .container-header {
    color: white;
    font-size: 0.8125rem;
    font-weight: 500;
    padding: 6px 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border-radius: 8px 8px 0 0; /* Round top corners */
    position: relative;
  }
  
  .container-header:hover {
    filter: brightness(1.1);
  }
  
  .container-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
  
  /* Divider between buns and meat - same color as child dividers */
  .bun-divider {
    height: 1px;
    background-color: #c0c8d4;
  }
  
  /* Body - Contains child items (no landing zone pattern) */
  .container-body {
    background-color: #eef1f6;
    transition: all 0.2s ease;
  }
  
  .container-body.drag-over {
    background-color: rgba(12, 142, 255, 0.15);
    box-shadow: inset 0 0 0 2px rgb(var(--color-primary-500));
  }
  
  /* Child Items (Meat) - styled like React app */
  .child-item {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 20px 0 10px;
    background-color: #eef1f6;
    font-size: 0.8125rem;
    color: #4f6a92;
    cursor: pointer;
    position: relative;
    border-bottom: 1px solid #c0c8d4; /* Darker grey divider between children */
    transition: background-color 0.15s ease;
  }
  
  .child-item:last-child {
    border-bottom: none; /* No divider after last child */
  }
  
  .child-item:hover {
    background-color: #cfd7e6;
  }
  
  .item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-left: 6px;
  }
  
  /* Per-child output handle (pink circle with +) */
  .child-output-handle {
    position: absolute;
    right: -7px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 15px;
    border-radius: 50%;
    cursor: crosshair;
    transition: all 0.15s ease;
    z-index: 10;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="8" fill="%23EC6281"/><polygon points="8.29 3.47 7.69 3.47 7.69 7.71 3.47 7.71 3.47 8.31 7.69 8.31 7.69 12.53 8.29 12.53 8.29 8.31 12.53 8.31 12.53 7.71 8.29 7.71" fill="%23fff"/></svg>') no-repeat 50%;
    background-size: contain;
  }
  
  .child-output-handle:hover {
    transform: translateY(-50%) scale(1.2);
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="8" fill="%234BC076"/><polygon points="8.29 3.47 7.69 3.47 7.69 7.71 3.47 7.71 3.47 8.31 7.69 8.31 7.69 12.53 8.29 12.53 8.29 8.31 12.53 8.31 12.53 7.71 8.29 7.71" fill="%23fff"/></svg>') no-repeat 50%;
    background-size: contain;
  }
  
  /* Lower Bun - Footer */
  .container-footer {
    position: relative;
    display: flex;
    align-items: center;
    padding: 6px 20px;
    color: white;
    font-size: 0.8125rem;
    font-weight: 500;
    border-radius: 0 0 8px 8px; /* Round bottom corners */
  }
  
  .footer-output {
    position: absolute;
    right: -7px;
    top: 50%;
    transform: translateY(-50%);
  }
  
  /* Container Handles */
  .node-handle {
    position: absolute;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    cursor: crosshair;
    transition: all 0.15s ease;
    z-index: 10;
  }
  
  .node-handle.input-handle {
    left: -7px;
    transform: translateY(-50%);
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="8" fill="%23a6b8d2"/><polygon points="5.74 12.4 12.06 7.92 5.74 3.44 5.74 4.26 10.9 7.92 5.74 11.57 5.74 12.4" fill="%23fff" /></svg>') no-repeat 50%;
    background-size: contain;
  }
  
  .node-handle.input-handle:hover {
    transform: translateY(-50%) scale(1.3);
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="8" fill="%234BC076"/><polygon points="5.74 12.4 12.06 7.92 5.74 3.44 5.74 4.26 10.9 7.92 5.74 11.57 5.74 12.4" fill="%23fff" /></svg>') no-repeat 50%;
    background-size: contain;
  }
  
  .node-handle.output-handle {
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="8" fill="%23EC6281"/><polygon points="8.29 3.47 7.69 3.47 7.69 7.71 3.47 7.71 3.47 8.31 7.69 8.31 7.69 12.53 8.29 12.53 8.29 8.31 12.53 8.31 12.53 7.71 8.29 7.71" fill="%23fff"/></svg>') no-repeat 50%;
    background-size: contain;
  }
  
  .node-handle.output-handle:hover {
    transform: translateY(-50%) scale(1.3);
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="8" fill="%234BC076"/><polygon points="8.29 3.47 7.69 3.47 7.69 7.71 3.47 7.71 3.47 8.31 7.69 8.31 7.69 12.53 8.29 12.53 8.29 8.31 12.53 8.31 12.53 7.71 8.29 7.71" fill="%23fff"/></svg>') no-repeat 50%;
    background-size: contain;
  }
  
  /* ===== Simple Node Styles ===== */
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
  
  /* Simple Node Handles */
  .simple-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: rgb(var(--color-surface-500));
    border: 2px solid rgb(var(--color-surface-800));
    cursor: crosshair;
    transition: all 0.15s ease;
  }
  
  .simple-handle:hover {
    background-color: rgb(var(--color-primary-500));
    transform: scale(1.3);
  }
  
  .simple-handle.input-handle {
    left: -5px;
    transform: translateY(-50%);
  }
  
  .simple-handle.input-handle:hover {
    transform: translateY(-50%) scale(1.3);
  }
  
  .simple-handle.output-handle {
    right: -5px;
    transform: translateY(-50%);
  }
  
  .simple-handle.output-handle:hover {
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

