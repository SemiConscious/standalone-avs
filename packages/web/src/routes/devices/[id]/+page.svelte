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
    XCircle,
    Wifi,
    WifiOff,
    MapPin,
    Clock,
    Trash2,
    Monitor,
  } from 'lucide-svelte';
  import type { ActionData } from './$types';
  import type { Device } from '../+page.server';
  
  interface Props {
    data: {
      device: Device | null;
      users: { Id: string; Name: string }[];
      isDemo: boolean;
      error?: string;
    };
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Form state
  let extension = $state(data.device?.extension || '');
  let location = $state(data.device?.location || '');
  let description = $state(data.device?.description || '');
  let model = $state(data.device?.model || '');
  let macAddress = $state(data.device?.macAddress || '');
  let enabled = $state(data.device?.enabled || false);
  
  let isSubmitting = $state(false);
  let showDeleteConfirm = $state(false);

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  }

  function getTypeBadgeVariant(type: string) {
    switch (type) {
      case 'SIP': return 'accent';
      case 'Softphone': return 'success';
      case 'Web Phone': return 'info';
      default: return 'neutral';
    }
  }
</script>

<svelte:head>
  <title>{data.device?.description || 'Device'} | Natterbox AVS</title>
</svelte:head>

<div class="max-w-4xl mx-auto space-y-4">
  <!-- Demo/Error/Success Banners -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-3 flex items-center gap-3 text-sm">
      <FlaskConical class="w-4 h-4 flex-shrink-0" />
      <p>Demo Mode - changes will not be saved</p>
    </div>
  {/if}

  {#if data.error || form?.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-3 flex items-center gap-3 text-sm">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <p>{data.error || form?.error}</p>
    </div>
  {/if}

  {#if form?.success}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-3 flex items-center gap-3 text-sm">
      <CheckCircle class="w-4 h-4 flex-shrink-0" />
      <p>Device updated successfully</p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4 pb-2">
    <a
      href="/devices"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to devices"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    
    <div class="flex items-center gap-4 flex-1">
      <!-- Icon -->
      <div class="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
        <Monitor class="w-7 h-7 text-accent" />
      </div>
      
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold text-text-primary">{data.device?.description || 'Unknown Device'}</h1>
          {#if data.device}
            <Badge variant={getTypeBadgeVariant(data.device.type)}>{data.device.type}</Badge>
            {#if data.device.enabled}
              <Badge variant="success">Enabled</Badge>
            {:else}
              <Badge variant="neutral">Disabled</Badge>
            {/if}
          {/if}
        </div>
        <div class="flex items-center gap-4 mt-1 text-sm text-text-secondary">
          {#if data.device?.extension}
            <span class="flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5" />
              Ext. {data.device.extension}
            </span>
          {/if}
          {#if data.device?.location}
            <span class="flex items-center gap-1.5">
              <MapPin class="w-3.5 h-3.5" />
              {data.device.location}
            </span>
          {/if}
          <span class="flex items-center gap-1.5">
            {#if data.device?.registered}
              <Wifi class="w-3.5 h-3.5 text-success" />
              <span class="text-success">Registered</span>
            {:else}
              <WifiOff class="w-3.5 h-3.5" />
              Not Registered
            {/if}
          </span>
        </div>
      </div>
    </div>
    
    {#if data.device}
      <form method="POST" action="?/toggleEnabled" use:enhance>
        <Button type="submit" variant={enabled ? 'secondary' : 'primary'} size="sm">
          {#if enabled}
            <XCircle class="w-4 h-4 mr-1.5" />
            Disable
          {:else}
            <CheckCircle class="w-4 h-4 mr-1.5" />
            Enable
          {/if}
        </Button>
      </form>
    {/if}
  </div>

  {#if data.device}
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
        <!-- Device Information -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Monitor class="w-4 h-4 text-accent" />
              <h3 class="font-semibold text-text-primary">Device Information</h3>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="description" class="block text-xs font-medium mb-1 text-text-secondary">Description</label>
              <input
                id="description"
                name="description"
                type="text"
                bind:value={description}
                class="input w-full"
                placeholder="e.g., Front Desk Phone"
              />
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

            <Toggle
              bind:checked={enabled}
              name="enabled"
              label="Device Enabled"
              description="Allow this device to make and receive calls"
              size="sm"
            />
            <input type="hidden" name="enabled" value={enabled ? 'true' : 'false'} />
          </div>
        </Card>

        <!-- Technical Details -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Settings class="w-4 h-4 text-accent" />
              <h3 class="font-semibold text-text-primary">Technical Details</h3>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="macAddress" class="block text-xs font-medium mb-1 text-text-secondary">MAC Address</label>
              <input
                id="macAddress"
                name="macAddress"
                type="text"
                bind:value={macAddress}
                class="input w-full font-mono"
                placeholder="00:11:22:33:44:55"
              />
            </div>

            <div class="space-y-3 pt-2 border-t border-border">
              <div class="flex justify-between items-center text-sm">
                <span class="text-text-secondary">Type</span>
                <Badge variant={getTypeBadgeVariant(data.device.type)}>{data.device.type}</Badge>
              </div>
              
              <div class="flex justify-between items-center text-sm">
                <span class="text-text-secondary">Sapien ID</span>
                <span class="font-mono text-text-primary">{data.device.apiId || '—'}</span>
              </div>

              <div class="flex justify-between items-center text-sm">
                <span class="text-text-secondary">Registration Status</span>
                <span class="flex items-center gap-1.5">
                  {#if data.device.registered}
                    <Wifi class="w-4 h-4 text-success" />
                    <span class="text-success">Registered</span>
                  {:else}
                    <WifiOff class="w-4 h-4 text-text-secondary" />
                    <span class="text-text-secondary">Not Registered</span>
                  {/if}
                </span>
              </div>

              {#if data.device.registrationExpiry}
                <div class="flex justify-between items-center text-sm">
                  <span class="text-text-secondary">Registration Expires</span>
                  <span class="text-text-primary">{formatDate(data.device.registrationExpiry)}</span>
                </div>
              {/if}

              <div class="flex justify-between items-center text-sm">
                <span class="text-text-secondary">Last Modified</span>
                <span class="flex items-center gap-1.5 text-text-primary">
                  <Clock class="w-3.5 h-3.5" />
                  {formatDate(data.device.lastModified)}
                </span>
              </div>

              {#if data.device.assignedUserName}
                <div class="flex justify-between items-center text-sm">
                  <span class="text-text-secondary">Assigned User</span>
                  <a href="/users/{data.device.assignedUserId}" class="text-primary-400 hover:text-primary-300 hover:underline">
                    {data.device.assignedUserName}
                  </a>
                </div>
              {/if}
            </div>
          </div>
        </Card>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between mt-4">
        <div>
          {#if data.device.type !== 'Web Phone'}
            {#if showDeleteConfirm}
              <div class="flex items-center gap-2">
                <span class="text-sm text-text-secondary">Delete this device?</span>
                <form method="POST" action="?/delete" use:enhance class="inline">
                  <Button type="submit" variant="danger" size="sm">
                    Confirm Delete
                  </Button>
                </form>
                <Button variant="ghost" size="sm" onclick={() => showDeleteConfirm = false}>
                  Cancel
                </Button>
              </div>
            {:else}
              <Button variant="ghost" size="sm" onclick={() => showDeleteConfirm = true}>
                <Trash2 class="w-4 h-4 mr-1.5 text-error" />
                Delete Device
              </Button>
            {/if}
          {/if}
        </div>
        
        <div class="flex items-center gap-3">
          <Button variant="secondary" href="/devices" size="sm">Cancel</Button>
          <Button variant="primary" type="submit" loading={isSubmitting} size="sm">
            <Save class="w-4 h-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  {:else if !data.error}
    <Card>
      <div class="text-center py-12 text-text-secondary">
        <Monitor class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Device not found</p>
      </div>
    </Card>
  {/if}
</div>
