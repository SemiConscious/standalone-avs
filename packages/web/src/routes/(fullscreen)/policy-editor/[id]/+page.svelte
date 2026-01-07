<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { Card, Button } from '$lib/components/ui';
  import { AlertCircle, ArrowLeft, Trash2 } from 'lucide-svelte';
  import { writable, get } from 'svelte/store';
  import FlowEditor from './FlowEditor.svelte';
  import { transformLegacyPolicy } from '$lib/policy-editor';
  import type { ActionData } from './$types';
  
  interface UserData {
    id: string;
    name: string;
    email?: string;
  }
  
  interface GroupData {
    id: string;
    name: string;
  }
  
  interface SoundData {
    id: string;
    name: string;
  }
  
  interface PhoneNumberData {
    id: string;
    name: string;
    number: string;
  }
  
  interface PolicyEditorPageData {
    policy?: {
      id: string;
      name: string;
      description: string;
      body: {
        nodes: Array<{ id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
        edges: Array<{ id: string; source: string; target: string; type?: string }>;
      };
      isActive?: boolean;
    };
    users?: UserData[];
    groups?: GroupData[];
    sounds?: SoundData[];
    phoneNumbers?: PhoneNumberData[];
    isDemo: boolean;
    isAuthenticated: boolean;
  }
  
  interface Props {
    data: PolicyEditorPageData;
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  console.log('[PolicyEditor] Loading policy:', data?.policy?.name);
  
  // State for tracking editor status  
  let loadError = $state<string | null>(null);
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let showDeleteConfirm = $state(false);
  let saveMessage = $state<string | null>(null);
  let policyName = $state(data.policy?.name || 'Untitled');
  
  // Initial data for FlowEditor
  const initialNodes = data.policy?.body?.nodes || [];
  const initialEdges = data.policy?.body?.edges || [];
  
  // Create writable stores for FlowEditor
  const nodesStore = writable(initialNodes);
  const edgesStore = writable(initialEdges);
  
  // Form references
  let saveFormRef: HTMLFormElement | null = $state(null);
  let policyInputRef: HTMLInputElement | null = $state(null);
  let deleteFormRef: HTMLFormElement | null = $state(null);
  
  // Save handler - submits the form
  async function handleSave() {
    if (data.isDemo || !data.policy?.id) {
      console.log('[PolicyEditor] Save not available in demo mode');
      saveMessage = 'Save not available in demo mode';
      setTimeout(() => saveMessage = null, 3000);
      return;
    }
    
    // Build the policy data for saving
    const policyData = {
      Id: data.policy.id,
      Id__c: null as string | null,
      Name: policyName,
      Description__c: data.policy.description || '',
      Type__c: 'POLICY_TYPE_CALL', // Could be made dynamic
      nodes: get(nodesStore).map(node => ({
        ...node,
        // Ensure proper format for save
        data: {
          ...node.data,
          templateId: node.data.templateId,
          templateClass: node.data.templateClass,
        }
      })),
      edges: get(edgesStore),
    };
    
    // Set the form value and submit
    if (policyInputRef) {
      policyInputRef.value = JSON.stringify(policyData);
    }
    if (saveFormRef) {
      saveFormRef.requestSubmit();
    }
  }
  
  // Delete handler - shows confirmation then submits
  function handleDeleteClick() {
    if (data.isDemo || !data.policy?.id) {
      saveMessage = 'Delete not available in demo mode';
      setTimeout(() => saveMessage = null, 3000);
      return;
    }
    showDeleteConfirm = true;
  }
  
  function handleDeleteConfirm() {
    showDeleteConfirm = false;
    if (deleteFormRef) {
      deleteFormRef.requestSubmit();
    }
  }
  
  function handleDeleteCancel() {
    showDeleteConfirm = false;
  }
  
  // Handle form response
  $effect(() => {
    if (form?.success) {
      saveMessage = form.message || 'Saved successfully!';
      setTimeout(() => saveMessage = null, 3000);
    } else if (form?.error) {
      saveMessage = `Error: ${form.error}`;
      setTimeout(() => saveMessage = null, 5000);
    }
  });
</script>

<svelte:head>
  <title>{policyName} | Policy Editor | Natterbox AVS</title>
</svelte:head>

<div class="policy-editor-page h-screen flex flex-col">
  <!-- Header Bar -->
  <header class="page-header h-12 px-4 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-4">
      <button 
        onclick={() => goto('/routing-policies')} 
        class="back-btn flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Back to Policies</span>
      </button>
      
      <div class="header-divider"></div>
      
      <div class="flex flex-col">
        <h1 class="text-sm font-semibold">{policyName}</h1>
        {#if data.isDemo}
          <span class="text-xs text-amber-400">Demo Mode</span>
        {/if}
      </div>
    </div>
    
    <!-- Delete button -->
    {#if !data.isDemo && data.policy?.id}
      <button 
        onclick={handleDeleteClick}
        disabled={isDeleting}
        class="delete-btn flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors"
        title="Delete policy"
      >
        <Trash2 class="w-4 h-4" />
        <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
      </button>
    {/if}
  </header>

  <!-- Main content -->
  <div class="flex-1 relative overflow-hidden">
    {#if loadError}
      <div class="absolute inset-0 flex items-center justify-center">
        <Card>
          <div class="p-6 text-center">
            <AlertCircle class="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 class="text-lg font-semibold mb-2">Failed to load editor</h2>
            <p class="opacity-70">{loadError}</p>
            <button onclick={() => goto('/routing-policies')} class="btn-primary mt-4 px-4 py-2 rounded">
              Back to Policies
            </button>
          </div>
        </Card>
      </div>
    {:else}
      <FlowEditor 
        nodes={nodesStore} 
        edges={edgesStore} 
        users={data.users || []}
        groups={data.groups || []}
        sounds={data.sounds || []}
        phoneNumbers={data.phoneNumbers || []}
        onSave={handleSave} 
      />
    {/if}
    
    <!-- Save status message -->
    {#if saveMessage}
      <div 
        class="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded shadow-lg z-50"
        class:bg-green-600={!saveMessage.startsWith('Error')}
        class:bg-red-600={saveMessage.startsWith('Error')}
      >
        {saveMessage}
      </div>
    {/if}
  </div>
</div>

<!-- Hidden form for save action -->
<form 
  method="POST" 
  action="?/save"
  bind:this={saveFormRef}
  use:enhance={() => {
    isSaving = true;
    return async ({ update }) => {
      await update();
      isSaving = false;
    };
  }}
  class="hidden"
>
  <input type="hidden" name="policy" bind:this={policyInputRef} />
</form>

<!-- Hidden form for delete action -->
<form 
  method="POST" 
  action="?/delete"
  bind:this={deleteFormRef}
  use:enhance={() => {
    isDeleting = true;
    return async ({ result, update }) => {
      isDeleting = false;
      if (result.type === 'success') {
        // Navigate back to policies list
        goto('/routing-policies');
      } else {
        await update();
      }
    };
  }}
  class="hidden"
>
</form>

<!-- Delete confirmation modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={handleDeleteCancel}
      onkeydown={(e) => e.key === 'Escape' && handleDeleteCancel()}
      role="button"
      tabindex="0"
    ></div>
    
    <!-- Modal -->
    <div class="relative z-10 bg-surface-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-surface-700">
      <h2 class="text-lg font-semibold mb-2">Delete Policy</h2>
      <p class="text-surface-300 mb-6">
        Are you sure you want to delete "{policyName}"? This action cannot be undone.
        The policy will be removed from both Salesforce and Natterbox.
      </p>
      
      <div class="flex justify-end gap-3">
        <button
          onclick={handleDeleteCancel}
          class="px-4 py-2 text-sm rounded bg-surface-700 hover:bg-surface-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={handleDeleteConfirm}
          class="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
        >
          Delete Policy
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .policy-editor-page {
    background-color: rgb(var(--color-surface-900));
    color: rgb(var(--color-surface-100));
  }
  
  .page-header {
    background-color: rgb(var(--color-surface-800));
    border-bottom: 1px solid rgb(var(--color-surface-700));
  }
  
  .back-btn {
    color: rgb(var(--color-surface-300));
  }
  
  .back-btn:hover {
    background-color: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-100));
  }
  
  .header-divider {
    width: 1px;
    height: 1.5rem;
    background-color: rgb(var(--color-surface-700));
  }
  
  .btn-primary {
    background-color: rgb(var(--color-primary-600));
    color: white;
  }
  
  .btn-primary:hover {
    background-color: rgb(var(--color-primary-500));
  }
  
  .delete-btn {
    color: rgb(var(--color-surface-300));
    border: 1px solid rgb(var(--color-surface-600));
  }
  
  .delete-btn:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
    border-color: rgb(239, 68, 68);
  }
  
  .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .bg-surface-800 {
    background-color: rgb(var(--color-surface-800));
  }
  
  .bg-surface-700 {
    background-color: rgb(var(--color-surface-700));
  }
  
  .bg-surface-600:hover {
    background-color: rgb(var(--color-surface-600));
  }
  
  .text-surface-300 {
    color: rgb(var(--color-surface-300));
  }
  
  .border-surface-700 {
    border-color: rgb(var(--color-surface-700));
  }
</style>
