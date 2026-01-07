<script lang="ts">
  import {
    Phone,
    Hash,
    MessageSquare,
    Users,
    PhoneForwarded,
    GitBranch,
    Mic,
    Bot,
    Database,
    FileText,
    Settings,
    Voicemail,
    Send,
    Clock,
    AlertTriangle,
    Search,
    Workflow,
    Square,
  } from 'lucide-svelte';
  import { addNode, nodes, type Node } from '$lib/stores/policy-editor';
  import { get } from 'svelte/store';
  
  interface NodeTemplate {
    type: string;
    containerType?: string;
    label: string;
    icon: typeof Phone;
    color: string;
    category: 'input' | 'action' | 'output';
  }
  
  const nodeTemplates: NodeTemplate[] = [
    // Inputs
    { type: 'input', containerType: 'inboundNumber', label: 'Inbound Number', icon: Phone, color: 'text-primary-500', category: 'input' },
    { type: 'input', containerType: 'extensionNumber', label: 'Extension', icon: Hash, color: 'text-primary-500', category: 'input' },
    { type: 'input', containerType: 'inboundMessage', label: 'Inbound Message', icon: MessageSquare, color: 'text-primary-500', category: 'input' },
    
    // Actions
    { type: 'default', containerType: 'callQueue', label: 'Call Queue', icon: Users, color: 'text-amber-500', category: 'action' },
    { type: 'default', containerType: 'huntGroup', label: 'Hunt Group', icon: PhoneForwarded, color: 'text-orange-500', category: 'action' },
    { type: 'default', containerType: 'connectCall', label: 'Connect Call', icon: PhoneForwarded, color: 'text-cyan-500', category: 'action' },
    { type: 'default', containerType: 'rule', label: 'Rule', icon: GitBranch, color: 'text-violet-500', category: 'action' },
    { type: 'default', containerType: 'speak', label: 'Speak', icon: MessageSquare, color: 'text-pink-500', category: 'action' },
    { type: 'default', containerType: 'recordCall', label: 'Record Call', icon: Mic, color: 'text-rose-500', category: 'action' },
    { type: 'default', containerType: 'voicemail', label: 'Voicemail', icon: Voicemail, color: 'text-blue-500', category: 'action' },
    { type: 'default', containerType: 'natterboxAI', label: 'Natterbox AI', icon: Bot, color: 'text-purple-500', category: 'action' },
    { type: 'default', containerType: 'queryObject', label: 'Query Object', icon: Database, color: 'text-emerald-500', category: 'action' },
    { type: 'default', containerType: 'createRecord', label: 'Create Record', icon: FileText, color: 'text-teal-500', category: 'action' },
    { type: 'default', containerType: 'manageProperties', label: 'Properties', icon: Settings, color: 'text-slate-500', category: 'action' },
    { type: 'default', containerType: 'notify', label: 'Notify', icon: Send, color: 'text-sky-500', category: 'action' },
    { type: 'default', containerType: 'retry', label: 'Retry', icon: Clock, color: 'text-yellow-500', category: 'action' },
    { type: 'default', containerType: 'switchBoard', label: 'Switchboard', icon: Search, color: 'text-lime-500', category: 'action' },
    { type: 'default', containerType: 'debug', label: 'Debug', icon: AlertTriangle, color: 'text-red-500', category: 'action' },
    { type: 'default', containerType: 'omniChannelFlow', label: 'Omni Channel', icon: Workflow, color: 'text-fuchsia-500', category: 'action' },
    
    // Outputs
    { type: 'output', containerType: 'end', label: 'End', icon: Square, color: 'text-error-500', category: 'output' },
  ];
  
  let filter = $state('');
  let expandedCategory = $state<string | null>('action');
  
  const filteredTemplates = $derived(
    nodeTemplates.filter(t => 
      t.label.toLowerCase().includes(filter.toLowerCase())
    )
  );
  
  const categories = [
    { id: 'input', label: 'Inputs', icon: Phone },
    { id: 'action', label: 'Actions', icon: Settings },
    { id: 'output', label: 'Outputs', icon: Square },
  ];
  
  function handleDragStart(e: DragEvent, template: NodeTemplate) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/json', JSON.stringify(template));
      e.dataTransfer.effectAllowed = 'copy';
    }
  }
  
  function handleAddNode(template: NodeTemplate) {
    // Find a position that doesn't overlap existing nodes
    const existingNodes = get(nodes);
    let x = 300;
    let y = 200;
    
    // Simple positioning: offset from the last node
    if (existingNodes.length > 0) {
      const lastNode = existingNodes[existingNodes.length - 1];
      x = lastNode.position.x + 250;
      y = lastNode.position.y;
    }
    
    const newNode: Node = {
      id: `${template.containerType || template.type}-${Date.now()}`,
      type: template.type,
      position: { x, y },
      data: {
        label: template.label,
        containerType: template.containerType,
      },
    };
    
    addNode(newNode);
  }
</script>

<div class="h-full flex flex-col bg-surface-200-800 border-r border-surface-300-700">
  <div class="p-3 border-b border-surface-300-700">
    <input
      type="text"
      bind:value={filter}
      placeholder="Search nodes..."
      class="input w-full text-sm"
    />
  </div>
  
  <div class="flex-1 overflow-y-auto">
    {#each categories as category}
      {@const categoryTemplates = filteredTemplates.filter(t => t.category === category.id)}
      {#if categoryTemplates.length > 0}
        <div class="border-b border-surface-300-700">
          <button
            class="w-full px-3 py-2 flex items-center gap-2 hover:bg-surface-300-700 transition-colors"
            onclick={() => expandedCategory = expandedCategory === category.id ? null : category.id}
          >
            <svelte:component this={category.icon} class="w-4 h-4 text-text-secondary" />
            <span class="text-sm font-medium text-text-primary">{category.label}</span>
            <span class="text-xs text-text-secondary ml-auto">{categoryTemplates.length}</span>
          </button>
          
          {#if expandedCategory === category.id || filter}
            <div class="px-2 pb-2 grid grid-cols-2 gap-1">
              {#each categoryTemplates as template}
                <button
                  class="p-2 rounded border border-surface-300-700 hover:border-primary-500/50 hover:bg-surface-300-700/50 transition-all cursor-grab active:cursor-grabbing"
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, template)}
                  onclick={() => handleAddNode(template)}
                  title={template.label}
                >
                  <svelte:component this={template.icon} class="w-5 h-5 mx-auto {template.color}" />
                  <span class="text-xs text-text-secondary mt-1 block truncate">{template.label}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
  
  <div class="p-3 border-t border-surface-300-700 text-xs text-text-secondary">
    <p>Drag & drop or click to add nodes</p>
  </div>
</div>

