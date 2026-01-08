<script lang="ts">
  import { 
    Phone, PhoneIncoming, PhoneOutgoing, Users, GitBranch, 
    MessageSquare, Mic, Bot, Database, FileText, Settings,
    Voicemail, Send, Clock, AlertTriangle, Search, Workflow,
    Square, Play, Hash, ChevronDown, ChevronRight, Box, Layers
  } from 'lucide-svelte';
  
  interface NodeTemplate {
    type: string;
    label: string;
    icon: typeof Play;
    color: string;
    bgColor?: string; // For container preview
    category: 'entry' | 'container' | 'app' | 'output';
    description?: string;
    defaultData?: Record<string, unknown>;
  }
  
  const nodeTemplates: NodeTemplate[] = [
    // Entry Points (where calls/messages come in)
    { type: 'inboundNumber', label: 'Inbound Number', icon: Phone, color: 'text-[#cfd05b]', bgColor: '#cfd05b', category: 'entry', description: 'Entry point for inbound calls' },
    { type: 'extensionNumber', label: 'Extension', icon: Hash, color: 'text-[#d68a6a]', bgColor: '#d68a6a', category: 'entry', description: 'Internal extension number' },
    { type: 'inboundMessage', label: 'Inbound Message', icon: MessageSquare, color: 'text-[#6bb7e4]', bgColor: '#6bb7e4', category: 'entry', description: 'Entry point for messages' },
    { type: 'fromPolicy', label: 'From Policy', icon: GitBranch, color: 'text-[#963cbd]', bgColor: '#963cbd', category: 'entry', description: 'Entry from another policy' },
    
    // Containers (burger-style nodes that hold apps)
    { type: 'action', label: 'Action', icon: Play, color: 'text-[#2ecbbf]', bgColor: '#2ecbbf', category: 'container', description: 'Generic action container' },
    { type: 'switchBoard', label: 'Switchboard', icon: Search, color: 'text-[#d95879]', bgColor: '#d95879', category: 'container', description: 'Directory lookup' },
    { type: 'natterboxAI', label: 'Natterbox AI', icon: Bot, color: 'text-[#75c3bd]', bgColor: '#75c3bd', category: 'container', description: 'AI-powered container' },
    { type: 'omniChannelFlow', label: 'Omni Channel', icon: Workflow, color: 'text-[#00a1e0]', bgColor: '#00a1e0', category: 'container', description: 'Omni-channel routing' },
    { type: 'toPolicy', label: 'To Policy', icon: GitBranch, color: 'text-[#963cbd]', bgColor: '#963cbd', category: 'container', description: 'Transfer to another policy' },
    
    // Apps (can be added to containers or used standalone)
    { type: 'callQueue', label: 'Call Queue', icon: Users, color: 'text-amber-400', category: 'app', description: 'Queue calls for agents' },
    { type: 'huntGroup', label: 'Hunt Group', icon: Users, color: 'text-orange-400', category: 'app', description: 'Ring multiple users' },
    { type: 'connectCall', label: 'Connect Call', icon: PhoneOutgoing, color: 'text-cyan-400', category: 'app', description: 'Connect to user/number' },
    { type: 'rule', label: 'Rule', icon: GitBranch, color: 'text-violet-400', category: 'app', description: 'Conditional branching' },
    { type: 'speak', label: 'Speak', icon: MessageSquare, color: 'text-pink-400', category: 'app', description: 'Play audio/TTS' },
    { type: 'recordCall', label: 'Record & Analyse', icon: Mic, color: 'text-rose-400', category: 'app', description: 'Record and transcribe' },
    { type: 'voicemail', label: 'Voicemail', icon: Voicemail, color: 'text-blue-400', category: 'app', description: 'Send to voicemail' },
    { type: 'queryObject', label: 'Query Object', icon: Database, color: 'text-emerald-400', category: 'app', description: 'Query Salesforce data' },
    { type: 'createRecord', label: 'Create Record', icon: FileText, color: 'text-teal-400', category: 'app', description: 'Create Salesforce record' },
    { type: 'manageProperties', label: 'Properties', icon: Settings, color: 'text-slate-400', category: 'app', description: 'Set call properties' },
    { type: 'notify', label: 'Notify', icon: Send, color: 'text-sky-400', category: 'app', description: 'Send notifications' },
    { type: 'retry', label: 'Retry', icon: Clock, color: 'text-yellow-400', category: 'app', description: 'Retry previous action' },
    { type: 'debug', label: 'Debug', icon: AlertTriangle, color: 'text-red-400', category: 'app', description: 'Debug information' },
    
    // Outputs (end points)
    { type: 'finish', label: 'Finish', icon: Square, color: 'text-[#666666]', bgColor: '#666666', category: 'output', description: 'End the call flow' },
  ];
  
  let searchQuery = $state('');
  let expandedCategories = $state<Set<string>>(new Set(['entry', 'container', 'app', 'output']));
  
  const categories = [
    { id: 'entry', label: 'Entry Points', icon: PhoneIncoming, description: 'Where calls enter the policy' },
    { id: 'container', label: 'Containers', icon: Layers, description: 'Hold and organize apps' },
    { id: 'app', label: 'Apps', icon: Box, description: 'Actions and components' },
    { id: 'output', label: 'Outputs', icon: Square, description: 'End points' },
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
                  <!-- Container preview or icon -->
                  {#if template.bgColor && (template.category === 'container' || template.category === 'entry' || template.category === 'output')}
                    <div 
                      class="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
                      style="background-color: {template.bgColor};"
                    >
                      <svelte:component this={template.icon} class="w-3.5 h-3.5 text-white" />
                    </div>
                  {:else}
                    <div class="{template.color} flex-shrink-0">
                      <svelte:component this={template.icon} class="w-4 h-4" />
                    </div>
                  {/if}
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
