<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button } from '$lib/components/ui';
  import { 
    ArrowLeft, 
    Save, 
    Phone, 
    Settings, 
    AlertCircle,
    FlaskConical,
    CheckCircle,
    MapPin,
    Link,
    User,
    Users,
  } from 'lucide-svelte';
  import type { ActionData } from './$types';
  import type { PhoneNumber } from './+page.server';
  
  interface Props {
    data: {
      phoneNumber: PhoneNumber | null;
      policies: { id: string; name: string }[];
      users: { id: string; name: string }[];
      groups: { id: string; name: string }[];
      isDemo: boolean;
      error?: string;
    };
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Form state
  let name = $state(data.phoneNumber?.name || '');
  let description = $state(data.phoneNumber?.description || '');
  let displayNumber = $state(data.phoneNumber?.displayNumber || '');
  let policyId = $state(data.phoneNumber?.policy?.id || '');
  let userId = $state(data.phoneNumber?.user?.id || '');
  let groupId = $state(data.phoneNumber?.group?.id || '');
  let callerIdPresentation = $state(data.phoneNumber?.callerIdPresentation || 'Number');
  let emergencyAddress = $state(data.phoneNumber?.emergencyAddress || '');
  
  let isSubmitting = $state(false);
  
  const callerIdOptions = [
    { value: 'Number', label: 'Show Number' },
    { value: 'Anonymous', label: 'Anonymous' },
    { value: 'Custom', label: 'Custom Display' },
  ];
  
  function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
      case 'active': return { variant: 'success' as const, label: 'Active' };
      case 'inactive': return { variant: 'neutral' as const, label: 'Inactive' };
      case 'pending': return { variant: 'warning' as const, label: 'Pending' };
      default: return { variant: 'neutral' as const, label: status || 'Unknown' };
    }
  }
  
  function getTypeBadge(type: string) {
    switch (type?.toUpperCase()) {
      case 'DDI': return { variant: 'accent' as const, label: 'DDI' };
      case 'TOLL_FREE': return { variant: 'success' as const, label: 'Toll Free' };
      case 'LOCAL': return { variant: 'neutral' as const, label: 'Local' };
      default: return { variant: 'neutral' as const, label: type || 'Unknown' };
    }
  }
</script>

<svelte:head>
  <title>{data.phoneNumber?.displayNumber || 'Phone Number'} | Natterbox AVS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-6">
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

  <!-- Success Banner -->
  {#if form?.success}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-4 flex items-center gap-3">
      <CheckCircle class="w-5 h-5 flex-shrink-0" />
      <p>Phone number updated successfully</p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4">
    <a
      href="/phone-numbers"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to phone numbers"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div class="flex-1">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold font-mono">{data.phoneNumber?.displayNumber || 'Unknown'}</h1>
        {#if data.phoneNumber}
          {@const statusBadge = getStatusBadge(data.phoneNumber.status)}
          {@const typeBadge = getTypeBadge(data.phoneNumber.type)}
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
        {/if}
      </div>
      <p class="text-text-secondary mt-1">{data.phoneNumber?.name || ''}</p>
    </div>
  </div>

  {#if data.phoneNumber}
    <form 
      method="POST" 
      action="?/update"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          await update();
          isSubmitting = false;
        };
      }}
    >
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Basic Info -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Phone class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Basic Information</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium mb-1">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                bind:value={name}
                class="input w-full"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="text"
                value={data.phoneNumber.number}
                class="input w-full font-mono"
                disabled
              />
              <p class="text-xs text-text-secondary mt-1">Phone number cannot be changed</p>
            </div>

            <div>
              <label for="displayNumber" class="block text-sm font-medium mb-1">Display Number</label>
              <input
                id="displayNumber"
                name="displayNumber"
                type="text"
                bind:value={displayNumber}
                class="input w-full font-mono"
                placeholder="+44 20 7123 4567"
              />
              <p class="text-xs text-text-secondary mt-1">How the number appears in the UI</p>
            </div>

            <div>
              <label for="description" class="block text-sm font-medium mb-1">Description</label>
              <textarea
                id="description"
                name="description"
                bind:value={description}
                class="input w-full"
                rows="3"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Country</label>
                <input
                  type="text"
                  value={data.phoneNumber.countryCode}
                  class="input w-full"
                  disabled
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Sapien ID</label>
                <input
                  type="text"
                  value={data.phoneNumber.sapienId}
                  class="input w-full font-mono"
                  disabled
                />
              </div>
            </div>
          </div>
        </Card>

        <!-- Routing -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Link class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Routing</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="policyId" class="block text-sm font-medium mb-1">Routing Policy</label>
              <select
                id="policyId"
                name="policyId"
                bind:value={policyId}
                class="input w-full"
              >
                <option value="">-- None --</option>
                {#each data.policies as policy}
                  <option value={policy.id}>{policy.name}</option>
                {/each}
              </select>
              {#if data.phoneNumber.policy}
                <p class="text-xs text-text-secondary mt-1">
                  Currently: {data.phoneNumber.policy.name}
                </p>
              {/if}
            </div>

            <div>
              <label for="userId" class="block text-sm font-medium mb-1">
                <User class="w-4 h-4 inline mr-1" />
                Direct to User
              </label>
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
            </div>

            <div>
              <label for="groupId" class="block text-sm font-medium mb-1">
                <Users class="w-4 h-4 inline mr-1" />
                Direct to Group
              </label>
              <select
                id="groupId"
                name="groupId"
                bind:value={groupId}
                class="input w-full"
              >
                <option value="">-- None --</option>
                {#each data.groups as group}
                  <option value={group.id}>{group.name}</option>
                {/each}
              </select>
            </div>
          </div>
        </Card>

        <!-- Caller ID -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Settings class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Caller ID Settings</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="callerIdPresentation" class="block text-sm font-medium mb-1">
                Caller ID Presentation
              </label>
              <select
                id="callerIdPresentation"
                name="callerIdPresentation"
                bind:value={callerIdPresentation}
                class="input w-full"
              >
                {#each callerIdOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
              <p class="text-xs text-text-secondary mt-1">
                How outbound calls from this number appear to recipients
              </p>
            </div>
          </div>
        </Card>

        <!-- Emergency Address -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <MapPin class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Emergency Address</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="emergencyAddress" class="block text-sm font-medium mb-1">
                E911/E999 Address
              </label>
              <textarea
                id="emergencyAddress"
                name="emergencyAddress"
                bind:value={emergencyAddress}
                class="input w-full"
                rows="3"
                placeholder="Enter the physical address for emergency services..."
              ></textarea>
              <p class="text-xs text-text-secondary mt-1">
                This address is provided to emergency services when calls are made from this number
              </p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-4 mt-6">
        <a href="/phone-numbers">
          <Button variant="secondary" type="button">Cancel</Button>
        </a>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          <Save class="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </form>
  {:else if !data.error}
    <Card>
      <div class="text-center py-12 text-text-secondary">
        <Phone class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Phone number not found</p>
      </div>
    </Card>
  {/if}
</div>

