<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { Phone, Hash, MessageSquare } from 'lucide-svelte';
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Input');
  let containerType = $state(node.data?.containerType as string || 'inboundNumber');
  let phoneNumberId = $state(node.data?.phoneNumberId as string || '');
  let extensionNumber = $state(node.data?.extensionNumber as string || '');
  
  const inputTypes = [
    { value: 'inboundNumber', label: 'Inbound Number', icon: Phone },
    { value: 'extensionNumber', label: 'Extension Number', icon: Hash },
    { value: 'inboundMessage', label: 'Inbound Message', icon: MessageSquare },
  ];
  
  function handleUpdate() {
    onUpdate({
      label,
      containerType,
      phoneNumberId,
      extensionNumber,
      phoneNumber: context.phoneNumbers.find(p => p.id === phoneNumberId)?.number,
    });
  }
</script>

<div class="space-y-4">
  <!-- Label -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">Label</label>
    <input
      type="text"
      bind:value={label}
      onblur={handleUpdate}
      class="input w-full"
    />
  </div>
  
  <!-- Input Type -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-2">Input Type</label>
    <div class="grid grid-cols-3 gap-2">
      {#each inputTypes as type}
        <button
          class="p-3 rounded-lg border text-center transition-all
            {containerType === type.value 
              ? 'border-primary-500 bg-primary-500/10 text-primary-500' 
              : 'border-surface-300-700 text-text-secondary hover:border-surface-400'}"
          onclick={() => { containerType = type.value; handleUpdate(); }}
        >
          <svelte:component this={type.icon} class="w-5 h-5 mx-auto mb-1" />
          <span class="text-xs">{type.label}</span>
        </button>
      {/each}
    </div>
  </div>
  
  {#if containerType === 'inboundNumber'}
    <!-- Phone Number Selection -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        <Phone class="w-4 h-4 inline mr-1" />
        Phone Number
      </label>
      <select
        bind:value={phoneNumberId}
        onchange={handleUpdate}
        class="select w-full"
      >
        <option value="">Select a phone number...</option>
        {#each context.phoneNumbers as phone}
          <option value={phone.id}>{phone.name} ({phone.number})</option>
        {/each}
      </select>
      
      {#if context.phoneNumbers.length === 0}
        <p class="text-xs text-warning mt-2">
          No phone numbers available. Configure phone numbers in AVS settings.
        </p>
      {/if}
    </div>
  {:else if containerType === 'extensionNumber'}
    <!-- Extension Number -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        <Hash class="w-4 h-4 inline mr-1" />
        Extension Number
      </label>
      <input
        type="text"
        bind:value={extensionNumber}
        onblur={handleUpdate}
        class="input w-full"
        placeholder="e.g., 1001"
      />
      <p class="text-xs text-text-secondary mt-1">
        Enter the extension number that will trigger this policy
      </p>
    </div>
  {:else if containerType === 'inboundMessage'}
    <div class="p-4 bg-surface-100-900 rounded-lg">
      <MessageSquare class="w-8 h-8 text-text-secondary mx-auto mb-2" />
      <p class="text-sm text-text-secondary text-center">
        This input will receive inbound messages (SMS, Chat, etc.)
      </p>
    </div>
  {/if}
</div>

