<script lang="ts">
  import { Card, Button, Input, Select } from '$lib/components/ui';
  import { toasts } from '$lib/stores/toast';
  import { ArrowLeft, Save } from 'lucide-svelte';

  let name = $state('');
  let description = $state('');
  let type = $state('ring');
  let extension = $state('');
  let ringStrategy = $state('ring_all');
  let ringTimeout = $state('30');
  let voicemailEnabled = $state(false);
  let recordingEnabled = $state(false);
  let isSubmitting = $state(false);

  const typeOptions = [
    { value: 'ring', label: 'Ring Group' },
    { value: 'queue', label: 'Call Queue' },
    { value: 'hunt', label: 'Hunt Group' },
    { value: 'broadcast', label: 'Broadcast' },
  ];

  const ringStrategyOptions = [
    { value: 'ring_all', label: 'Ring All - Call all members simultaneously' },
    { value: 'round_robin', label: 'Round Robin - Rotate through members' },
    { value: 'least_recent', label: 'Least Recent - Member with oldest call' },
    { value: 'fewest_calls', label: 'Fewest Calls - Member with fewest calls' },
    { value: 'random', label: 'Random - Random member selection' },
    { value: 'linear', label: 'Linear - Call members in order' },
  ];

  async function handleSubmit(event: Event) {
    event.preventDefault();
    isSubmitting = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toasts.success('Group created successfully');
    } catch (error) {
      toasts.error('Failed to create group', 'Please try again later');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Create Group | Natterbox AVS</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
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

  <form onsubmit={handleSubmit}>
    <!-- Basic Information -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">Basic Information</h2>
      {/snippet}

      <div class="space-y-4">
        <Input
          label="Group Name"
          bind:value={name}
          required
          placeholder="Sales Team"
        />

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1.5">Description</label>
          <textarea
            bind:value={description}
            rows="3"
            class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            placeholder="Enter group description..."
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <Select
            label="Group Type"
            bind:value={type}
            options={typeOptions}
          />
          <Input
            label="Extension"
            bind:value={extension}
            placeholder="2001"
          />
        </div>
      </div>
    </Card>

    <!-- Call Routing -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">Call Routing</h2>
      {/snippet}

      <div class="space-y-4">
        <Select
          label="Ring Strategy"
          bind:value={ringStrategy}
          options={ringStrategyOptions}
          hint="How calls are distributed to group members"
        />

        <div class="grid grid-cols-2 gap-4">
          <Input
            label="Ring Timeout (seconds)"
            type="number"
            bind:value={ringTimeout}
            min="5"
            max="600"
            hint="Time before trying next member or action"
          />
        </div>
      </div>
    </Card>

    <!-- Features -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">Features</h2>
      {/snippet}

      <div class="space-y-4">
        <label class="flex items-center justify-between cursor-pointer">
          <div>
            <p class="font-medium">Voicemail</p>
            <p class="text-sm text-text-secondary">Enable voicemail for this group</p>
          </div>
          <input
            type="checkbox"
            bind:checked={voicemailEnabled}
            class="w-5 h-5 rounded border-border text-accent focus:ring-accent"
          />
        </label>

        <label class="flex items-center justify-between cursor-pointer">
          <div>
            <p class="font-medium">Call Recording</p>
            <p class="text-sm text-text-secondary">Record all calls to this group</p>
          </div>
          <input
            type="checkbox"
            bind:checked={recordingEnabled}
            class="w-5 h-5 rounded border-border text-accent focus:ring-accent"
          />
        </label>
      </div>
    </Card>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-4">
      <a href="/groups">
        <Button variant="secondary" type="button">Cancel</Button>
      </a>
      <Button variant="primary" type="submit" loading={isSubmitting}>
        <Save class="w-4 h-4 mr-2" />
        Create Group
      </Button>
    </div>
  </form>
</div>

