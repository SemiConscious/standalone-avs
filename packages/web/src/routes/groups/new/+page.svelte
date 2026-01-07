<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Button, Input, Badge } from '$lib/components/ui';
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
    { value: 'RING_ALL', label: 'Ring All - Call all members simultaneously' },
    { value: 'ROUND_ROBIN', label: 'Round Robin - Rotate through members' },
    { value: 'LEAST_CALLS', label: 'Least Calls - Member with fewest calls' },
    { value: 'LONGEST_IDLE', label: 'Longest Idle - Member idle longest' },
    { value: 'PRIORITY', label: 'Priority - Based on member priority' },
    { value: 'RANDOM', label: 'Random - Random member selection' },
    { value: 'LINEAR', label: 'Linear - Call members in order' },
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

<div class="max-w-2xl mx-auto space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - changes will not be saved</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error || form?.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error || form?.error}</p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4">
    <a
      href="/groups"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to groups"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div>
      <h1 class="text-2xl font-bold">Create Group</h1>
      <p class="text-text-secondary mt-1">Set up a new call group</p>
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
    <!-- Basic Information -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">Basic Information</h2>
      {/snippet}

      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-text-primary mb-1.5">
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

        <div>
          <label for="description" class="block text-sm font-medium text-text-primary mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            bind:value={description}
            rows="3"
            class="input w-full resize-none"
            placeholder="Enter group description..."
          ></textarea>
        </div>

        <div>
          <label for="extension" class="block text-sm font-medium text-text-primary mb-1.5">
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
            <p class="text-xs text-error mt-1">{extensionError}</p>
          {:else}
            <p class="text-xs text-text-secondary mt-1">
              Must be between 2000 and 7999
            </p>
          {/if}
        </div>
      </div>
    </Card>

    <!-- Call Routing -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">Call Routing</h2>
      {/snippet}

      <div class="space-y-4">
        <div>
          <label for="ringStrategy" class="block text-sm font-medium text-text-primary mb-1.5">
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
          <p class="text-xs text-text-secondary mt-1">
            How calls are distributed to group members
          </p>
        </div>

        <div>
          <label for="maxQueueTime" class="block text-sm font-medium text-text-primary mb-1.5">
            Max Queue Time (seconds)
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
          <p class="text-xs text-text-secondary mt-1">
            Maximum time a call will wait in queue before overflow
          </p>
        </div>
      </div>
    </Card>

    <!-- Group Purpose / Licenses -->
    <Card class="mb-6">
      {#snippet header()}
        <div class="flex items-center gap-2">
          <h2 class="font-semibold">Group Purpose</h2>
          <Badge variant="info" size="sm">Licenses</Badge>
        </div>
      {/snippet}

      <div class="space-y-1 mb-4">
        <p class="text-sm text-text-secondary">
          Select the purposes for this group. Each purpose requires the corresponding license
          to be enabled for your organization.
        </p>
      </div>

      <div class="space-y-4">
        <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base border border-border hover:border-accent/50 transition-colors">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-medium">PBX (Call Queue)</p>
              {#if data.licenseInfo?.pbx?.enabled}
                <Badge variant="success" size="sm">Available</Badge>
              {:else}
                <Badge variant="neutral" size="sm">Not Licensed</Badge>
              {/if}
            </div>
            <p class="text-sm text-text-secondary">Allow this group to be used in call queues</p>
          </div>
          <input
            type="checkbox"
            name="pbx"
            bind:checked={pbxEnabled}
            disabled={!data.licenseInfo?.pbx?.enabled}
            class="w-5 h-5 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
          />
        </label>

        <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base border border-border hover:border-accent/50 transition-colors">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-medium">Manager (Supervisor)</p>
              {#if data.licenseInfo?.manager?.enabled}
                <Badge variant="success" size="sm">Available</Badge>
              {:else}
                <Badge variant="neutral" size="sm">Not Licensed</Badge>
              {/if}
            </div>
            <p class="text-sm text-text-secondary">Allow supervisors to manage this group</p>
          </div>
          <input
            type="checkbox"
            name="manager"
            bind:checked={managerEnabled}
            disabled={!data.licenseInfo?.manager?.enabled}
            class="w-5 h-5 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
          />
        </label>

        <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base border border-border hover:border-accent/50 transition-colors">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-medium">Record</p>
              {#if data.licenseInfo?.record?.enabled}
                <Badge variant="success" size="sm">Available</Badge>
              {:else}
                <Badge variant="neutral" size="sm">Not Licensed</Badge>
              {/if}
            </div>
            <p class="text-sm text-text-secondary">Enable call recording for this group</p>
          </div>
          <input
            type="checkbox"
            name="record"
            bind:checked={recordEnabled}
            disabled={!data.licenseInfo?.record?.enabled}
            class="w-5 h-5 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
          />
        </label>
      </div>

      <div class="mt-4 p-3 bg-info/10 border border-info/20 rounded-base flex items-start gap-2">
        <Info class="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
        <p class="text-xs text-info">
          Once a group purpose is set, it cannot be removed. Members added to this group
          must have the corresponding licenses enabled.
        </p>
      </div>
    </Card>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-4">
      <a href="/groups">
        <Button variant="secondary" type="button">Cancel</Button>
      </a>
      <Button 
        variant="primary" 
        type="submit" 
        loading={isSubmitting}
        disabled={!name || !!extensionError}
      >
        <Save class="w-4 h-4 mr-2" />
        Create Group
      </Button>
    </div>
  </form>
</div>
