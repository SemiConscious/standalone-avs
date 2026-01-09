<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Button } from '$lib/components/ui';
  import { toasts } from '$lib/stores/toast';
  import { ArrowLeft, Save, Phone, Workflow, Info } from 'lucide-svelte';
  import type { ActionData } from './$types';

  interface Props {
    data: {
      callFlows: { id: string; name: string }[];
      users: { id: string; name: string }[];
      isDemo: boolean;
      error?: string;
    };
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  let name = $state('');
  let number = $state('');
  let country = $state('');
  let countryCode = $state('');
  let area = $state('');
  let areaCode = $state('');
  let isDDI = $state(true);
  let isGeographic = $state(true);
  let callFlowId = $state('');
  let userId = $state('');
  let isSubmitting = $state(false);

  // Common country options
  const countryOptions = [
    { code: '44', name: 'United Kingdom', label: 'United Kingdom (+44)' },
    { code: '1', name: 'United States', label: 'United States (+1)' },
    { code: '61', name: 'Australia', label: 'Australia (+61)' },
    { code: '49', name: 'Germany', label: 'Germany (+49)' },
    { code: '33', name: 'France', label: 'France (+33)' },
    { code: '31', name: 'Netherlands', label: 'Netherlands (+31)' },
    { code: '353', name: 'Ireland', label: 'Ireland (+353)' },
  ];

  function handleCountryChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const selected = countryOptions.find(c => c.code === target.value);
    if (selected) {
      countryCode = selected.code;
      country = selected.name;
    }
  }
</script>

<svelte:head>
  <title>New Phone Number | Natterbox AVS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-4">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <a
      href="/phone-numbers"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to phone numbers"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div>
      <h1 class="text-xl font-bold text-text-primary">New Phone Number</h1>
      <p class="text-sm text-text-secondary">Register a new phone number in the system</p>
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
          toasts.error(result.data?.error || 'Failed to create phone number');
        }
      };
    }}
  >
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Phone Number Details -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
            <Phone class="w-4 h-4 text-text-primary" />
            <h2 class="font-semibold text-text-primary text-sm">Phone Number Details</h2>
          </div>
        {/snippet}

        <div class="space-y-3">
          <div>
            <label for="name" class="block text-xs font-medium mb-1 text-text-secondary">Display Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              bind:value={name}
              class="input w-full"
              placeholder="e.g., Main Office Line"
              required
            />
          </div>

          <div>
            <label for="number" class="block text-xs font-medium mb-1 text-text-secondary">Phone Number *</label>
            <input
              id="number"
              name="number"
              type="tel"
              bind:value={number}
              class="input w-full font-mono"
              placeholder="+44 20 7123 4567"
              required
            />
            <p class="text-xs text-text-secondary mt-1">Include country code (e.g., +44 for UK)</p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="countrySelect" class="block text-xs font-medium mb-1 text-text-secondary">Country</label>
              <select
                id="countrySelect"
                bind:value={countryCode}
                onchange={handleCountryChange}
                class="input w-full"
              >
                <option value="">Select country...</option>
                {#each countryOptions as opt}
                  <option value={opt.code}>{opt.label}</option>
                {/each}
              </select>
              <input type="hidden" name="country" value={country} />
              <input type="hidden" name="countryCode" value={countryCode} />
            </div>
            <div>
              <label for="area" class="block text-xs font-medium mb-1 text-text-secondary">Area</label>
              <input
                id="area"
                name="area"
                type="text"
                bind:value={area}
                class="input w-full"
                placeholder="e.g., London"
              />
            </div>
          </div>

          <div>
            <label for="areaCode" class="block text-xs font-medium mb-1 text-text-secondary">Area Code</label>
            <input
              id="areaCode"
              name="areaCode"
              type="text"
              bind:value={areaCode}
              class="input w-full"
              placeholder="e.g., 20"
            />
          </div>

          <div class="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={isDDI}
                  class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent"
                />
                <span class="text-sm font-medium text-text-primary">DDI Number</span>
              </label>
              <input type="hidden" name="isDDI" value={isDDI ? 'true' : 'false'} />
              <p class="text-xs text-text-secondary mt-1 ml-6">Direct Dial Inward</p>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={isGeographic}
                  class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent"
                />
                <span class="text-sm font-medium text-text-primary">Geographic</span>
              </label>
              <input type="hidden" name="isGeographic" value={isGeographic ? 'true' : 'false'} />
              <p class="text-xs text-text-secondary mt-1 ml-6">Location-based number</p>
            </div>
          </div>
        </div>
      </Card>

      <!-- Routing -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
            <Workflow class="w-4 h-4 text-text-primary" />
            <h2 class="font-semibold text-text-primary text-sm">Routing (Optional)</h2>
          </div>
        {/snippet}

        <div class="space-y-3">
          <div>
            <label for="callFlowId" class="block text-xs font-medium mb-1 text-text-secondary">Call Flow / Routing Policy</label>
            <select
              id="callFlowId"
              name="callFlowId"
              bind:value={callFlowId}
              class="input w-full"
            >
              <option value="">-- None --</option>
              {#each data.callFlows as cf}
                <option value={cf.id}>{cf.name}</option>
              {/each}
            </select>
            <p class="text-xs text-text-secondary mt-1">How inbound calls should be handled</p>
          </div>

          <div>
            <label for="userId" class="block text-xs font-medium mb-1 text-text-secondary">Direct to User</label>
            <select
              id="userId"
              name="userId"
              bind:value={userId}
              class="input w-full"
            >
              <option value="">-- None --</option>
              {#each data.users as user}
                <option value={user.id}>{user.name}</option>
              {/each}
            </select>
            <p class="text-xs text-text-secondary mt-1">Route directly to a specific user</p>
          </div>

          <div class="mt-4 p-3 bg-surface-700 border border-surface-600 rounded-lg flex items-start gap-2">
            <Info class="w-4 h-4 text-text-primary mt-0.5 flex-shrink-0" />
            <p class="text-xs text-text-secondary">
              Phone numbers are typically provisioned through your carrier. This form creates a record in Salesforce for routing configuration. Ensure the number is active with your carrier before adding it here.
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 mt-4">
      <Button variant="secondary" href="/phone-numbers" size="sm">Cancel</Button>
      <Button variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting} size="sm">
        <Save class="w-4 h-4 mr-1.5" />
        Create Phone Number
      </Button>
    </div>
  </form>
</div>
