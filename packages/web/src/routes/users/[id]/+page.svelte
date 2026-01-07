<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button, Input } from '$lib/components/ui';
  import { 
    ArrowLeft, 
    Save, 
    User, 
    Phone, 
    Settings, 
    Shield, 
    AlertCircle,
    FlaskConical,
    CheckCircle,
    XCircle,
    Users,
    Link,
    Info,
  } from 'lucide-svelte';
  import type { ActionData } from './$types';
  import type { OrganizationLicenses } from '$lib/server/license';
  
  interface Props {
    data: {
      user: import('../+page.server').User | null;
      availabilityProfiles: { id: string; name: string }[];
      salesforceUsers: { Id: string; Name: string; Email: string }[];
      organizationLicenses: OrganizationLicenses | null;
      isDemo: boolean;
      error?: string;
    };
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Form state
  let firstName = $state(data.user?.firstName || '');
  let lastName = $state(data.user?.lastName || '');
  let extension = $state(data.user?.extension || '');
  let mobilePhone = $state(data.user?.mobilePhone || '');
  let enabled = $state(data.user?.enabled || false);
  let permissionLevel = $state(data.user?.permissionLevel || 'Basic');
  let availabilityProfileId = $state('');
  let linkedUserId = $state('');
  let trackOutboundCTIDevice = $state(data.user?.trackOutboundCTIDevice || false);
  
  // Licenses
  let license_cti = $state(data.user?.licenses.cti || false);
  let license_pbx = $state(data.user?.licenses.pbx || false);
  let license_manager = $state(data.user?.licenses.manager || false);
  let license_record = $state(data.user?.licenses.record || false);
  let license_pci = $state(data.user?.licenses.pci || false);
  let license_scv = $state(data.user?.licenses.scv || false);
  let license_sms = $state(data.user?.licenses.sms || false);
  let license_whatsApp = $state(data.user?.licenses.whatsApp || false);
  let license_insights = $state(data.user?.licenses.insights || false);
  let license_freedom = $state(data.user?.licenses.freedom || false);
  
  let isSubmitting = $state(false);
  
  const permissionLevelOptions = [
    'Basic',
    'Standard',
    'Team Leader',
    'Admin',
    'Super Admin',
  ];
  
  function getStatusBadge(status: 'active' | 'inactive' | 'suspended') {
    switch (status) {
      case 'active': return { variant: 'success' as const, label: 'Active' };
      case 'inactive': return { variant: 'neutral' as const, label: 'Inactive' };
      case 'suspended': return { variant: 'error' as const, label: 'Suspended' };
    }
  }
</script>

<svelte:head>
  <title>{data.user?.name || 'User'} | Natterbox AVS</title>
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
      <p>User updated successfully</p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4">
    <a
      href="/users"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to users"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div class="flex-1">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold">{data.user?.name || 'Unknown User'}</h1>
        {#if data.user}
          {@const status = getStatusBadge(data.user.status)}
          <Badge variant={status.variant}>{status.label}</Badge>
        {/if}
      </div>
      <p class="text-text-secondary mt-1">{data.user?.email || ''}</p>
    </div>
    
    {#if data.user}
      <form method="POST" action="?/toggleEnabled" use:enhance>
        <Button type="submit" variant={enabled ? 'secondary' : 'primary'}>
          {#if enabled}
            <XCircle class="w-4 h-4 mr-2" />
            Disable User
          {:else}
            <CheckCircle class="w-4 h-4 mr-2" />
            Enable User
          {/if}
        </Button>
      </form>
    {/if}
  </div>

  {#if data.user}
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
        <!-- Personal Information -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <User class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Personal Information</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="firstName" class="block text-sm font-medium mb-1">First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  bind:value={firstName}
                  class="input w-full"
                  required
                />
              </div>
              <div>
                <label for="lastName" class="block text-sm font-medium mb-1">Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  bind:value={lastName}
                  class="input w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={data.user.username}
                class="input w-full"
                disabled
              />
              <p class="text-xs text-text-secondary mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Sapien ID</label>
              <input
                type="text"
                value={data.user.sapienId}
                class="input w-full font-mono"
                disabled
              />
            </div>
          </div>
        </Card>

        <!-- Phone Settings -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Phone class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Phone Settings</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="extension" class="block text-sm font-medium mb-1">Extension</label>
              <input
                id="extension"
                name="extension"
                type="text"
                bind:value={extension}
                class="input w-full"
                placeholder="1001"
              />
            </div>

            <div>
              <label for="mobilePhone" class="block text-sm font-medium mb-1">Mobile Phone</label>
              <input
                id="mobilePhone"
                name="mobilePhone"
                type="tel"
                bind:value={mobilePhone}
                class="input w-full"
                placeholder="+44 7xxx xxxxxx"
              />
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="trackOutboundCTIDevice"
                bind:checked={trackOutboundCTIDevice}
                value="true"
                class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span class="text-sm">Track Outbound CTI Device</span>
            </label>
            <input type="hidden" name="trackOutboundCTIDevice" value={trackOutboundCTIDevice ? 'true' : 'false'} />
          </div>
        </Card>

        <!-- Permissions -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Shield class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Permissions</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="permissionLevel" class="block text-sm font-medium mb-1">Permission Level</label>
              <select
                id="permissionLevel"
                name="permissionLevel"
                bind:value={permissionLevel}
                class="input w-full"
              >
                {#each permissionLevelOptions as level}
                  <option value={level}>{level}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="availabilityProfileId" class="block text-sm font-medium mb-1">Availability Profile</label>
              <select
                id="availabilityProfileId"
                name="availabilityProfileId"
                bind:value={availabilityProfileId}
                class="input w-full"
              >
                <option value="">-- None --</option>
                {#each data.availabilityProfiles as profile}
                  <option value={profile.id}>{profile.name}</option>
                {/each}
              </select>
              {#if data.user.availabilityProfile}
                <p class="text-xs text-text-secondary mt-1">Current: {data.user.availabilityProfile}</p>
              {/if}
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="enabled"
                bind:checked={enabled}
                value="true"
                class="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span class="text-sm">User Enabled</span>
            </label>
            <input type="hidden" name="enabled" value={enabled ? 'true' : 'false'} />
          </div>
        </Card>

        <!-- Licenses -->
        <Card class="lg:col-span-2">
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Settings class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Licenses</h2>
            </div>
          {/snippet}

          {#if data.organizationLicenses}
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <!-- CTI -->
              {@const ctiLic = data.organizationLicenses.cti}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={license_cti}
                    disabled={!ctiLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
              />
                  <span class="text-sm font-medium">CTI</span>
            </label>
            <input type="hidden" name="license_cti" value={license_cti ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if ctiLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{ctiLic.used}/{ctiLic.limit} used</span>
                      <Badge variant={ctiLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{ctiLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {ctiLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- PBX -->
              {@const pbxLic = data.organizationLicenses.pbx}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={license_pbx}
                    disabled={!pbxLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
              />
                  <span class="text-sm font-medium">PBX</span>
            </label>
            <input type="hidden" name="license_pbx" value={license_pbx ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if pbxLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{pbxLic.used}/{pbxLic.limit} used</span>
                      <Badge variant={pbxLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{pbxLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {pbxLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- Manager -->
              {@const managerLic = data.organizationLicenses.manager}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={license_manager}
                    disabled={!managerLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
              />
                  <span class="text-sm font-medium">Manager</span>
            </label>
            <input type="hidden" name="license_manager" value={license_manager ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if managerLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{managerLic.used}/{managerLic.limit} used</span>
                      <Badge variant={managerLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{managerLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {managerLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- Record -->
              {@const recordLic = data.organizationLicenses.record}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={license_record}
                    disabled={!recordLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
              />
                  <span class="text-sm font-medium">Record</span>
            </label>
            <input type="hidden" name="license_record" value={license_record ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if recordLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{recordLic.used}/{recordLic.limit} used</span>
                      <Badge variant={recordLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{recordLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {recordLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- SMS -->
              {@const smsLic = data.organizationLicenses.sms}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={license_sms}
                    disabled={!smsLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                  />
                  <span class="text-sm font-medium">SMS</span>
                </label>
                <input type="hidden" name="license_sms" value={license_sms ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if smsLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{smsLic.used}/{smsLic.limit} used</span>
                      <Badge variant={smsLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{smsLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {smsLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- WhatsApp -->
              {@const whatsAppLic = data.organizationLicenses.whatsApp}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={license_whatsApp}
                    disabled={!whatsAppLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                  />
                  <span class="text-sm font-medium">WhatsApp</span>
                </label>
                <input type="hidden" name="license_whatsApp" value={license_whatsApp ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if whatsAppLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{whatsAppLic.used}/{whatsAppLic.limit} used</span>
                      <Badge variant={whatsAppLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{whatsAppLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {whatsAppLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- Insights -->
              {@const insightsLic = data.organizationLicenses.insights}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={license_insights}
                    disabled={!insightsLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                  />
                  <span class="text-sm font-medium">Insights</span>
                </label>
                <input type="hidden" name="license_insights" value={license_insights ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if insightsLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{insightsLic.used}/{insightsLic.limit} used</span>
                      <Badge variant={insightsLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{insightsLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {insightsLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- Freedom -->
              {@const freedomLic = data.organizationLicenses.freedom}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    bind:checked={license_freedom}
                    disabled={!freedomLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                  />
                  <span class="text-sm font-medium">Freedom</span>
                </label>
                <input type="hidden" name="license_freedom" value={license_freedom ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if freedomLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{freedomLic.used}/{freedomLic.limit} used</span>
                      <Badge variant={freedomLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{freedomLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {freedomLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- PCI -->
              {@const pciLic = data.organizationLicenses.pci}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={license_pci}
                    disabled={!pciLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
              />
                  <span class="text-sm font-medium">PCI</span>
            </label>
            <input type="hidden" name="license_pci" value={license_pci ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if pciLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{pciLic.used}/{pciLic.limit} used</span>
                      <Badge variant={pciLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{pciLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {pciLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>

              <!-- SCV -->
              {@const scvLic = data.organizationLicenses.scv}
              <div class="p-3 bg-bg-secondary rounded-base border border-border">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={license_scv}
                    disabled={!scvLic.enabled}
                    class="w-4 h-4 rounded border-border text-accent focus:ring-accent disabled:opacity-50"
              />
                  <span class="text-sm font-medium">SCV</span>
            </label>
            <input type="hidden" name="license_scv" value={license_scv ? 'true' : 'false'} />
                <div class="mt-2 text-xs text-text-secondary">
                  {#if scvLic.enabled}
                    <div class="flex items-center justify-between">
                      <span>{scvLic.used}/{scvLic.limit} used</span>
                      <Badge variant={scvLic.percentUsed >= 90 ? 'warning' : 'success'} size="sm">{scvLic.available} free</Badge>
                    </div>
                    <div class="mt-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div class="h-full bg-accent transition-all" style="width: {scvLic.percentUsed}%"></div>
                    </div>
                  {:else}
                    <Badge variant="neutral" size="sm">Not Licensed</Badge>
                  {/if}
                </div>
              </div>
            </div>

            <div class="mt-4 p-3 bg-info/10 border border-info/20 rounded-base flex items-start gap-2">
              <Info class="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
              <p class="text-xs text-info">
                Licenses cannot be removed if the user is a member of a group that requires them.
                License availability shows organization-wide usage.
              </p>
            </div>
          {:else}
            <!-- Fallback simple checkbox grid if license info not available -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_cti} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                <span class="text-sm">CTI</span>
              </label>
              <input type="hidden" name="license_cti" value={license_cti ? 'true' : 'false'} />

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_pbx} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                <span class="text-sm">PBX</span>
              </label>
              <input type="hidden" name="license_pbx" value={license_pbx ? 'true' : 'false'} />

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_manager} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                <span class="text-sm">Manager</span>
              </label>
              <input type="hidden" name="license_manager" value={license_manager ? 'true' : 'false'} />

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_record} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                <span class="text-sm">Record</span>
              </label>
              <input type="hidden" name="license_record" value={license_record ? 'true' : 'false'} />

            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_sms} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
              <span class="text-sm">SMS</span>
            </label>
            <input type="hidden" name="license_sms" value={license_sms ? 'true' : 'false'} />

            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_whatsApp} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
              <span class="text-sm">WhatsApp</span>
            </label>
            <input type="hidden" name="license_whatsApp" value={license_whatsApp ? 'true' : 'false'} />

            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_insights} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
              <span class="text-sm">Insights</span>
            </label>
            <input type="hidden" name="license_insights" value={license_insights ? 'true' : 'false'} />

            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_freedom} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
              <span class="text-sm">Freedom</span>
            </label>
            <input type="hidden" name="license_freedom" value={license_freedom ? 'true' : 'false'} />

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_pci} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                <span class="text-sm">PCI</span>
              </label>
              <input type="hidden" name="license_pci" value={license_pci ? 'true' : 'false'} />

              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" bind:checked={license_scv} class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                <span class="text-sm">SCV</span>
              </label>
              <input type="hidden" name="license_scv" value={license_scv ? 'true' : 'false'} />
          </div>
          {/if}
        </Card>

        <!-- Salesforce Link -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Link class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Salesforce User Link</h2>
            </div>
          {/snippet}

          <div class="space-y-4">
            <div>
              <label for="linkedUserId" class="block text-sm font-medium mb-1">Linked Salesforce User</label>
              <select
                id="linkedUserId"
                name="linkedUserId"
                bind:value={linkedUserId}
                class="input w-full"
              >
                <option value="">-- None --</option>
                {#each data.salesforceUsers as sfUser}
                  <option value={sfUser.Id}>{sfUser.Name} ({sfUser.Email})</option>
                {/each}
              </select>
              {#if data.user.linkedSalesforceUser}
                <p class="text-xs text-text-secondary mt-1">
                  Currently linked to: {data.user.linkedSalesforceUser.name} ({data.user.linkedSalesforceUser.email})
                </p>
              {/if}
            </div>
          </div>
        </Card>

        <!-- Groups -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Users class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Group Memberships</h2>
            </div>
          {/snippet}

          <div class="space-y-2">
            {#if data.user.groups.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each data.user.groups as group}
                  <Badge variant="accent">{group}</Badge>
                {/each}
              </div>
              <p class="text-xs text-text-secondary mt-2">
                Group memberships are managed from the Groups page
              </p>
            {:else}
              <p class="text-sm text-text-secondary">Not a member of any groups</p>
            {/if}
            <Button variant="ghost" size="sm" href="/groups">
              Manage Groups
            </Button>
          </div>
        </Card>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-4 mt-6">
        <a href="/users">
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
        <User class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>User not found</p>
      </div>
    </Card>
  {/if}
</div>

