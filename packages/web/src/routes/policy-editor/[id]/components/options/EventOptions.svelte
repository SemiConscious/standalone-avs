<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { AlertTriangle, Info } from 'lucide-svelte';
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Event Subscription');
  let eventType = $state(node.data?.eventType as string || 'salesforce');
  let enabled = $state(node.data?.enabled as boolean ?? true);
  let eventName = $state(node.data?.eventName as string || '');
  let filterField = $state(node.data?.filterField as string || '');
  let filterOperator = $state(node.data?.filterOperator as string || 'equals');
  let filterValue = $state(node.data?.filterValue as string || '');
  
  // Track if this event has a subscription ID (saved to the Events API)
  const subscriptionId = $derived(node.data?.subscriptionId as string | undefined);
  
  function handleLabelChange() {
    onUpdate({ label });
  }
  
  function handleEventTypeChange() {
    onUpdate({ eventType });
  }
  
  function handleEnabledChange() {
    onUpdate({ enabled });
  }
  
  function handleEventNameChange() {
    onUpdate({ eventName });
  }
  
  function handleFilterChange() {
    const filters = filterField ? [{
      field: filterField,
      operator: filterOperator,
      value: filterValue,
    }] : [];
    onUpdate({ filterField, filterOperator, filterValue, filters });
  }
  
  const eventTypes = [
    { value: 'salesforce', label: 'Salesforce Trigger', description: 'Trigger on Salesforce object events' },
    { value: 'webhook', label: 'Webhook', description: 'Trigger from external webhook' },
    { value: 'schedule', label: 'Scheduled', description: 'Trigger on a schedule' },
    { value: 'platform_event', label: 'Platform Event', description: 'Salesforce Platform Event' },
  ];
  
  const filterOperators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'matches', label: 'Regex Match' },
  ];
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
  
  <!-- Event Type -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Event Type
    </label>
    <select
      bind:value={eventType}
      onchange={handleEventTypeChange}
      class="input w-full"
    >
      {#each eventTypes as type}
        <option value={type.value}>{type.label}</option>
      {/each}
    </select>
    <p class="text-xs text-text-secondary mt-1">
      {eventTypes.find(t => t.value === eventType)?.description}
    </p>
  </div>
  
  <!-- Event Name -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      {#if eventType === 'salesforce'}
        Salesforce Object
      {:else if eventType === 'webhook'}
        Webhook Endpoint Name
      {:else if eventType === 'platform_event'}
        Platform Event Name
      {:else}
        Event Name
      {/if}
    </label>
    <input
      type="text"
      bind:value={eventName}
      onblur={handleEventNameChange}
      class="input w-full"
      placeholder={eventType === 'salesforce' ? 'e.g., Case, Lead' : 'Enter event name...'}
    />
    {#if eventType === 'salesforce'}
      <p class="text-xs text-text-secondary mt-1">
        Enter the Salesforce object API name
      </p>
    {/if}
  </div>
  
  <!-- Enabled Toggle -->
  <div>
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={enabled}
        onchange={handleEnabledChange}
        class="rounded border-surface-300-700"
      />
      <span class="text-sm font-medium">
        Event subscription enabled
      </span>
    </label>
    <p class="text-xs text-text-secondary mt-1">
      Disabled events will not trigger the policy
    </p>
  </div>
  
  <!-- Filter Configuration -->
  <div class="border border-surface-300-700 rounded p-3">
    <h4 class="text-sm font-medium mb-2">Event Filter (Optional)</h4>
    
    <div class="space-y-2">
      <div>
        <label class="block text-xs text-text-secondary mb-1">Filter Field</label>
        <input
          type="text"
          bind:value={filterField}
          onblur={handleFilterChange}
          class="input w-full"
          placeholder="e.g., Status, Type"
        />
      </div>
      
      {#if filterField}
        <div class="flex gap-2">
          <div class="flex-1">
            <label class="block text-xs text-text-secondary mb-1">Operator</label>
            <select
              bind:value={filterOperator}
              onchange={handleFilterChange}
              class="input w-full"
            >
              {#each filterOperators as op}
                <option value={op.value}>{op.label}</option>
              {/each}
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs text-text-secondary mb-1">Value</label>
            <input
              type="text"
              bind:value={filterValue}
              onblur={handleFilterChange}
              class="input w-full"
              placeholder="Filter value"
            />
          </div>
        </div>
      {/if}
    </div>
    
    <p class="text-xs text-text-secondary mt-2">
      Only events matching the filter will trigger this policy
    </p>
  </div>
  
  <!-- Subscription Status -->
  <div class="border border-surface-300-700 rounded p-3">
    <h4 class="text-sm font-medium mb-2 flex items-center gap-2">
      <Info class="w-4 h-4" />
      Subscription Status
    </h4>
    
    {#if subscriptionId}
      <div class="flex items-center gap-2 text-sm">
        <span class="w-2 h-2 rounded-full bg-green-500"></span>
        <span class="text-text-primary">Active</span>
      </div>
      <p class="text-xs text-text-secondary mt-1">
        ID: {subscriptionId}
      </p>
    {:else}
      <div class="flex items-center gap-2 text-sm">
        <AlertTriangle class="w-4 h-4 text-yellow-500" />
        <span class="text-yellow-400">Not synced</span>
      </div>
      <p class="text-xs text-text-secondary mt-1">
        This event subscription will be created when the policy is saved
      </p>
    {/if}
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

