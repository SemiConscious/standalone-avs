<script lang="ts">
  import { 
    Phone, PhoneIncoming, PhoneOutgoing, Users, GitBranch, 
    MessageSquare, Mic, Bot, Database, FileText, Settings,
    Voicemail, Send, Clock, AlertTriangle, Search, Workflow,
    Square, Play, Hash, ChevronDown, ChevronRight
  } from 'lucide-svelte';
  
  interface NodeTemplate {
    type: string;
    label: string;
    icon: any;
    color: string;
    category: 'input' | 'action' | 'output';
    description?: string;
    defaultData?: Record<string, unknown>;
  }
  
  const nodeTemplates: NodeTemplate[] = [
    // Inputs
    { type: 'inboundNumber', label: 'Inbound Number', icon: Phone, color: 'text-blue-400', category: 'input', description: 'Entry point for inbound calls' },
    { type: 'extensionNumber', label: 'Extension', icon: Hash, color: 'text-blue-300', category: 'input', description: 'Internal extension number' },
    { type: 'inboundMessage', label: 'Inbound Message', icon: MessageSquare, color: 'text-blue-200', category: 'input', description: 'Entry point for messages' },
    
    // Actions
    { type: 'callQueue', label: 'Call Queue', icon: Users, color: 'text-amber-400', category: 'action', description: 'Queue calls for agents' },
    { type: 'huntGroup', label: 'Hunt Group', icon: Users, color: 'text-orange-400', category: 'action', description: 'Ring multiple users' },
    { type: 'connectCall', label: 'Connect Call', icon: PhoneOutgoing, color: 'text-cyan-400', category: 'action', description: 'Connect to user/number' },
    { type: 'rule', label: 'Rule', icon: GitBranch, color: 'text-violet-400', category: 'action', description: 'Conditional branching' },
    { type: 'speak', label: 'Speak', icon: MessageSquare, color: 'text-pink-400', category: 'action', description: 'Play audio/TTS' },
    { type: 'recordCall', label: 'Record Call', icon: Mic, color: 'text-rose-400', category: 'action', description: 'Start/stop recording' },
    { type: 'voicemail', label: 'Voicemail', icon: Voicemail, color: 'text-blue-400', category: 'action', description: 'Send to voicemail' },
    { type: 'natterboxAI', label: 'Natterbox AI', icon: Bot, color: 'text-purple-400', category: 'action', description: 'AI-powered actions' },
    { type: 'queryObject', label: 'Query Object', icon: Database, color: 'text-emerald-400', category: 'action', description: 'Query Salesforce data' },
    { type: 'createRecord', label: 'Create Record', icon: FileText, color: 'text-teal-400', category: 'action', description: 'Create Salesforce record' },
    { type: 'manageProperties', label: 'Properties', icon: Settings, color: 'text-slate-400', category: 'action', description: 'Set call properties' },
    { type: 'notify', label: 'Notify', icon: Send, color: 'text-sky-400', category: 'action', description: 'Send notifications' },
    { type: 'retry', label: 'Retry', icon: Clock, color: 'text-yellow-400', category: 'action', description: 'Retry previous action' },
    { type: 'switchBoard', label: 'Switchboard', icon: Search, color: 'text-lime-400', category: 'action', description: 'Directory lookup' },
    { type: 'debug', label: 'Debug', icon: AlertTriangle, color: 'text-red-400', category: 'action', description: 'Debug information' },
    { type: 'omniChannelFlow', label: 'Omni Channel', icon: Workflow, color: 'text-fuchsia-400', category: 'action', description: 'Omni-channel routing' },
    
    // Outputs
    { type: 'end', label: 'End', icon: Square, color: 'text-red-400', category: 'output', description: 'End the call flow' },
  ];
  
  let searchQuery = $state('');
  let expandedCategories = $state<Set<string>>(new Set(['input', 'action', 'output']));
  
  const categories = [
    { id: 'input', label: 'Inputs', icon: PhoneIncoming },
    { id: 'action', label: 'Actions', icon: Settings },
    { id: 'output', label: 'Outputs', icon: Square },
  ];
  
  const filteredTemplates = $derived(
    nodeTemplates.filter(t =>
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
  
  function toggleCategory(categoryId: string) {
    const newSet = new Set(expandedCategories);
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    expandedCategories = newSet;
  }
  
  function handleDragStart(e: DragEvent, template: NodeTemplate) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/json', JSON.stringify({
        type: template.type,
        label: template.label,
        defaultData: template.defaultData || {}
      }));
      e.dataTransfer.effectAllowed = 'copy';
    }
  }
</script>

<div class="node-palette w-64 h-full flex flex-col">
  <!-- Header -->
  <div class="palette-header p-3">
    <h3 class="text-sm font-semibold mb-2">Node Palette</h3>
    <input 
      type="text"
      placeholder="Search nodes..."
      bind:value={searchQuery}
      class="palette-search w-full px-3 py-1.5 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
  
  <!-- Node list -->
  <div class="flex-1 overflow-y-auto">
    {#each categories as category}
      {@const categoryTemplates = filteredTemplates.filter(t => t.category === category.id)}
      {#if categoryTemplates.length > 0 || !searchQuery}
        <div class="category-section">
          <!-- Category header -->
          <button 
            class="category-header w-full px-3 py-2 flex items-center gap-2 transition-colors text-left"
            onclick={() => toggleCategory(category.id)}
          >
            {#if expandedCategories.has(category.id)}
              <ChevronDown class="w-4 h-4 opacity-60" />
            {:else}
              <ChevronRight class="w-4 h-4 opacity-60" />
            {/if}
            <svelte:component this={category.icon} class="w-4 h-4 opacity-60" />
            <span class="text-sm font-medium">{category.label}</span>
            <span class="text-xs opacity-50 ml-auto">{categoryTemplates.length}</span>
          </button>
          
          <!-- Category content -->
          {#if expandedCategories.has(category.id) || searchQuery}
            <div class="px-2 pb-2 space-y-1">
              {#each categoryTemplates as template}
                <div 
                  class="node-item flex items-center gap-2 p-2 rounded transition-all cursor-grab active:cursor-grabbing"
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, template)}
                  role="button"
                  tabindex="0"
                >
                  <div class="{template.color} flex-shrink-0">
                    <svelte:component this={template.icon} class="w-4 h-4" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm truncate">{template.label}</div>
                    {#if template.description}
                      <div class="text-xs opacity-50 truncate">{template.description}</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
  
  <!-- Footer -->
  <div class="palette-footer p-3">
    <p class="text-xs opacity-50">
      Drag nodes onto the canvas to add them to your policy.
    </p>
  </div>
</div>

<style>
  .node-palette {
    background-color: rgb(var(--color-surface-800));
    border-right: 1px solid rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-200));
  }
  
  .palette-header {
    border-bottom: 1px solid rgb(var(--color-surface-700));
  }
  
  .palette-search {
    background-color: rgb(var(--color-surface-900));
    border: 1px solid rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .palette-search::placeholder {
    color: rgb(var(--color-surface-500));
  }
  
  .category-section {
    border-bottom: 1px solid rgb(var(--color-surface-700));
  }
  
  .category-header:hover {
    background-color: rgb(var(--color-surface-700));
  }
  
  .node-item {
    background-color: rgb(var(--color-surface-900));
    border: 1px solid rgb(var(--color-surface-600));
  }
  
  .node-item:hover {
    background-color: rgb(var(--color-surface-700));
    border-color: rgb(var(--color-surface-500));
  }
  
  .palette-footer {
    border-top: 1px solid rgb(var(--color-surface-700));
  }
</style>
