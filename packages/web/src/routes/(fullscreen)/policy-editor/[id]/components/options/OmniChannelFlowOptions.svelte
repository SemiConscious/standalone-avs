<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { Loader2, RefreshCw } from 'lucide-svelte';
  
  interface OmniQueue {
    id: string;
    name: string;
    developerName: string;
  }
  
  interface OmniFlow {
    id: string;
    name: string;
    developerName: string;
    description?: string;
  }
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'OmniChannel Routing');
  let routingType = $state(node.data?.routingType as string || 'queue');
  let selectedQueueId = $state(node.data?.queueId as string || '');
  let selectedFlowId = $state(node.data?.flowId as string || '');
  let fallbackBehavior = $state(node.data?.fallbackBehavior as string || 'voicemail');
  let timeout = $state(node.data?.timeout as number || 30);
  let isLoading = $state(false);
  
  // Available queues and flows
  let availableQueues = $state<OmniQueue[]>([]);
  let availableFlows = $state<OmniFlow[]>([]);
  
  // Load queues and flows
  async function loadOptions() {
    isLoading = true;
    try {
      // In a real implementation, this would call the API:
      // const [queuesRes, flowsRes] = await Promise.all([
      //   fetch('/api/omnichannel/queues'),
      //   fetch('/api/omnichannel/flows'),
      // ]);
      // availableQueues = await queuesRes.json();
      // availableFlows = await flowsRes.json();
      
      // For now, use demo data
      availableQueues = [
        { id: 'q1', name: 'Sales Queue', developerName: 'Sales_Queue' },
        { id: 'q2', name: 'Support Queue', developerName: 'Support_Queue' },
        { id: 'q3', name: 'Billing Queue', developerName: 'Billing_Queue' },
        { id: 'q4', name: 'General Inquiries', developerName: 'General_Queue' },
      ];
      
      availableFlows = [
        { id: 'f1', name: 'Standard Routing', developerName: 'Standard_Routing', description: 'Default routing flow' },
        { id: 'f2', name: 'Skills-Based Routing', developerName: 'Skills_Routing', description: 'Route based on agent skills' },
        { id: 'f3', name: 'Priority Routing', developerName: 'Priority_Routing', description: 'High-priority customer routing' },
      ];
    } catch (e) {
      console.error('Failed to load OmniChannel options:', e);
    } finally {
      isLoading = false;
    }
  }
  
  function handleLabelChange() {
    onUpdate({ label });
  }
  
  function handleRoutingTypeChange() {
    onUpdate({ 
      routingType,
      // Clear the non-selected option
      ...(routingType === 'queue' ? { flowId: '' } : { queueId: '' }),
    });
  }
  
  function handleQueueChange() {
    const selectedQueue = availableQueues.find(q => q.id === selectedQueueId);
    onUpdate({ 
      queueId: selectedQueueId,
      queueName: selectedQueue?.name || '',
      queueDeveloperName: selectedQueue?.developerName || '',
    });
  }
  
  function handleFlowChange() {
    const selectedFlow = availableFlows.find(f => f.id === selectedFlowId);
    onUpdate({ 
      flowId: selectedFlowId,
      flowName: selectedFlow?.name || '',
      flowDeveloperName: selectedFlow?.developerName || '',
    });
  }
  
  function handleFallbackChange() {
    onUpdate({ fallbackBehavior });
  }
  
  function handleTimeoutChange() {
    onUpdate({ timeout });
  }
  
  // Load options on mount
  $effect(() => {
    loadOptions();
  });
</script>

