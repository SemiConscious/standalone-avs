<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import { X, Settings, Phone, Users, GitBranch, MessageSquare, Bot, Database, Mic, Clock, AlertTriangle } from 'lucide-svelte';
  import { updateNode, editorContext } from '$lib/stores/policy-editor';
  
  // Node option components
  import CallQueueOptions from './options/CallQueueOptions.svelte';
  import HuntGroupOptions from './options/HuntGroupOptions.svelte';
  import RuleOptions from './options/RuleOptions.svelte';
  import SpeakOptions from './options/SpeakOptions.svelte';
  import InputOptions from './options/InputOptions.svelte';
  import GenericOptions from './options/GenericOptions.svelte';
  
  interface Props {
    node: Node;
    onClose: () => void;
  }
  
  let { node, onClose }: Props = $props();
  
  // Map container types to their option components and icons
  const optionComponents: Record<string, { component: typeof GenericOptions; icon: typeof Settings; title: string }> = {
    callQueue: { component: CallQueueOptions, icon: Users, title: 'Call Queue' },
    huntGroup: { component: HuntGroupOptions, icon: Users, title: 'Hunt Group' },
    rule: { component: RuleOptions, icon: GitBranch, title: 'Rule' },
    speak: { component: SpeakOptions, icon: MessageSquare, title: 'Speak' },
    input: { component: InputOptions, icon: Phone, title: 'Input' },
    inboundNumber: { component: InputOptions, icon: Phone, title: 'Inbound Number' },
  };
  
  const containerType = $derived(node.data?.containerType as string || node.type);
  const config = $derived(optionComponents[containerType] || { 
    component: GenericOptions, 
    icon: Settings, 
    title: containerType || 'Node' 
  });
  
  function handleUpdate(data: Record<string, unknown>) {
    updateNode(node.id, data);
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="px-4 py-3 border-b border-surface-300-700 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <svelte:component this={config.icon} class="w-5 h-5 text-text-secondary" />
      <h3 class="font-semibold text-text-primary">{config.title}</h3>
    </div>
    <button
      onclick={onClose}
      class="p-1 rounded hover:bg-surface-300-700 transition-colors"
    >
      <X class="w-5 h-5 text-text-secondary" />
    </button>
  </div>
  
  <!-- Content -->
  <div class="flex-1 overflow-y-auto p-4">
    <svelte:component 
      this={config.component} 
      {node} 
      context={$editorContext}
      onUpdate={handleUpdate}
    />
  </div>
</div>

