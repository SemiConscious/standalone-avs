<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import { 
    Settings, 
    Plus, 
    Trash2, 
    AlertCircle, 
    Info,
    User,
    FileText,
  } from 'lucide-svelte';
  import type { GeneralSettingsData } from './+page.server';
  import type { ActionData } from './$types';
  
  interface Props {
    data: GeneralSettingsData;
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  let showAddModal = $state(false);
  let newObjectName = $state('');
  let newType = $state<'WHO_ID' | 'WHAT_ID'>('WHO_ID');
  let isSubmitting = $state(false);
  
  // Group configs by type
  const whoIdConfigs = $derived(
    data.autocompleteConfigs.filter(c => c.type === 'WHO_ID')
  );
  
  const whatIdConfigs = $derived(
    data.autocompleteConfigs.filter(c => c.type === 'WHAT_ID')
  );
  
  function getTypeDescription(type: 'WHO_ID' | 'WHAT_ID'): string {
    if (type === 'WHO_ID') {
      return 'Used for Name lookup fields (people/accounts). These objects will appear in the "Who" field suggestions.';
    }
    return 'Used for Related To lookup fields (records). These objects will appear in the "What" field suggestions.';
  }
  
  function resetForm() {
    newObjectName = '';
    newType = 'WHO_ID';
    showAddModal = false;
  }
</script>

<svelte:head>
  <title>General Settings | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">General Settings</h1>
      <p class="text-text-secondary mt-1">Configure OmniChannel and autocomplete settings</p>
    </div>
  </div>
  
  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}
  
  <!-- Success Message -->
  {#if form?.success}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-4 flex items-center gap-3">
      <Info class="w-5 h-5 flex-shrink-0" />
      <p>{form.message}</p>
    </div>
  {/if}
  
  <!-- Autocomplete Configuration Section -->
  <Card>
    {#snippet header()}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Settings class="w-5 h-5 text-text-primary" />
          <h2 class="font-semibold">Autocomplete Configuration</h2>
        </div>
        <Button 
          variant="primary" 
          size="sm"
          onclick={() => showAddModal = true}
        >
          <Plus class="w-4 h-4" />
          Add Object
        </Button>
      </div>
    {/snippet}
    
    <div class="space-y-6">
      <p class="text-sm text-text-secondary">
        Configure which Salesforce objects appear in the autocomplete dropdowns for OmniChannel.
        These settings affect the WHO_ID (Name) and WHAT_ID (Related To) fields.
      </p>
      
      <!-- WHO_ID Configuration -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <User class="w-4 h-4 text-blue-400" />
          <h3 class="font-medium">WHO_ID Objects (Name Field)</h3>
          <Badge variant="accent" size="sm">{whoIdConfigs.length}/5</Badge>
        </div>
        <p class="text-xs text-text-secondary mb-3">
          {getTypeDescription('WHO_ID')}
        </p>
        
        {#if whoIdConfigs.length === 0}
          <div class="text-sm text-text-secondary bg-bg-secondary rounded p-4">
            No WHO_ID objects configured. Default objects (Account, Contact, Lead) will be used.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {#each whoIdConfigs as config}
              <div class="flex items-center justify-between p-3 bg-bg-secondary rounded border border-border">
                <div>
                  <span class="font-medium text-sm">{config.label}</span>
                  <span class="text-xs text-text-secondary ml-2">({config.objectName})</span>
                </div>
                <form method="POST" action="?/removeConfig" use:enhance>
                  <input type="hidden" name="developerName" value={config.developerName} />
                  <button
                    type="submit"
                    class="p-1 text-text-secondary hover:text-error transition-colors"
                    title="Remove configuration"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- WHAT_ID Configuration -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <FileText class="w-4 h-4 text-purple-400" />
          <h3 class="font-medium">WHAT_ID Objects (Related To Field)</h3>
          <Badge variant="accent" size="sm">{whatIdConfigs.length}/5</Badge>
        </div>
        <p class="text-xs text-text-secondary mb-3">
          {getTypeDescription('WHAT_ID')}
        </p>
        
        {#if whatIdConfigs.length === 0}
          <div class="text-sm text-text-secondary bg-bg-secondary rounded p-4">
            No WHAT_ID objects configured. Default objects (Case) will be used.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {#each whatIdConfigs as config}
              <div class="flex items-center justify-between p-3 bg-bg-secondary rounded border border-border">
                <div>
                  <span class="font-medium text-sm">{config.label}</span>
                  <span class="text-xs text-text-secondary ml-2">({config.objectName})</span>
                </div>
                <form method="POST" action="?/removeConfig" use:enhance>
                  <input type="hidden" name="developerName" value={config.developerName} />
                  <button
                    type="submit"
                    class="p-1 text-text-secondary hover:text-error transition-colors"
                    title="Remove configuration"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </form>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </Card>
  
  <!-- Info Card -->
  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        <Info class="w-5 h-5 text-blue-400" />
        <h2 class="font-semibold">About Autocomplete Configuration</h2>
      </div>
    {/snippet}
    
    <div class="prose prose-sm prose-invert max-w-none">
      <p>
        Autocomplete configurations control which Salesforce objects appear in dropdown menus
        throughout the OmniChannel interface. This helps agents quickly find the right records
        when handling customer interactions.
      </p>
      
      <h4>WHO_ID Objects</h4>
      <p>
        These objects appear in "Name" or "Who" fields. Typically includes people-related objects
        like Account, Contact, Lead, and Person Account.
      </p>
      
      <h4>WHAT_ID Objects</h4>
      <p>
        These objects appear in "Related To" or "What" fields. Typically includes record objects
        like Case, Opportunity, and custom objects.
      </p>
      
      <h4>Limits</h4>
      <p>
        You can configure up to 5 objects for each type (WHO_ID and WHAT_ID). This limit helps
        ensure good performance and a clean user experience.
      </p>
    </div>
  </Card>
</div>

<!-- Add Object Modal -->
{#if showAddModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={resetForm}
      onkeydown={(e) => e.key === 'Escape' && resetForm()}
      role="button"
      tabindex="0"
    ></div>
    
    <!-- Modal -->
    <div class="relative z-10 bg-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h2 class="text-lg font-semibold">Add Autocomplete Object</h2>
        <button 
          onclick={resetForm}
          class="p-1 hover:bg-bg-tertiary rounded"
        >
          <span class="sr-only">Close</span>
          ×
        </button>
      </div>
      
      <form 
        method="POST" 
        action="?/addConfig"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
            resetForm();
          };
        }}
        class="p-4 space-y-4"
      >
        <div>
          <label for="objectName" class="block text-sm font-medium mb-1">Salesforce Object</label>
          <select
            id="objectName"
            name="objectName"
            bind:value={newObjectName}
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="">Select an object...</option>
            {#each data.availableObjects as obj}
              <option value={obj.name}>{obj.label} ({obj.name})</option>
            {/each}
          </select>
        </div>
        
        <div>
          <label for="type" class="block text-sm font-medium mb-1">Configuration Type</label>
          <select
            id="type"
            name="type"
            bind:value={newType}
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="WHO_ID">WHO_ID (Name Field)</option>
            <option value="WHAT_ID">WHAT_ID (Related To Field)</option>
          </select>
          <p class="text-xs text-text-secondary mt-1">
            {getTypeDescription(newType)}
          </p>
        </div>
        
        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onclick={resetForm}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !newObjectName}>
            {isSubmitting ? 'Adding...' : 'Add Object'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}

