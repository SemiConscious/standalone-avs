<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button, Toggle, Tabs, type Tab } from '$lib/components/ui';
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
    Mail,
    Key,
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
      availabilityProfileId?: string;
      linkedUserId?: string;
    };
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Tab configuration
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'licenses', label: 'Licenses', icon: Key },
    { id: 'groups', label: 'Groups', icon: Users, badge: data.user?.groups.length || 0 },
  ];
  
  let activeTab = $state('overview');
  
  // Form state
  let firstName = $state(data.user?.firstName || '');
  let lastName = $state(data.user?.lastName || '');
  let extension = $state(data.user?.extension || '');
  let mobilePhone = $state(data.user?.mobilePhone || '');
  let enabled = $state(data.user?.enabled || false);
  let permissionLevel = $state(data.user?.permissionLevel || 'Basic');
  let availabilityProfileId = $state(data.availabilityProfileId || '');
  let linkedUserId = $state(data.linkedUserId || '');
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

  // License data for compact display
  const licenseItems = $derived([
    { key: 'cti', label: 'CTI', value: license_cti, setter: (v: boolean) => license_cti = v, data: data.organizationLicenses?.cti },
    { key: 'pbx', label: 'PBX', value: license_pbx, setter: (v: boolean) => license_pbx = v, data: data.organizationLicenses?.pbx },
    { key: 'manager', label: 'Manager', value: license_manager, setter: (v: boolean) => license_manager = v, data: data.organizationLicenses?.manager },
    { key: 'record', label: 'Record', value: license_record, setter: (v: boolean) => license_record = v, data: data.organizationLicenses?.record },
    { key: 'sms', label: 'SMS', value: license_sms, setter: (v: boolean) => license_sms = v, data: data.organizationLicenses?.sms },
    { key: 'whatsApp', label: 'WhatsApp', value: license_whatsApp, setter: (v: boolean) => license_whatsApp = v, data: data.organizationLicenses?.whatsApp },
    { key: 'insights', label: 'Insights', value: license_insights, setter: (v: boolean) => license_insights = v, data: data.organizationLicenses?.insights },
    { key: 'freedom', label: 'Freedom', value: license_freedom, setter: (v: boolean) => license_freedom = v, data: data.organizationLicenses?.freedom },
    { key: 'pci', label: 'PCI', value: license_pci, setter: (v: boolean) => license_pci = v, data: data.organizationLicenses?.pci },
    { key: 'scv', label: 'SCV', value: license_scv, setter: (v: boolean) => license_scv = v, data: data.organizationLicenses?.scv },
  ]);
</script>

