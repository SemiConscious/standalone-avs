<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Button, Input, Select } from '$lib/components/ui';
  import { toasts } from '$lib/stores/toast';
  import { ArrowLeft, Save } from 'lucide-svelte';
  import type { ActionData } from './$types';

  interface Props {
    form?: ActionData;
  }

  let { form }: Props = $props();

  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let username = $state('');
  let extension = $state('');
  let mobilePhone = $state('');
  let permissionLevel = $state('Basic');
  let enabled = $state(true);
  let isSubmitting = $state(false);

  const permissionLevelOptions = [
    { value: 'Basic', label: 'Basic' },
    { value: 'Standard', label: 'Standard' },
    { value: 'Team Leader', label: 'Team Leader' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Super Admin', label: 'Super Admin' },
  ];
</script>

<svelte:head>
  <title>Create User | Natterbox AVS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-4">
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
      <h1 class="text-xl font-bold text-text-primary">Create User</h1>
      <p class="text-sm text-text-secondary">Add a new user to your organization</p>
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
          toasts.error(result.data?.error || 'Failed to create user');
        }
      };
    }}
  >
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Personal Information -->
      <Card>
        {#snippet header()}
          <h2 class="font-semibold text-text-primary text-sm">Personal Information</h2>
        {/snippet}

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              name="firstName"
              bind:value={firstName}
              required
              placeholder="John"
            />
            <Input
              label="Last Name"
              name="lastName"
              bind:value={lastName}
              required
              placeholder="Smith"
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            bind:value={email}
            placeholder="john.smith@example.com"
            hint="Optional if username provided"
          />

          <Input
            label="Username"
            name="username"
            bind:value={username}
            placeholder="jsmith"
            hint="Optional if email provided"
          />
        </div>
      </Card>

      <!-- Phone & Settings -->
      <Card>
        {#snippet header()}
          <h2 class="font-semibold text-text-primary text-sm">Phone & Settings</h2>
        {/snippet}

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <Input
              label="Extension"
              name="extension"
              bind:value={extension}
              placeholder="1001"
              hint="1000-9999"
            />

            <Input
              label="Mobile Phone"
              name="mobilePhone"
              type="tel"
              bind:value={mobilePhone}
              placeholder="+44 7xxx xxxxxx"
            />
          </div>

          <Select
            label="Permission Level"
            name="permissionLevel"
            bind:value={permissionLevel}
            options={permissionLevelOptions}
          />

          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="enabled"
                bind:checked={enabled}
                class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent"
              />
              <span class="text-sm font-medium text-text-primary">User Enabled</span>
            </label>
            <input type="hidden" name="enabled" value={enabled ? 'true' : 'false'} />
            <p class="text-xs text-text-secondary mt-1">Allow this user to access the system</p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 mt-4">
      <Button variant="secondary" href="/users" size="sm">Cancel</Button>
      <Button variant="primary" type="submit" loading={isSubmitting} disabled={isSubmitting} size="sm">
        <Save class="w-4 h-4 mr-1.5" />
        Create User
      </Button>
    </div>
  </form>
</div>

