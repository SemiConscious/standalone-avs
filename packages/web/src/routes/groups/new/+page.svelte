<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Button, Badge, Toggle } from '$lib/components/ui';
  import { ArrowLeft, Save, AlertCircle, FlaskConical, Info } from 'lucide-svelte';
  import type { ActionData } from './$types';

  interface Props {
    data: {
      isDemo: boolean;
      licenseInfo: {
        pbx: { enabled: boolean };
        manager: { enabled: boolean };
        record: { enabled: boolean };
      } | null;
      error?: string;
    };
    form: ActionData;
  }

  let { data, form }: Props = $props();

  // Form state
  let name = $state('');
  let description = $state('');
  let extension = $state('');
  let ringStrategy = $state('RING_ALL');
  let maxQueueTime = $state(300);
  let pbxEnabled = $state(false);
  let managerEnabled = $state(false);
  let recordEnabled = $state(false);
  let isSubmitting = $state(false);

  // Validation state
  let extensionError = $state('');

  const ringStrategyOptions = [
    { value: 'RING_ALL', label: 'Ring All' },
    { value: 'ROUND_ROBIN', label: 'Round Robin' },
    { value: 'LEAST_CALLS', label: 'Least Calls' },
    { value: 'LONGEST_IDLE', label: 'Longest Idle' },
    { value: 'PRIORITY', label: 'Priority' },
    { value: 'RANDOM', label: 'Random' },
    { value: 'LINEAR', label: 'Linear' },
  ];

  // Extension validation (matching GroupController.cls: 2000-7999)
  function validateExtension() {
    extensionError = '';
    if (extension) {
      const extNum = parseInt(extension);
      if (isNaN(extNum)) {
        extensionError = 'Extension must be a number';
      } else if (extNum < 2000 || extNum > 7999) {
        extensionError = 'Extension must be between 2000 and 7999';
      }
    }
  }
</script>

<svelte:head>
  <title>Create Group | Natterbox AVS</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-4">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-3 flex items-center gap-3 text-sm">
      <FlaskConical class="w-4 h-4 flex-shrink-0" />
      <p>Demo Mode - changes will not be saved</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error || form?.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-3 flex items-center gap-3 text-sm">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <p>{data.error || form?.error}</p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4 pb-2">
    <a
      href="/groups"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to groups"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div>
      <h1 class="text-xl font-bold text-text-primary">Create Group</h1>
      <p class="text-text-secondary text-sm mt-0.5">Set up a new call group</p>
    </div>
  </div>

  <form 
    method="POST" 
    action="?/create"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
  >
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Basic Information -->
      <Card class="md:col-span-2">
        {#snippet header()}
          <h3 class="font-semibold text-text-primary">Basic Information</h3>
        {/snippet}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label for="name" class="block text-xs font-medium text-text-secondary mb-1">
              Group Name <span class="text-error">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              bind:value={name}
              class="input w-full"
              placeholder="e.g., Sales Team"
              required
            />
          </div>

          <div class="md:col-span-2">
            <label for="description" class="block text-xs font-medium text-text-secondary mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              bind:value={description}
              rows="2"
              class="input w-full resize-none"
              placeholder="Enter group description..."
            ></textarea>
          </div>

          <div>
            <label for="extension" class="block text-xs font-medium text-text-secondary mb-1">
              Extension
            </label>
            <input
              id="extension"
              name="extension"
              type="text"
              bind:value={extension}
              oninput={validateExtension}
              class="input w-full"
              class:border-error={extensionError}
              placeholder="e.g., 2001"
            />
            {#if extensionError}
              <p class="text-xs text-error mt-0.5">{extensionError}</p>
            {:else}
              <p class="text-xs text-text-secondary mt-0.5">2000-7999</p>
            {/if}
          </div>

          <div>
            <label for="ringStrategy" class="block text-xs font-medium text-text-secondary mb-1">
              Ring Strategy
            </label>
            <select
              id="ringStrategy"
              name="ringStrategy"
              bind:value={ringStrategy}
              class="input w-full"
            >
              {#each ringStrategyOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="maxQueueTime" class="block text-xs font-medium text-text-secondary mb-1">
              Max Queue Time (sec)
            </label>
            <input
              id="maxQueueTime"
              name="maxQueueTime"
              type="number"
              bind:value={maxQueueTime}
              class="input w-full"
              min="0"
              max="3600"
            />
          </div>
        </div>
      </Card>

      <!-- Group Purpose / Licenses -->
      <Card class="md:col-span-2">
        {#snippet header()}
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-text-primary">Group Purpose</h3>
            <Badge variant="info" size="sm">Licenses</Badge>
          </div>
        {/snippet}

        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-text-primary">PBX (Call Queue)</span>
                {#if data.licenseInfo?.pbx?.enabled}
                  <Badge variant="success" size="sm">Available</Badge>
                {:else}
                  <Badge variant="neutral" size="sm">Not Licensed</Badge>
                {/if}
              </div>
              <p class="text-xs text-text-secondary mt-0.5">Allow this group to be used in call queues</p>
            </div>
            <Toggle
              bind:checked={pbxEnabled}
              disabled={!data.licenseInfo?.pbx?.enabled}
              name="pbx"
              size="sm"
            />
          </div>

          <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-text-primary">Manager (Supervisor)</span>
                {#if data.licenseInfo?.manager?.enabled}
                  <Badge variant="success" size="sm">Available</Badge>
                {:else}
                  <Badge variant="neutral" size="sm">Not Licensed</Badge>
                {/if}
              </div>
              <p class="text-xs text-text-secondary mt-0.5">Allow supervisors to manage this group</p>
            </div>
            <Toggle
              bind:checked={managerEnabled}
              disabled={!data.licenseInfo?.manager?.enabled}
              name="manager"
              size="sm"
            />
          </div>

          <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-text-primary">Record</span>
                {#if data.licenseInfo?.record?.enabled}
                  <Badge variant="success" size="sm">Available</Badge>
                {:else}
                  <Badge variant="neutral" size="sm">Not Licensed</Badge>
                {/if}
              </div>
              <p class="text-xs text-text-secondary mt-0.5">Enable call recording for this group</p>
            </div>
            <Toggle
              bind:checked={recordEnabled}
              disabled={!data.licenseInfo?.record?.enabled}
              name="record"
              size="sm"
            />
          </div>
        </div>

        <div class="mt-4 p-2.5 bg-surface-700 border border-surface-600 rounded-lg flex items-start gap-2">
          <Info class="w-3.5 h-3.5 text-text-primary mt-0.5 flex-shrink-0" />
          <p class="text-xs text-text-secondary">
            Once a purpose is set, it cannot be removed. Members must have the corresponding licenses.
          </p>
        </div>
      </Card>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 mt-4">
      <Button variant="secondary" href="/groups" size="sm">Cancel</Button>
      <Button 
        variant="primary" 
        type="submit" 
        loading={isSubmitting}
        disabled={!name || !!extensionError}
        size="sm"
      >
        <Save class="w-4 h-4 mr-1" />
        Create Group
      </Button>
    </div>
  </form>
</div>
