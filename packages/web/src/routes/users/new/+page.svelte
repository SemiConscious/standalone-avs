<script lang="ts">
  import { Card, Button, Input, Select } from '$lib/components/ui';
  import { toasts } from '$lib/stores/toast';
  import { ArrowLeft, Save } from 'lucide-svelte';

  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let username = $state('');
  let extension = $state('');
  let directDial = $state('');
  let timezone = $state('America/New_York');
  let licenseType = $state('standard');
  let groupIds = $state<string[]>([]);
  let isSubmitting = $state(false);

  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
  ];

  const licenseOptions = [
    { value: 'basic', label: 'Basic' },
    { value: 'standard', label: 'Standard' },
    { value: 'professional', label: 'Professional' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  async function handleSubmit(event: Event) {
    event.preventDefault();
    isSubmitting = true;

    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toasts.success('User created successfully');
      // Navigate back to users list
    } catch (error) {
      toasts.error('Failed to create user', 'Please try again later');
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Create User | Natterbox AVS</title>
</svelte:head>

<div class="max-w-2xl mx-auto space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <a
      href="/users"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to users"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div>
      <h1 class="text-2xl font-bold">Create User</h1>
      <p class="text-text-secondary mt-1">Add a new user to your organization</p>
    </div>
  </div>

  <form onsubmit={handleSubmit}>
    <!-- Personal Information -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">Personal Information</h2>
      {/snippet}

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            bind:value={firstName}
            required
            placeholder="John"
          />
          <Input
            label="Last Name"
            bind:value={lastName}
            required
            placeholder="Smith"
          />
        </div>

        <Input
          label="Email"
          type="email"
          bind:value={email}
          required
          placeholder="john.smith@example.com"
        />

        <Input
          label="Username"
          bind:value={username}
          required
          placeholder="jsmith"
          hint="Used for login and system identification"
        />
      </div>
    </Card>

    <!-- Phone Settings -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">Phone Settings</h2>
      {/snippet}

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <Input
            label="Extension"
            bind:value={extension}
            placeholder="1001"
            hint="Internal extension number"
          />
          <Input
            label="Direct Dial"
            bind:value={directDial}
            placeholder="+1 (415) 555-1234"
            hint="Direct inward dial number"
          />
        </div>

        <Select
          label="Timezone"
          bind:value={timezone}
          options={timezoneOptions}
        />
      </div>
    </Card>

    <!-- License & Groups -->
    <Card class="mb-6">
      {#snippet header()}
        <h2 class="font-semibold">License & Groups</h2>
      {/snippet}

      <div class="space-y-4">
        <Select
          label="License Type"
          bind:value={licenseType}
          options={licenseOptions}
          hint="Determines available features"
        />

        <div>
          <label class="block text-sm font-medium text-text-primary mb-1.5">Groups</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>Sales Team</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>Support Team</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>Technical Support</span>
            </label>
          </div>
        </div>
      </div>
    </Card>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-4">
      <a href="/users">
        <Button variant="secondary" type="button">Cancel</Button>
      </a>
      <Button variant="primary" type="submit" loading={isSubmitting}>
        <Save class="w-4 h-4 mr-2" />
        Create User
      </Button>
    </div>
  </form>
</div>

