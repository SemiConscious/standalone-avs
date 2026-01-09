<script lang="ts">
  import { Card, Button, Input } from '$lib/components/ui';
  import { Save } from 'lucide-svelte';

  let organizationName = $state('Acme Corporation');
  let timezone = $state('America/New_York');
  let dateFormat = $state('MM/DD/YYYY');
  let defaultCountryCode = $state('+1');
  let recordingEnabled = $state(true);
  let voicemailEnabled = $state(true);
</script>

<svelte:head>
  <title>Settings | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6 max-w-3xl">
  <!-- Page Header -->
  <div>
    <h1 class="text-2xl font-bold">General Settings</h1>
    <p class="text-text-secondary mt-1">Configure your organization settings</p>
  </div>

  <!-- Organization Settings -->
  <Card>
    {#snippet header()}
      <h2 class="font-semibold">Organization</h2>
    {/snippet}

    <div class="space-y-4">
      <Input label="Organization Name" bind:value={organizationName} />

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-primary mb-1.5">Timezone</label>
          <select
            bind:value={timezone}
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-primary mb-1.5">Date Format</label>
          <select
            bind:value={dateFormat}
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>

      <Input
        label="Default Country Code"
        bind:value={defaultCountryCode}
        hint="Used for phone number formatting"
      />
    </div>
  </Card>

  <!-- Feature Settings -->
  <Card>
    {#snippet header()}
      <h2 class="font-semibold">Features</h2>
    {/snippet}

    <div class="space-y-4">
      <label class="flex items-center justify-between cursor-pointer">
        <div>
          <p class="font-medium">Call Recording</p>
          <p class="text-sm text-text-secondary">Record all calls by default</p>
        </div>
        <input
          type="checkbox"
          bind:checked={recordingEnabled}
          class="w-5 h-5 rounded border-border text-text-primary focus:ring-accent"
        />
      </label>

      <label class="flex items-center justify-between cursor-pointer">
        <div>
          <p class="font-medium">Voicemail</p>
          <p class="text-sm text-text-secondary">Enable voicemail for all users</p>
        </div>
        <input
          type="checkbox"
          bind:checked={voicemailEnabled}
          class="w-5 h-5 rounded border-border text-text-primary focus:ring-accent"
        />
      </label>
    </div>
  </Card>

  <!-- Save Button -->
  <div class="flex justify-end">
    <Button variant="primary">
      <Save class="w-4 h-4 mr-2" />
      Save Changes
    </Button>
  </div>
</div>