<div class="space-y-4">
  <!-- Label -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Label
    </label>
    <input
      type="text"
      bind:value={label}
      onblur={handleLabelChange}
      class="input w-full"
      placeholder="Enter label..."
    />
  </div>
  
  <!-- Routing Type -->
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="block text-sm font-medium text-text-secondary">
        Routing Type
      </label>
      <button
        type="button"
        onclick={loadOptions}
        disabled={isLoading}
        class="p-1 hover:bg-surface-100-900 rounded transition-colors"
        title="Refresh options"
      >
        {#if isLoading}
          <Loader2 class="w-4 h-4 animate-spin" />
        {:else}
          <RefreshCw class="w-4 h-4" />
        {/if}
      </button>
    </div>
    <select
      bind:value={routingType}
      onchange={handleRoutingTypeChange}
      class="input w-full"
    >
      <option value="queue">Route to Queue</option>
      <option value="flow">Route via Flow</option>
    </select>
  </div>
  
  <!-- Queue Selection -->
  {#if routingType === 'queue'}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Target Queue
      </label>
      {#if isLoading}
        <div class="flex items-center gap-2 text-text-secondary text-sm">
          <Loader2 class="w-4 h-4 animate-spin" />
          Loading queues...
        </div>
      {:else}
        <select
          bind:value={selectedQueueId}
          onchange={handleQueueChange}
          class="input w-full"
        >
          <option value="">Select a queue...</option>
          {#each availableQueues as queue (queue.id)}
            <option value={queue.id}>{queue.name}</option>
          {/each}
        </select>
        {#if selectedQueueId}
          {@const selected = availableQueues.find(q => q.id === selectedQueueId)}
          {#if selected}
            <p class="text-xs text-text-secondary mt-1">
              API Name: {selected.developerName}
            </p>
          {/if}
        {/if}
      {/if}
    </div>
  {/if}
  
  <!-- Flow Selection -->
  {#if routingType === 'flow'}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Routing Flow
      </label>
      {#if isLoading}
        <div class="flex items-center gap-2 text-text-secondary text-sm">
          <Loader2 class="w-4 h-4 animate-spin" />
          Loading flows...
        </div>
      {:else}
        <select
          bind:value={selectedFlowId}
          onchange={handleFlowChange}
          class="input w-full"
        >
          <option value="">Select a flow...</option>
          {#each availableFlows as flow (flow.id)}
            <option value={flow.id}>{flow.name}</option>
          {/each}
        </select>
        {#if selectedFlowId}
          {@const selected = availableFlows.find(f => f.id === selectedFlowId)}
          {#if selected}
            <div class="mt-1">
              <p class="text-xs text-text-secondary">
                API Name: {selected.developerName}
              </p>
              {#if selected.description}
                <p class="text-xs text-text-secondary mt-0.5">
                  {selected.description}
                </p>
              {/if}
            </div>
          {/if}
        {/if}
      {/if}
    </div>
  {/if}
  
  <!-- Timeout -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Queue Timeout (seconds)
    </label>
    <input
      type="number"
      bind:value={timeout}
      onblur={handleTimeoutChange}
      class="input w-full"
      min="0"
      max="3600"
    />
    <p class="text-xs text-text-secondary mt-1">
      Time to wait before fallback action (0 = no timeout)
    </p>
  </div>
  
  <!-- Fallback Behavior -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Fallback Behavior
    </label>
    <select
      bind:value={fallbackBehavior}
      onchange={handleFallbackChange}
      class="input w-full"
    >
      <option value="voicemail">Voicemail</option>
      <option value="disconnect">Disconnect</option>
      <option value="transfer">Transfer to Another Queue</option>
      <option value="callback">Offer Callback</option>
    </select>
    <p class="text-xs text-text-secondary mt-1">
      Action when queue timeout is reached
    </p>
  </div>
  
  <!-- Node Info -->
  <div class="pt-4 border-t border-surface-300-700">
    <h4 class="text-sm font-medium text-text-secondary mb-2">Node Info</h4>
    <dl class="text-xs space-y-1">
      <div class="flex justify-between">
        <dt class="text-text-secondary">ID:</dt>
        <dd class="text-text-primary font-mono">{node.id}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-text-secondary">Type:</dt>
        <dd class="text-text-primary">{node.type}</dd>
      </div>
    </dl>
  </div>
</div>

