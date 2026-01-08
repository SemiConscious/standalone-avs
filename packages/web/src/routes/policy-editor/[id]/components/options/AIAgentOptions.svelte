<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { Loader2, RefreshCw, Plus, Pencil, X, Info } from 'lucide-svelte';
  
  interface AIAgent {
    name: string;
    value: string;
  }
  
  interface AgentVersion {
    name: string;
    value: string;
  }
  
  interface Token {
    key: string;
    value: string;
  }
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'AI Agent');
  let agentId = $state(node.data?.agentId as string || '');
  let agentVersion = $state(node.data?.agentVersion as string || 'LATEST');
  let componentVersion = $state(node.data?.componentVersion as string || '1');
  let toolResultSetName = $state(node.data?.toolResultSetName as string || '');
  let userGreetingPrompt = $state(node.data?.userGreetingPrompt as string || '');
  let tokens = $state<Token[]>((node.data?.tokens as Token[]) || []);
  let isLoading = $state(false);
  
  // Available agents and versions
  let availableAgents = $state<AIAgent[]>([]);
  let availableVersions = $state<AgentVersion[]>([
    { name: 'Working Draft', value: 'HEAD' },
    { name: 'Last Published Version', value: 'LATEST' },
  ]);
  
  // Component version options
  const componentVersionOptions = [
    { name: 'V1 - Standard', value: '1' },
    { name: 'V2 - With Greeting', value: '2' },
  ];
  
  // Load agents
  async function loadAgents() {
    isLoading = true;
    try {
      // In a real implementation, this would call the API:
      // const response = await fetch('/api/ai/agents');
      // availableAgents = await response.json();
      
      // For now, use demo data
      availableAgents = [
        { name: 'SALES BOT - Handles sales inquiries and product recommendations', value: 'agent-1' },
        { name: 'SUPPORT BOT - Technical support and troubleshooting', value: 'agent-2' },
        { name: 'FAQ BOT - Answers frequently asked questions', value: 'agent-3' },
        { name: 'BOOKING BOT - Appointment scheduling and calendar management', value: 'agent-4' },
      ];
    } catch (e) {
      console.error('Failed to load AI agents:', e);
    } finally {
      isLoading = false;
    }
  }
  
  function handleLabelChange() {
    onUpdate({ label });
  }
  
  function handleAgentChange() {
    const selectedAgent = availableAgents.find(a => a.value === agentId);
    onUpdate({ 
      agentId,
      agentName: selectedAgent?.name || '',
    });
    
    // Load versions for the selected agent
    // In a real implementation, this would fetch versions from the API
    availableVersions = [
      { name: 'Working Draft', value: 'HEAD' },
      { name: 'Last Published Version', value: 'LATEST' },
      { name: 'Version 3', value: 'v3' },
      { name: 'Version 2', value: 'v2' },
      { name: 'Version 1', value: 'v1' },
    ];
  }
  
  function handleVersionChange() {
    onUpdate({ agentVersion });
  }
  
  function handleComponentVersionChange() {
    // Reset greeting prompt when switching to V1
    if (componentVersion === '1') {
      userGreetingPrompt = '';
    }
    onUpdate({ 
      componentVersion,
      userGreetingPrompt: componentVersion === '1' ? '' : userGreetingPrompt,
    });
  }
  
  function handleToolResultSetNameChange() {
    // Validate: alphanumeric and underscores only
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    const isValid = !toolResultSetName || regex.test(toolResultSetName);
    onUpdate({ 
      toolResultSetName,
      toolResultSetNameValid: isValid,
    });
  }
  
  function handleGreetingPromptChange() {
    onUpdate({ userGreetingPrompt });
  }
  
  // Token management
  function addToken() {
    tokens = [...tokens, { key: '', value: '' }];
    onUpdate({ tokens });
  }
  
  function updateToken(index: number, field: 'key' | 'value', value: string) {
    tokens = tokens.map((t, i) => i === index ? { ...t, [field]: value } : t);
    onUpdate({ tokens });
  }
  
  function removeToken(index: number) {
    tokens = tokens.filter((_, i) => i !== index);
    onUpdate({ tokens });
  }
  
  // Validate tool result set name
  const toolResultSetNameError = $derived(() => {
    if (!toolResultSetName) return null;
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return regex.test(toolResultSetName) ? null : 'Must start with letter or underscore, contain only alphanumeric and underscores';
  });
  
  // Load agents on mount
  $effect(() => {
    loadAgents();
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
  
  <!-- Agent Selection -->
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="block text-sm font-medium text-text-secondary">
        AI Agent <span class="text-red-400">*</span>
      </label>
      <button
        type="button"
        onclick={loadAgents}
        disabled={isLoading}
        class="p-1 hover:bg-surface-100-900 rounded transition-colors"
        title="Refresh agents"
      >
        {#if isLoading}
          <Loader2 class="w-4 h-4 animate-spin" />
        {:else}
          <RefreshCw class="w-4 h-4" />
        {/if}
      </button>
    </div>
    
    {#if isLoading}
      <div class="flex items-center gap-2 text-text-secondary text-sm">
        <Loader2 class="w-4 h-4 animate-spin" />
        Loading agents...
      </div>
    {:else}
      <select
        bind:value={agentId}
        onchange={handleAgentChange}
        class="input w-full"
        class:border-red-500={!agentId}
      >
        <option value="">Select an agent...</option>
        {#each availableAgents as agent}
          <option value={agent.value}>{agent.name}</option>
        {/each}
      </select>
      {#if !agentId}
        <p class="text-xs text-red-400 mt-1">Agent is required</p>
      {/if}
    {/if}
  </div>
  
  <!-- Component Version -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Component Version
      <span class="ml-1 text-text-secondary text-xs" title="V2 supports custom greeting prompts">
        <Info class="w-3 h-3 inline" />
      </span>
    </label>
    <select
      bind:value={componentVersion}
      onchange={handleComponentVersionChange}
      class="input w-full"
    >
      {#each componentVersionOptions as option}
        <option value={option.value}>{option.name}</option>
      {/each}
    </select>
  </div>
  
  <!-- User Greeting Prompt (V2 only) -->
  {#if componentVersion === '2'}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Welcome Message
      </label>
      <textarea
        bind:value={userGreetingPrompt}
        onblur={handleGreetingPromptChange}
        class="input w-full"
        rows="2"
        placeholder="Enter a custom greeting message for the user..."
      ></textarea>
      <p class="text-xs text-text-secondary mt-1">
        This message will be spoken to the caller when the agent starts
      </p>
    </div>
  {/if}
  
  <!-- Agent Version -->
  {#if agentId}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Agent Version <span class="text-red-400">*</span>
      </label>
      <select
        bind:value={agentVersion}
        onchange={handleVersionChange}
        class="input w-full"
      >
        {#each availableVersions as version}
          <option value={version.value}>{version.name}</option>
        {/each}
      </select>
    </div>
    
    <!-- Tool Result Set Name -->
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Tool Result Set Name
      </label>
      <input
        type="text"
        bind:value={toolResultSetName}
        onblur={handleToolResultSetNameChange}
        class="input w-full"
        class:border-red-500={toolResultSetNameError()}
        placeholder="e.g., salesAgentTools"
      />
      {#if toolResultSetNameError()}
        <p class="text-xs text-red-400 mt-1">{toolResultSetNameError()}</p>
      {:else}
        <p class="text-xs text-text-secondary mt-1">
          Optional. Used to group tool results in Salesforce
        </p>
      {/if}
    </div>
  {/if}
  
  <!-- Tokens Section -->
  {#if agentId}
    <div class="border border-surface-300-700 rounded p-3">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium">Agent Tokens</h4>
        <button
          type="button"
          onclick={addToken}
          class="p-1 hover:bg-surface-100-900 rounded transition-colors text-accent"
          title="Add token"
        >
          <Plus class="w-4 h-4" />
        </button>
      </div>
      
      {#if tokens.length === 0}
        <p class="text-xs text-text-secondary">
          No tokens configured. Tokens allow you to pass dynamic values to the agent.
        </p>
      {:else}
        <div class="space-y-2">
          {#each tokens as token, index}
            <div class="flex gap-2 items-start">
              <div class="flex-1">
                <input
                  type="text"
                  value={token.key}
                  oninput={(e) => updateToken(index, 'key', (e.target as HTMLInputElement).value)}
                  class="input w-full text-sm"
                  placeholder="Token name"
                />
              </div>
              <div class="flex-1">
                <textarea
                  value={token.value}
                  oninput={(e) => updateToken(index, 'value', (e.target as HTMLTextAreaElement).value)}
                  class="input w-full text-sm resize-none"
                  rows="1"
                  placeholder="Token value (supports macros)"
                ></textarea>
              </div>
              <button
                type="button"
                onclick={() => removeToken(index)}
                class="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                title="Remove token"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          {/each}
        </div>
        <p class="text-xs text-text-secondary mt-2">
          Tokens are key-value pairs passed to the agent. Values support macros like {`{{caller_name}}`}
        </p>
      {/if}
    </div>
  {/if}
  
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

