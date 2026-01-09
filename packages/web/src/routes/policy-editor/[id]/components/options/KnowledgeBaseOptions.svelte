<script lang="ts">
  import type { Node } from '$lib/stores/policy-editor';
  import type { PolicyEditorContext } from '$lib/stores/policy-editor';
  import { Loader2, RefreshCw, Search, Play, CheckCircle, AlertTriangle, XCircle } from 'lucide-svelte';
  
  interface KnowledgeStore {
    id: string;
    value: string;
    label: string;
    tags: Array<{ label: string; value: string }>;
    metaProperties: Array<{ id: string; name: string; value: string }>;
  }
  
  interface TestResult {
    content: string;
    score: number;
    source?: string;
  }
  
  interface Props {
    node: Node;
    context: PolicyEditorContext;
    onUpdate: (data: Record<string, unknown>) => void;
  }
  
  let { node, context, onUpdate }: Props = $props();
  
  let label = $state(node.data?.label as string || 'Knowledge Base');
  let knowledgeBaseId = $state(node.data?.knowledgeBaseId as string || '');
  let tagFilter = $state<string[]>((node.data?.tagFilter as string[]) || []);
  let queryThreshold = $state(node.data?.queryThreshold as number ?? 70);
  let goalPrompt = $state(node.data?.goalPrompt as string || '');
  let userGreetingPrompt = $state(node.data?.userGreetingPrompt as string || '');
  let domainSpecificKnowledge = $state(node.data?.domainSpecificKnowledge as string || '');
  let knowledgeCompleteConfirmPrompt = $state(node.data?.knowledgeCompleteConfirmPrompt as string || '');
  let advanced = $state(node.data?.advanced as boolean || false);
  
  let isLoading = $state(false);
  let isLoadingStatus = $state(false);
  let isTesting = $state(false);
  let testQuery = $state('');
  let testResults = $state<TestResult[]>([]);
  let showTestModal = $state(false);
  let knowledgeBaseStatus = $state<string | null>(null);
  
  // Available knowledge stores
  let availableStores = $state<KnowledgeStore[]>([]);
  
  // Get selected store
  const selectedStore = $derived(
    availableStores.find(s => s.id === knowledgeBaseId)
  );
  
  // Load knowledge stores
  async function loadStores() {
    isLoading = true;
    try {
      // In a real implementation, this would call the API:
      // const response = await fetch('/api/ai/knowledge');
      // availableStores = await response.json();
      
      // For now, use demo data
      availableStores = [
        { 
          id: '', 
          value: '', 
          label: 'Select a knowledge base...', 
          tags: [], 
          metaProperties: [] 
        },
        { 
          id: 'kb-1', 
          value: 'kb-1', 
          label: 'Product Documentation', 
          tags: [
            { label: 'products', value: 'products' },
            { label: 'features', value: 'features' },
            { label: 'pricing', value: 'pricing' },
          ],
          metaProperties: [
            { id: '1', name: 'category', value: 'documentation' },
          ],
        },
        { 
          id: 'kb-2', 
          value: 'kb-2', 
          label: 'Support FAQ', 
          tags: [
            { label: 'support', value: 'support' },
            { label: 'troubleshooting', value: 'troubleshooting' },
          ],
          metaProperties: [],
        },
        { 
          id: 'kb-3', 
          value: 'kb-3', 
          label: 'Company Policies', 
          tags: [
            { label: 'hr', value: 'hr' },
            { label: 'legal', value: 'legal' },
          ],
          metaProperties: [
            { id: '2', name: 'department', value: 'internal' },
          ],
        },
      ];
    } catch (e) {
      console.error('Failed to load knowledge stores:', e);
    } finally {
      isLoading = false;
    }
  }
  
  async function loadStatus() {
    if (!knowledgeBaseId) return;
    
    isLoadingStatus = true;
    try {
      // In a real implementation, this would call the API:
      // const response = await fetch(`/api/ai/knowledge/${knowledgeBaseId}/status`);
      // knowledgeBaseStatus = await response.json();
      
      // For now, simulate
      knowledgeBaseStatus = 'READY';
    } catch (e) {
      console.error('Failed to load knowledge base status:', e);
      knowledgeBaseStatus = 'UNKNOWN';
    } finally {
      isLoadingStatus = false;
    }
  }
  
  function handleLabelChange() {
    onUpdate({ label });
  }
  
  function handleKnowledgeBaseChange() {
    // Reset filters when changing knowledge base
    tagFilter = [];
    onUpdate({ 
      knowledgeBaseId,
      tagFilter: [],
      metaPropertyFilter: [],
    });
    
    // Load status for the new knowledge base
    loadStatus();
  }
  
  function handleTagFilterChange(tag: string) {
    if (tagFilter.includes(tag)) {
      tagFilter = tagFilter.filter(t => t !== tag);
    } else {
      tagFilter = [...tagFilter, tag];
    }
    onUpdate({ tagFilter });
  }
  
  function handleThresholdChange() {
    // Clamp between 0 and 100
    queryThreshold = Math.max(0, Math.min(100, queryThreshold));
    onUpdate({ queryThreshold });
  }
  
  function handleGoalPromptChange() {
    onUpdate({ goalPrompt });
  }
  
  function handleGreetingPromptChange() {
    onUpdate({ userGreetingPrompt });
  }
  
  function handleDomainKnowledgeChange() {
    onUpdate({ domainSpecificKnowledge });
  }
  
  function handleCompletePromptChange() {
    onUpdate({ knowledgeCompleteConfirmPrompt });
  }
  
  async function runTest() {
    if (!knowledgeBaseId || !testQuery) return;
    
    isTesting = true;
    testResults = [];
    
    try {
      // In a real implementation, this would call the API:
      // const response = await fetch('/api/ai/knowledge/test', {
      //   method: 'POST',
      //   body: JSON.stringify({ knowledgeBaseId, query: testQuery, threshold: queryThreshold }),
      // });
      // testResults = await response.json();
      
      // For now, simulate results
      await new Promise(r => setTimeout(r, 1000));
      testResults = [
        {
          content: 'The product supports integration with CRM systems through our REST API. You can find the documentation at docs.example.com/api.',
          score: 0.92,
          source: 'api-documentation.md',
        },
        {
          content: 'Our enterprise plan includes unlimited API calls and dedicated support.',
          score: 0.78,
          source: 'pricing-guide.md',
        },
      ];
    } catch (e) {
      console.error('Failed to test knowledge base:', e);
    } finally {
      isTesting = false;
    }
  }
  
  function getStatusIcon(status: string | null) {
    switch (status) {
      case 'READY': return CheckCircle;
      case 'INDEXING': return Loader2;
      case 'ERROR': return XCircle;
      default: return AlertTriangle;
    }
  }
  
  function getStatusColor(status: string | null): string {
    switch (status) {
      case 'READY': return 'text-green-400';
      case 'INDEXING': return 'text-yellow-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-text-secondary';
    }
  }
  
  // Load stores on mount
  $effect(() => {
    loadStores();
  });
  
  // Load status when knowledge base is selected
  $effect(() => {
    if (knowledgeBaseId) {
      loadStatus();
    }
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
  
  <!-- Knowledge Base Selection -->
  <div>
    <div class="flex items-center justify-between mb-1">
      <label class="block text-sm font-medium text-text-secondary">
        Knowledge Base
      </label>
      <button
        type="button"
        onclick={loadStores}
        disabled={isLoading}
        class="p-1 hover:bg-surface-100-900 rounded transition-colors"
        title="Refresh knowledge bases"
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
        Loading knowledge bases...
      </div>
    {:else}
      <select
        bind:value={knowledgeBaseId}
        onchange={handleKnowledgeBaseChange}
        class="input w-full"
      >
        {#each availableStores as store}
          <option value={store.id}>{store.label}</option>
        {/each}
      </select>
      
      <!-- Status indicator -->
      {#if knowledgeBaseId && knowledgeBaseStatus}
        <div class="flex items-center gap-1 mt-1 text-xs {getStatusColor(knowledgeBaseStatus)}">
          <svelte:component this={getStatusIcon(knowledgeBaseStatus)} class="w-3 h-3" />
          <span>Status: {knowledgeBaseStatus}</span>
        </div>
      {/if}
    {/if}
  </div>
  
  <!-- Tag Filters -->
  {#if knowledgeBaseId && selectedStore && selectedStore.tags.length > 0}
    <div>
      <label class="block text-sm font-medium text-text-secondary mb-1">
        Tag Filters
      </label>
      <div class="flex flex-wrap gap-1">
        {#each selectedStore.tags as tag}
          <button
            type="button"
            onclick={() => handleTagFilterChange(tag.value)}
            class="px-2 py-1 text-xs rounded transition-colors border"
            class:bg-accent={tagFilter.includes(tag.value)}
            class:bg-opacity-20={tagFilter.includes(tag.value)}
            class:border-accent={tagFilter.includes(tag.value)}
            class:border-surface-300-700={!tagFilter.includes(tag.value)}
          >
            {tag.label}
          </button>
        {/each}
      </div>
      <p class="text-xs text-text-secondary mt-1">
        Select tags to filter knowledge base results
      </p>
    </div>
  {/if}
  
  <!-- Query Threshold -->
  <div>
    <label class="block text-sm font-medium text-text-secondary mb-1">
      Relevance Threshold
      <span class="ml-1 text-text-secondary">({queryThreshold}%)</span>
    </label>
    <input
      type="range"
      bind:value={queryThreshold}
      onchange={handleThresholdChange}
      class="w-full"
      min="0"
      max="100"
      step="1"
    />
    <div class="flex justify-between text-xs text-text-secondary">
      <span>More results (0%)</span>
      <span>Higher quality (100%)</span>
    </div>
  </div>
  
  <!-- Prompts Section -->
  {#if knowledgeBaseId}
    <div class="space-y-3 pt-3 border-t border-surface-300-700">
      <h4 class="text-sm font-medium">Prompts Configuration</h4>
      
      <!-- Goal Prompt -->
      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1">
          Goal Prompt
        </label>
        <textarea
          bind:value={goalPrompt}
          onblur={handleGoalPromptChange}
          class="input w-full text-sm"
          rows="2"
          placeholder="Describe what the knowledge base should help with..."
        ></textarea>
      </div>
      
      <!-- User Greeting -->
      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1">
          User Greeting
        </label>
        <textarea
          bind:value={userGreetingPrompt}
          onblur={handleGreetingPromptChange}
          class="input w-full text-sm"
          rows="2"
          placeholder="Custom greeting for the user..."
        ></textarea>
      </div>
      
      <!-- Domain Knowledge -->
      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1">
          Domain-Specific Knowledge
        </label>
        <textarea
          bind:value={domainSpecificKnowledge}
          onblur={handleDomainKnowledgeChange}
          class="input w-full text-sm"
          rows="2"
          placeholder="Additional context or terminology..."
        ></textarea>
      </div>
      
      <!-- Complete Confirm Prompt -->
      <div>
        <label class="block text-xs font-medium text-text-secondary mb-1">
          Completion Confirmation
        </label>
        <textarea
          bind:value={knowledgeCompleteConfirmPrompt}
          onblur={handleCompletePromptChange}
          class="input w-full text-sm"
          rows="2"
          placeholder="Message when knowledge search is complete..."
        ></textarea>
      </div>
    </div>
  {/if}
  
  <!-- Test Section -->
  {#if knowledgeBaseId}
    <div class="border border-surface-300-700 rounded p-3">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium">Test Knowledge Base</h4>
        <button
          type="button"
          onclick={() => showTestModal = !showTestModal}
          class="text-xs text-text-primary hover:underline"
        >
          {showTestModal ? 'Hide' : 'Show'} Test
        </button>
      </div>
      
      {#if showTestModal}
        <div class="space-y-2">
          <div class="relative">
            <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              bind:value={testQuery}
              class="input w-full pl-8 pr-20"
              placeholder="Enter a test query..."
            />
            <button
              type="button"
              onclick={runTest}
              disabled={isTesting || !testQuery}
              class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 text-xs bg-accent rounded hover:bg-accent/80 disabled:opacity-50"
            >
              {#if isTesting}
                <Loader2 class="w-3 h-3 animate-spin" />
              {:else}
                <Play class="w-3 h-3" />
              {/if}
              Test
            </button>
          </div>
          
          <!-- Test Results -->
          {#if testResults.length > 0}
            <div class="max-h-48 overflow-y-auto space-y-2">
              {#each testResults as result, i}
                <div class="bg-surface-100-900 rounded p-2 text-sm">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-text-secondary">Result {i + 1}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                      {Math.round(result.score * 100)}% match
                    </span>
                  </div>
                  <p class="text-text-primary text-xs">{result.content}</p>
                  {#if result.source}
                    <p class="text-xs text-text-secondary mt-1">Source: {result.source}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {:else if !isTesting}
            <p class="text-xs text-text-secondary text-center py-2">
              Enter a query and click Test to see results
            </p>
          {/if}
        </div>
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

