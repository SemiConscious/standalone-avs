<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  import { Card } from '$lib/components/ui';
  import { ArrowLeft, AlertCircle, Save } from 'lucide-svelte';
  import type { PolicyEditorPageData } from './+page.server';

  interface Props {
    data: PolicyEditorPageData;
  }

  let { data }: Props = $props();

  // Simple state for tracking editor status
  let editorReady = $state(false);
  let loadError = $state<string | null>(null);
  let policyName = $state(data.policy?.name || 'Untitled');
  
  // Store SvelteFlow module reference
  let SvelteFlowModule = $state<typeof import('@xyflow/svelte') | null>(null);
  
  // Local writable stores for SvelteFlow (it requires writable stores)
  const nodes = writable<Array<{ id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> }>>(
    data.policy?.body.nodes || []
  );
  const edges = writable<Array<{ id: string; source: string; target: string; type?: string }>>(
    data.policy?.body.edges || []
  );

  onMount(async () => {
    console.log('[PolicyEditor] onMount called');
    
    try {
      // Dynamically import @xyflow/svelte
      console.log('[PolicyEditor] Importing @xyflow/svelte...');
      const xyflow = await import('@xyflow/svelte');
      console.log('[PolicyEditor] @xyflow/svelte imported successfully');
      
      // Import styles
      await import('@xyflow/svelte/dist/style.css');
      console.log('[PolicyEditor] Styles imported');
      
      SvelteFlowModule = xyflow;
      editorReady = true;
      console.log('[PolicyEditor] Editor ready');
    } catch (e) {
      console.error('[PolicyEditor] Error loading editor:', e);
      loadError = e instanceof Error ? e.message : 'Unknown error loading editor';
    }
  });
</script>

<svelte:head>
  <title>{policyName} | Policy Editor | Natterbox AVS</title>
</svelte:head>

<div class="h-screen flex flex-col bg-surface-100-900">
  <!-- Header -->
  <header class="bg-surface-200-800 border-b border-surface-300-700 px-4 py-2 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <button onclick={() => goto('/routing-policies')} class="btn btn-sm preset-tonal-surface">
        <ArrowLeft class="w-4 h-4" />
        <span>Back</span>
      </button>
      
      <div class="flex flex-col">
        <h1 class="text-lg font-semibold text-text-primary">{policyName}</h1>
        {#if data.isDemo}
          <span class="text-xs text-warning">Demo Mode</span>
        {/if}
      </div>
    </div>
    
    <div class="flex items-center gap-2">
      <button class="btn btn-sm preset-filled-primary-500" disabled={data.isDemo}>
        <Save class="w-4 h-4" />
        <span>Save</span>
      </button>
    </div>
  </header>

  <!-- Main content -->
  <div class="flex-1 relative">
    {#if loadError}
      <div class="absolute inset-0 flex items-center justify-center">
        <Card>
          <div class="p-6 text-center">
            <AlertCircle class="w-12 h-12 text-error mx-auto mb-4" />
            <h2 class="text-lg font-semibold text-text-primary mb-2">Failed to load editor</h2>
            <p class="text-text-secondary">{loadError}</p>
            <button onclick={() => goto('/routing-policies')} class="btn preset-filled-primary-500 mt-4">
              Back to Policies
            </button>
          </div>
        </Card>
      </div>
    {:else if !editorReady}
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p class="text-text-secondary">Loading editor...</p>
        </div>
      </div>
    {:else if SvelteFlowModule}
      <SvelteFlowModule.SvelteFlow
        {nodes}
        {edges}
        fitView
        class="bg-surface-100-900"
      >
        <SvelteFlowModule.Background variant="dots" gap={15} />
        <SvelteFlowModule.Controls />
        <SvelteFlowModule.MiniMap />
      </SvelteFlowModule.SvelteFlow>
    {/if}
  </div>
</div>

<style>
  :global(.svelte-flow) {
    --xy-background-color: var(--color-surface-100);
    --xy-node-background-color: var(--color-surface-200);
    --xy-node-border-color: var(--color-surface-300);
    --xy-edge-stroke-default: var(--color-surface-400);
    --xy-handle-background-color: var(--color-primary-500);
  }
  
  :global(.dark .svelte-flow) {
    --xy-background-color: var(--color-surface-900);
    --xy-node-background-color: var(--color-surface-800);
    --xy-node-border-color: var(--color-surface-700);
    --xy-edge-stroke-default: var(--color-surface-600);
  }
</style>
