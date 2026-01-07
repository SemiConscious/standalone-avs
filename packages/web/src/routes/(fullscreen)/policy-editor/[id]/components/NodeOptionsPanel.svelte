<script lang="ts">
  import { X } from 'lucide-svelte';
  
  interface FlowNodeData {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
    selected?: boolean;
    width?: number;
    height?: number;
  }
  
  interface Props {
    node: FlowNodeData;
    onClose: () => void;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, onClose, onUpdate }: Props = $props();
  
  // Local state for editing - populated from node.data
  let label = $state(node?.data?.label as string || '');
  let description = $state(node?.data?.description as string || '');
  let color = $state(node?.data?.color as string || '#6b7280');
  
  // Update local state when node changes
  $effect(() => {
    if (node) {
      label = node.data?.label as string || '';
      description = node.data?.description as string || '';
      color = node.data?.color as string || '#6b7280';
    }
  });
  
  function handleSave() {
    onUpdate({
      ...node.data,
      label,
      description,
      color
    });
  }
</script>

<div class="options-panel w-80 h-full flex flex-col">
  <!-- Header -->
  <div class="panel-header p-4 flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold">Node Options</h3>
      <p class="text-xs opacity-50 mt-0.5">{node?.type || 'Unknown type'}</p>
    </div>
    <button 
      class="close-btn p-1.5 rounded transition-colors"
      onclick={onClose}
    >
      <X class="w-4 h-4 opacity-60" />
    </button>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- Label -->
    <div>
      <label class="block text-xs font-medium opacity-70 mb-1.5">
        Label
      </label>
      <input 
        type="text"
        bind:value={label}
        onchange={handleSave}
        placeholder="Enter node label"
        class="panel-input w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
    
    <!-- Description -->
    <div>
      <label class="block text-xs font-medium opacity-70 mb-1.5">
        Description
      </label>
      <textarea 
        bind:value={description}
        onchange={handleSave}
        placeholder="Enter description"
        rows="3"
        class="panel-input w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      ></textarea>
    </div>
    
    <!-- Color -->
    <div>
      <label class="block text-xs font-medium opacity-70 mb-1.5">
        Node Color
      </label>
      <div class="flex items-center gap-2">
        <input 
          type="color"
          bind:value={color}
          onchange={handleSave}
          class="w-10 h-10 rounded color-input cursor-pointer"
        />
        <input 
          type="text"
          bind:value={color}
          onchange={handleSave}
          class="panel-input flex-1 px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
      </div>
    </div>
    
    <!-- Type-specific options would go here -->
    <div class="section-divider pt-4">
      <h4 class="text-xs font-medium opacity-70 mb-3">
        Type-Specific Options
      </h4>
      
      {#if node?.type === 'callQueue'}
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium opacity-70 mb-1.5">
              Queue Type
            </label>
            <select class="panel-select w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="round_robin">Round Robin</option>
              <option value="longest_idle">Longest Idle</option>
              <option value="skills_based">Skills Based</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium opacity-70 mb-1.5">
              Max Wait Time (seconds)
            </label>
            <input 
              type="number"
              placeholder="300"
              class="panel-input w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      {:else if node?.type === 'rule'}
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium opacity-70 mb-1.5">
              Condition Type
            </label>
            <select class="panel-select w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="time">Time Based</option>
              <option value="caller_id">Caller ID</option>
              <option value="property">Property Check</option>
              <option value="custom">Custom Expression</option>
            </select>
          </div>
        </div>
      {:else if node?.type === 'speak'}
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium opacity-70 mb-1.5">
              Text to Speak
            </label>
            <textarea 
              placeholder="Enter text..."
              rows="3"
              class="panel-input w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-medium opacity-70 mb-1.5">
              Voice
            </label>
            <select class="panel-select w-full px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="en-US-female">English (US) - Female</option>
              <option value="en-US-male">English (US) - Male</option>
              <option value="en-GB-female">English (UK) - Female</option>
              <option value="en-GB-male">English (UK) - Male</option>
            </select>
          </div>
        </div>
      {:else}
        <p class="text-xs opacity-50 italic">
          No additional options for this node type.
        </p>
      {/if}
    </div>
    
    <!-- Node Info -->
    <div class="section-divider pt-4">
      <h4 class="text-xs font-medium opacity-70 mb-2">
        Node Info
      </h4>
      <dl class="text-xs space-y-1">
        <div class="flex justify-between">
          <dt class="opacity-50">ID:</dt>
          <dd class="font-mono">{node?.id || 'N/A'}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="opacity-50">Position:</dt>
          <dd class="font-mono">
            ({Math.round(node?.position?.x || 0)}, {Math.round(node?.position?.y || 0)})
          </dd>
        </div>
      </dl>
    </div>
  </div>
  
  <!-- Footer -->
  <div class="panel-footer p-4">
    <p class="text-xs opacity-50 text-center">
      Press Delete key to remove selected nodes
    </p>
  </div>
</div>

<style>
  .options-panel {
    background-color: rgb(var(--color-surface-800));
    border-left: 1px solid rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-200));
  }
  
  .panel-header {
    border-bottom: 1px solid rgb(var(--color-surface-700));
  }
  
  .close-btn:hover {
    background-color: rgb(var(--color-surface-700));
  }
  
  .panel-input {
    background-color: rgb(var(--color-surface-900));
    border: 1px solid rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .panel-input::placeholder {
    color: rgb(var(--color-surface-500));
  }
  
  .panel-select {
    background-color: rgb(var(--color-surface-900));
    border: 1px solid rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-100));
  }
  
  .color-input {
    border: 1px solid rgb(var(--color-surface-600));
  }
  
  .section-divider {
    border-top: 1px solid rgb(var(--color-surface-700));
  }
  
  .panel-footer {
    border-top: 1px solid rgb(var(--color-surface-700));
  }
</style>
