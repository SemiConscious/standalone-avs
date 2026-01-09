<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button, Toggle } from '$lib/components/ui';
  import { 
    ArrowLeft, 
    Save, 
    Phone, 
    Settings, 
    AlertCircle,
    FlaskConical,
    CheckCircle,
    MapPin,
    Globe,
    User,
    Workflow,
    Clock,
    Check,
    X,
  } from 'lucide-svelte';
  import type { ActionData } from './$types';
  import type { PhoneNumber } from './+page.server';
  
  interface Props {
    data: {
      phoneNumber: PhoneNumber | null;
      callFlows: { id: string; name: string }[];
      users: { id: string; name: string }[];
      isDemo: boolean;
      error?: string;
    };
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Form state
  let name = $state(data.phoneNumber?.name || '');
  let callFlowId = $state(data.phoneNumber?.callFlowId || '');
  let userId = $state(data.phoneNumber?.userId || '');
  let localPresenceEnabled = $state(data.phoneNumber?.localPresenceEnabled || false);
  
  let isSubmitting = $state(false);

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  }
</script>

<svelte:head>
  <title>{data.phoneNumber?.formattedNumber || 'Phone Number'} | Natterbox AVS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-4">
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

  <!-- Success Banner -->
  {#if form?.success}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-3 flex items-center gap-3 text-sm">
      <CheckCircle class="w-4 h-4 flex-shrink-0" />
      <p>Phone number updated successfully</p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4 pb-2">
    <a
      href="/phone-numbers"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to phone numbers"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    
    <div class="flex items-center gap-4 flex-1">
      <!-- Icon -->
      <div class="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
        <Phone class="w-7 h-7 text-text-primary" />
      </div>
      
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold font-mono text-text-primary">{data.phoneNumber?.formattedNumber || 'Unknown'}</h1>
          {#if data.phoneNumber}
            {#if data.phoneNumber.isDDI}
              <Badge variant="accent">DDI</Badge>
            {/if}
            {#if data.phoneNumber.isGeographic}
              <Badge variant="success">Geographic</Badge>
            {:else}
              <Badge variant="neutral">Non-Geographic</Badge>
            {/if}
          {/if}
        </div>
        <div class="flex items-center gap-4 mt-1 text-sm text-text-secondary">
          <span>{data.phoneNumber?.name || ''}</span>
          {#if data.phoneNumber?.country}
            <span class="flex items-center gap-1">
              <Globe class="w-3.5 h-3.5" />
              {data.phoneNumber.country}
            </span>
          {/if}
          {#if data.phoneNumber?.area}
            <span class="flex items-center gap-1">
              <MapPin class="w-3.5 h-3.5" />
              {data.phoneNumber.area}
            </span>
          {/if}
        </div>
      </div>
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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Basic Info -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Phone class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-text-primary">Phone Number Details</h3>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="name" class="block text-xs font-medium mb-1 text-text-secondary">Display Name</label>
              <input
                id="name"
                name="name"
                type="text"
                bind:value={name}
                class="input w-full"
                required
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium mb-1 text-text-secondary">Phone Number</label>
                <input
                  type="text"
                  value={data.phoneNumber.formattedNumber}
                  class="input w-full font-mono"
                  disabled
                />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1 text-text-secondary">Raw Number</label>
                <input
                  type="text"
                  value={data.phoneNumber.number}
                  class="input w-full font-mono text-text-secondary"
                  disabled
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3 pt-3 border-t border-border">
              <div>
                <label class="block text-xs font-medium mb-1 text-text-secondary">Country Code</label>
                <p class="text-sm text-text-primary">+{data.phoneNumber.countryCode || '—'}</p>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1 text-text-secondary">Area Code</label>
                <p class="text-sm text-text-primary">{data.phoneNumber.areaCode || '—'}</p>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1 text-text-secondary">Local Number</label>
                <p class="text-sm font-mono text-text-primary">{data.phoneNumber.localNumber || '—'}</p>
              </div>
            </div>
          </div>
        </Card>

        <!-- Routing -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Workflow class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-text-primary">Routing</h3>
            </div>
          {/snippet}

          <div class="space-y-4">
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
              <p class="text-xs text-text-secondary mt-1">Inbound calls will be routed using this policy</p>
            </div>

            <div>
              <label for="userId" class="block text-xs font-medium mb-1 text-text-secondary">
                <User class="w-3 h-3 inline mr-1" />
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
              <p class="text-xs text-text-secondary mt-1">Route directly to a specific user</p>
            </div>

            <Toggle
              bind:checked={localPresenceEnabled}
              name="localPresenceEnabled"
              label="Local Presence"
              description="Show this number as caller ID for outbound calls"
              size="sm"
            />
            <input type="hidden" name="localPresenceEnabled" value={localPresenceEnabled ? 'true' : 'false'} />
          </div>
        </Card>

        <!-- Capabilities -->
        <Card class="lg:col-span-2">
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Settings class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-text-primary">Capabilities & Info</h3>
            </div>
          {/snippet}

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <!-- Capabilities -->
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-text-secondary">Capabilities</h4>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-secondary">Voice</span>
                  {#if data.phoneNumber.voiceEnabled}
                    <Check class="w-4 h-4 text-success" />
                  {:else}
                    <X class="w-4 h-4 text-gray-500" />
                  {/if}
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-secondary">SMS</span>
                  {#if data.phoneNumber.smsEnabled}
                    <Check class="w-4 h-4 text-success" />
                  {:else}
                    <X class="w-4 h-4 text-gray-500" />
                  {/if}
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-secondary">MMS</span>
                  {#if data.phoneNumber.mmsEnabled}
                    <Check class="w-4 h-4 text-success" />
                  {:else}
                    <X class="w-4 h-4 text-gray-500" />
                  {/if}
                </div>
              </div>
            </div>

            <!-- Number Type -->
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-text-secondary">Number Type</h4>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-secondary">DDI</span>
                  {#if data.phoneNumber.isDDI}
                    <Check class="w-4 h-4 text-success" />
                  {:else}
                    <X class="w-4 h-4 text-gray-500" />
                  {/if}
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-secondary">Geographic</span>
                  {#if data.phoneNumber.isGeographic}
                    <Check class="w-4 h-4 text-success" />
                  {:else}
                    <X class="w-4 h-4 text-gray-500" />
                  {/if}
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-text-secondary">Local Presence</span>
                  {#if data.phoneNumber.localPresenceEnabled}
                    <Check class="w-4 h-4 text-success" />
                  {:else}
                    <X class="w-4 h-4 text-gray-500" />
                  {/if}
                </div>
              </div>
            </div>

            <!-- Current Assignment -->
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-text-secondary">Current Assignment</h4>
              <div class="space-y-2">
                <div class="text-sm">
                  <span class="text-text-secondary block">User:</span>
                  {#if data.phoneNumber.userName}
                    <a href="/users/{data.phoneNumber.userId}" class="text-text-primary hover:text-primary-300 hover:underline">
                      {data.phoneNumber.userName}
                    </a>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </div>
                <div class="text-sm">
                  <span class="text-text-secondary block">Call Flow:</span>
                  {#if data.phoneNumber.callFlowName}
                    <a href="/routing-policies/{data.phoneNumber.callFlowId}" class="text-text-primary hover:text-primary-300 hover:underline">
                      {data.phoneNumber.callFlowName}
                    </a>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Metadata -->
            <div class="space-y-3">
              <h4 class="text-sm font-medium text-text-secondary">Metadata</h4>
              <div class="space-y-2">
                <div class="text-sm">
                  <span class="text-text-secondary block">Last Modified:</span>
                  <span class="flex items-center gap-1 text-text-primary">
                    <Clock class="w-3.5 h-3.5" />
                    {formatDate(data.phoneNumber.lastModified)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 mt-4">
        <Button variant="secondary" href="/phone-numbers" size="sm">Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting} size="sm">
          <Save class="w-4 h-4 mr-1.5" />
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
