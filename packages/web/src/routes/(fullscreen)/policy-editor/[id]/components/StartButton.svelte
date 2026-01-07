<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
  
  interface StartOption {
    id: string;
    name: string;
    templateId: number;
    title?: string;
    disabled?: boolean;
  }
  
  interface Props {
    policyType?: string;
    onSelect: (templateId: number, name: string) => void;
    position?: { x: number; y: number };
  }
  
  let { policyType = 'POLICY_TYPE_CALL', onSelect, position = { x: 50, y: 100 } }: Props = $props();
  
  let isOpen = $state(false);
  
  // Options based on policy type (matching React app's POLICY_CONTAINERS.TYPES)
  const callPolicyOptions: StartOption[] = [
    { id: 'inbound', name: 'Add Inbound Numbers', templateId: 3 },
    { id: 'extension', name: 'Add Extension', templateId: 31 },
    { id: 'invokable', name: 'Add Invokable Destination', templateId: 3100000 },
    { id: 'sip', name: 'From SIP Trunk', templateId: 81 },
  ];
  
  const messagePolicyOptions: StartOption[] = [
    { id: 'inbound_msg', name: 'Add Inbound Message', templateId: 200 },
  ];
  
  const options = $derived(
    policyType === 'POLICY_TYPE_MESSAGE' ? messagePolicyOptions : callPolicyOptions
  );
  
  function handleSelect(option: StartOption) {
    if (option.disabled) return;
    onSelect(option.templateId, option.name);
    isOpen = false;
  }
</script>

<div 
  class="start-button-container"
  style="left: {position.x}px; top: {position.y}px;"
  role="button"
  tabindex="0"
  onmouseenter={() => isOpen = true}
  onmouseleave={() => isOpen = false}
>
  <button class="start-button">
    Click here to START
  </button>
  
  {#if isOpen}
    <ul class="start-options">
      {#each options as option (option.id)}
        <li 
          class="start-option"
          class:disabled={option.disabled}
          onclick={() => handleSelect(option)}
          title={option.title}
        >
          {option.name}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .start-button-container {
    position: absolute;
    width: 200px;
    cursor: pointer;
    z-index: 100;
  }
  
  .start-button-container:hover .start-options {
    display: block;
  }
  
  .start-button-container:hover .start-button {
    background-color: #0c8eff;
  }
  
  .start-button {
    width: 100%;
    height: 32px;
    padding: 0 20px;
    background-color: #506a92;
    color: white;
    border: none;
    font-size: 0.8125rem;
    font-weight: 400;
    text-align: left;
    cursor: pointer;
    border-radius: 0;
  }
  
  .start-options {
    list-style: none;
    padding: 0;
    margin: 0;
    background-color: white;
    border: 2px solid #0c8eff;
    border-top: none;
    border-radius: 0 0 4px 4px;
    overflow: hidden;
  }
  
  .start-option {
    height: 32px;
    padding: 0 10px;
    margin: 2px 0;
    background-color: #eef1f6;
    color: #506a92;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    cursor: pointer;
    border: 1px solid white;
    transition: background-color 0.15s ease;
  }
  
  .start-option:hover:not(.disabled) {
    background-color: #cfd7e6;
  }
  
  .start-option.disabled {
    background-color: #a8b7c7;
    cursor: not-allowed;
    color: #666;
  }
  
  .start-option:last-child {
    margin-bottom: 0;
  }
</style>

