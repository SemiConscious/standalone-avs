<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Button } from '$lib/components/ui';
  import { toasts } from '$lib/stores/toast';
  import { ArrowLeft, Save, Monitor, Settings } from 'lucide-svelte';
  import type { ActionData } from './$types';

  interface Props {
    form?: ActionData;
  }

  let { form }: Props = $props();

  let extension = $state('');
  let location = $state('');
  let description = $state('');
  let type = $state('SIP');
  let model = $state('');
  let macAddress = $state('');
  let enabled = $state(true);
  let isSubmitting = $state(false);

  const deviceTypes = [
    { value: 'SIP', label: 'SIP Phone' },
    { value: 'Softphone', label: 'Softphone' },
    { value: 'Web Phone', label: 'Web Phone' },
  ];

  // Show MAC address field only for SIP devices
  const showMacAddress = $derived(type === 'SIP');
</script>

<svelte:head>
  <title>New Device | Natterbox AVS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-4">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <a
      href="/devices"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to devices"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div>
      <h1 class="text-xl font-bold text-text-primary">New Device</h1>
      <p class="text-sm text-text-secondary">Add a new phone or softphone</p>
    </div>
  </div>

  {#if form?.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-3 flex items-center gap-3 text-sm">
      <span>{form.error}</span>
    </div>
  {/if}

  <form
    method="POST"
    action="?/create"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ result, update }) => {
        await update();
        isSubmitting = false;
        if (result.type === 'failure') {
          toasts.error(result.data?.error || 'Failed to create device');
        }
      };
    }}
  >
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Device Information -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
            <Monitor class="w-4 h-4 text-accent" />
            <h2 class="font-semibold text-text-primary text-sm">Device Information</h2>
          </div>
        {/snippet}

        <div class="space-y-3">
          <div>
            <label for="description" class="block text-xs font-medium mb-1 text-text-secondary">Description *</label>
            <input
              id="description"
              name="description"
              type="text"
              bind:value={description}
              class="input w-full"
              placeholder="e.g., Front Desk Phone"
              required
            />
          </div>

          <div>
            <label for="type" class="block text-xs font-medium mb-1 text-text-secondary">Device Type *</label>
            <select
              id="type"
              name="type"
              bind:value={type}
              class="input w-full"
              required
            >
              {#each deviceTypes as deviceType}
                <option value={deviceType.value}>{deviceType.label}</option>
              {/each}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="extension" class="block text-xs font-medium mb-1 text-text-secondary">Extension</label>
              <input
                id="extension"
                name="extension"
                type="text"
                bind:value={extension}
                class="input w-full"
                placeholder="2001"
              />
              <p class="text-xs text-text-secondary mt-1">2000-7999</p>
            </div>
            <div>
              <label for="location" class="block text-xs font-medium mb-1 text-text-secondary">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                bind:value={location}
                class="input w-full"
                placeholder="e.g., London Office"
              />
            </div>
          </div>

          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="enabled_checkbox"
                bind:checked={enabled}
                class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span class="text-sm font-medium text-text-primary">Device Enabled</span>
            </label>
            <input type="hidden" name="enabled" value={enabled ? 'true' : 'false'} />
            <p class="text-xs text-text-secondary mt-1 ml-6">Allow this device to make and receive calls</p>
          </div>
        </div>
      </Card>

      <!-- Technical Details -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
            <Settings class="w-4 h-4 text-accent" />
            <h2 class="font-semibold text-text-primary text-sm">Technical Details</h2>
          </div>
        {/snippet}

        <div class="space-y-3">
          <div>
            <label for="model" class="block text-xs font-medium mb-1 text-text-secondary">Model</label>
            <input
              id="model"
              name="model"
              type="text"
              bind:value={model}
              class="input w-full"
              placeholder="e.g., Polycom VVX 450"
            />
          </div>

          {#if showMacAddress}
            <div>
              <label for="macAddress" class="block text-xs font-medium mb-1 text-text-secondary">MAC Address *</label>
              <input
                id="macAddress"
                name="macAddress"
                type="text"
                bind:value={macAddress}
                class="input w-full font-mono"
                placeholder="00:11:22:33:44:55"
                required={type === 'SIP'}
              />
              <p class="text-xs text-text-secondary mt-1">Required for SIP devices</p>
            </div>
          {:else}
            <input type="hidden" name="macAddress" value="" />
          {/if}

          <div class="p-3 bg-surface-700 border border-surface-600 rounded-lg">
            <p class="text-xs text-text-secondary">
              {#if type === 'SIP'}
                SIP phones require a MAC address for provisioning. The device will be automatically configured once connected to the network.
              {:else if type === 'Softphone'}
                Softphones are software-based phones that can be installed on computers or mobile devices.
              {:else}
                Web phones work directly in the browser and don't require any installation.
              {/if}
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 mt-4">
      <Button variant="secondary" href="/devices" size="sm">Cancel</Button>
      <Button variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting} size="sm">
        <Save class="w-4 h-4 mr-1.5" />
        Create Device
      </Button>
    </div>
  </form>
</div>