<svelte:head>
  <title>{data.user?.name || 'User'} | Natterbox AVS</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-4">
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
      <p>User updated successfully</p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4 pb-2">
    <a
      href="/users"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to users"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    
    <div class="flex items-center gap-4 flex-1">
      <!-- Avatar -->
      <div class="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-text-primary text-xl font-bold">
        {data.user?.firstName?.[0] || ''}{data.user?.lastName?.[0] || ''}
      </div>
      
      <div class="flex-1">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold text-text-primary">{data.user?.name || 'Unknown User'}</h1>
          {#if data.user}
            {@const status = getStatusBadge(data.user.status)}
            <Badge variant={status.variant}>{status.label}</Badge>
          {/if}
        </div>
        <div class="flex items-center gap-4 mt-1 text-sm text-text-secondary">
          <span class="flex items-center gap-1.5">
            <Mail class="w-3.5 h-3.5" />
            {data.user?.email || ''}
          </span>
          {#if data.user?.extension}
            <span class="flex items-center gap-1.5">
              <Phone class="w-3.5 h-3.5" />
              Ext. {data.user.extension}
            </span>
          {/if}
          <span class="flex items-center gap-1.5">
            <Shield class="w-3.5 h-3.5" />
            {data.user?.permissionLevel || 'Basic'}
          </span>
        </div>
      </div>
    </div>
    
    {#if data.user}
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
      <!-- Tabs Navigation -->
      <Tabs {tabs} bind:activeTab variant="boxed" size="sm">
        <!-- Tab Content Panels -->
        {#if activeTab === 'overview'}
          <Card>
            {#snippet header()}
              <h3 class="font-semibold text-text-primary">Quick Information</h3>
            {/snippet}
            
            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div class="text-center p-3 bg-bg-secondary rounded-lg">
                <p class="text-2xl font-bold text-text-primary">{data.user.groups.length}</p>
                <p class="text-xs text-text-secondary">Groups</p>
              </div>
              <div class="text-center p-3 bg-bg-secondary rounded-lg">
                <p class="text-2xl font-bold text-success">{Object.values(data.user.licenses).filter(Boolean).length}</p>
                <p class="text-xs text-text-secondary">Licenses</p>
              </div>
              <div class="text-center p-3 bg-bg-secondary rounded-lg">
                <p class="text-lg font-bold text-text-primary">{data.user.extension || '-'}</p>
                <p class="text-xs text-text-secondary">Extension</p>
              </div>
              <div class="text-center p-3 bg-bg-secondary rounded-lg">
                <p class="text-lg font-bold text-text-primary">{data.user.permissionLevel}</p>
                <p class="text-xs text-text-secondary">Permission</p>
              </div>
            </div>

            <!-- Account Details -->
            <h4 class="text-sm font-medium text-text-secondary mt-4 mb-2">Account Details</h4>
            <div class="pt-3 border-t border-border text-sm space-y-3">
              <div class="flex flex-col gap-0.5">
                <span class="text-text-secondary">Username</span>
                <span class="font-mono text-text-primary">{data.user.username || '—'}</span>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="flex flex-col gap-0.5">
                  <span class="text-text-secondary">Sapien ID</span>
                  <span class="font-mono text-text-primary">{data.user.sapienId || '—'}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-text-secondary">Availability</span>
                  <span class="text-text-primary">{data.user.availabilityProfile || '—'}</span>
                </div>
                <div class="flex flex-col gap-0.5">
                  <span class="text-text-secondary">SF User</span>
                  <span class="text-text-primary truncate">{data.user.linkedSalesforceUser?.name || '—'}</span>
                </div>
              </div>
            </div>
          </Card>
        {:else if activeTab === 'settings'}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Personal Information -->
            <Card>
              {#snippet header()}
                <div class="flex items-center gap-2">
                  <User class="w-4 h-4 text-text-primary" />
                  <h3 class="font-semibold text-text-primary">Personal Information</h3>
                </div>
              {/snippet}

              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label for="firstName" class="block text-xs font-medium mb-1 text-text-secondary">First Name</label>
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
                    <label for="lastName" class="block text-xs font-medium mb-1 text-text-secondary">Last Name</label>
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
                  <label for="permissionLevel" class="block text-xs font-medium mb-1 text-text-secondary">Permission Level</label>
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
                  <label for="availabilityProfileId" class="block text-xs font-medium mb-1 text-text-secondary">Availability Profile</label>
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
                </div>

                <Toggle
                  bind:checked={enabled}
                  name="enabled"
                  label="User Enabled"
                  description="Allow this user to access the system"
                  size="sm"
                />
                <input type="hidden" name="enabled" value={enabled ? 'true' : 'false'} />
              </div>
            </Card>

            <!-- Phone Settings -->
            <Card>
              {#snippet header()}
                <div class="flex items-center gap-2">
                  <Phone class="w-4 h-4 text-text-primary" />
                  <h3 class="font-semibold text-text-primary">Phone Settings</h3>
                </div>
              {/snippet}

              <div class="space-y-4">
                <div>
                  <label for="extension" class="block text-xs font-medium mb-1 text-text-secondary">Extension</label>
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
                  <label for="mobilePhone" class="block text-xs font-medium mb-1 text-text-secondary">Mobile Phone</label>
                  <input
                    id="mobilePhone"
                    name="mobilePhone"
                    type="tel"
                    bind:value={mobilePhone}
                    class="input w-full"
                    placeholder="+44 7xxx xxxxxx"
                  />
                </div>

                <Toggle
                  bind:checked={trackOutboundCTIDevice}
                  name="trackOutboundCTIDevice"
                  label="Track Outbound CTI Device"
                  description="Monitor outbound calls from CTI devices"
                  size="sm"
                />
                <input type="hidden" name="trackOutboundCTIDevice" value={trackOutboundCTIDevice ? 'true' : 'false'} />
              </div>
            </Card>

            <!-- Salesforce Link -->
            <Card class="lg:col-span-2">
              {#snippet header()}
                <div class="flex items-center gap-2">
                  <Link class="w-4 h-4 text-text-primary" />
                  <h3 class="font-semibold text-text-primary">Salesforce User Link</h3>
                </div>
              {/snippet}

              <div class="max-w-md">
                <label for="linkedUserId" class="block text-xs font-medium mb-1 text-text-secondary">Linked Salesforce User</label>
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
                    Currently linked to: {data.user.linkedSalesforceUser.name}
                  </p>
                {/if}
              </div>
            </Card>
          </div>
        {:else if activeTab === 'licenses'}
          <Card>
            {#snippet header()}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Key class="w-4 h-4 text-text-primary" />
                  <h3 class="font-semibold text-text-primary">License Assignments</h3>
                </div>
                {#if data.organizationLicenses}
                  <Badge variant="accent">{Object.values(data.user.licenses).filter(Boolean).length} Active</Badge>
                {/if}
              </div>
            {/snippet}

            {#if data.organizationLicenses}
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {#each licenseItems as item}
                  {@const lic = item.data}
                  <div class="p-3 bg-bg-secondary rounded-lg border border-border hover:border-accent/30 transition-colors">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium">{item.label}</span>
                      <Toggle
                        checked={item.value}
                        disabled={!lic?.enabled}
                        size="sm"
                        onchange={item.setter}
                      />
                    </div>
                    <input type="hidden" name="license_{item.key}" value={item.value ? 'true' : 'false'} />
                    
                    {#if lic?.enabled}
                      <div class="space-y-1">
                        <div class="flex justify-between text-xs">
                          <span class="text-text-secondary">{lic.used}/{lic.limit}</span>
                          <span class={lic.percentUsed >= 90 ? 'text-warning' : 'text-success'}>{lic.available} free</span>
                        </div>
                        <div class="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                          <div 
                            class="h-full transition-all {lic.percentUsed >= 90 ? 'bg-warning' : 'bg-accent'}"
                            style="width: {lic.percentUsed}%"
                          ></div>
                        </div>
                      </div>
                    {:else}
                      <p class="text-xs text-text-secondary">Not Licensed</p>
                    {/if}
                  </div>
                {/each}
              </div>

              <div class="mt-4 p-3 bg-info/10 border border-info/20 rounded-base flex items-start gap-2">
                <Info class="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                <p class="text-xs text-info">
                  Licenses cannot be removed if the user is a member of a group that requires them.
                </p>
              </div>
            {:else}
              <!-- Fallback simple toggle grid -->
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                {#each licenseItems as item}
                  <Toggle
                    checked={item.value}
                    label={item.label}
                    size="sm"
                    onchange={item.setter}
                  />
                  <input type="hidden" name="license_{item.key}" value={item.value ? 'true' : 'false'} />
                {/each}
              </div>
            {/if}
          </Card>
        {:else if activeTab === 'groups'}
          <Card>
            {#snippet header()}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Users class="w-4 h-4 text-text-primary" />
                  <h3 class="font-semibold text-text-primary">Group Memberships</h3>
                </div>
                <Button variant="ghost" size="sm" href="/groups">
                  Manage Groups
                </Button>
              </div>
            {/snippet}

            {#if data.user.groups.length > 0}
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {#each data.user.groups as group}
                  <a 
                    href="/groups" 
                    class="p-3 bg-bg-secondary rounded-lg border border-border hover:border-accent/30 transition-colors flex items-center gap-2"
                  >
                    <Users class="w-4 h-4 text-text-primary" />
                    <span class="text-sm font-medium truncate">{group}</span>
                  </a>
                {/each}
              </div>
            {:else}
              <div class="text-center py-8 text-text-secondary">
                <Users class="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p class="text-sm">Not a member of any groups</p>
                <Button variant="primary" size="sm" href="/groups" class="mt-3">
                  Browse Groups
                </Button>
              </div>
            {/if}
          </Card>
        {/if}
      </Tabs>

      <!-- Actions (always visible) -->
      <div class="flex items-center justify-end gap-3 mt-4">
        <Button variant="secondary" href="/users" size="sm">Cancel</Button>
        <Button variant="primary" type="submit" loading={isSubmitting} size="sm">
          <Save class="w-4 h-4 mr-1.5" />
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
