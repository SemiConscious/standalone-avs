<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button, Toggle } from '$lib/components/ui';
  import { 
    ArrowLeft, 
    Save, 
    Users, 
    Settings, 
    AlertCircle,
    FlaskConical,
    CheckCircle,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    Phone,
    User,
    Info,
    Shield,
  } from 'lucide-svelte';
  import type { ActionData } from './$types';
  import type { Group, LicenseInfo } from './+page.server';
  
  interface Props {
    data: {
      group: Group | null;
      availableUsers: { id: string; name: string; username: string; extension: string }[];
      licenseInfo: LicenseInfo | null;
      isDemo: boolean;
      error?: string;
    };
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Form state
  let name = $state(data.group?.name || '');
  let description = $state(data.group?.description || '');
  let type = $state(data.group?.type || 'RING_ALL');
  let maxQueueTime = $state(data.group?.maxQueueTime || 300);
  let extension = $state(data.group?.extension || '');
  let pbxEnabled = $state(data.group?.pbx || false);
  let managerEnabled = $state(data.group?.manager || false);
  let recordEnabled = $state(data.group?.record || false);
  
  let isSubmitting = $state(false);
  let showAddMember = $state(false);
  let selectedUserId = $state('');
  let newMemberPriority = $state(data.group?.members.length || 0);
  let showPurpose = $state(false);
  
  // Validation
  let extensionError = $state('');
  
  function validateExtension() {
    extensionError = '';
    if (extension) {
      const extNum = parseInt(extension);
      if (isNaN(extNum)) {
        extensionError = 'Extension must be a number';
      } else if (extNum < 2000 || extNum > 7999) {
        extensionError = 'Extension must be between 2000 and 7999';
      }
    }
  }
  
  const groupTypes = [
    { value: 'RING_ALL', label: 'Ring All' },
    { value: 'ROUND_ROBIN', label: 'Round Robin' },
    { value: 'LEAST_CALLS', label: 'Least Calls' },
    { value: 'LONGEST_IDLE', label: 'Longest Idle' },
    { value: 'PRIORITY', label: 'Priority' },
    { value: 'RANDOM', label: 'Random' },
    { value: 'LINEAR', label: 'Linear' },
  ];
</script>

<svelte:head>
  <title>{data.group?.name || 'Group'} | Natterbox AVS</title>
</svelte:head>

<div class="max-w-5xl mx-auto space-y-4">
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
      <p>
        {#if form.action === 'addMember'}
          Member added successfully
        {:else if form.action === 'removeMember'}
          Member removed successfully
        {:else if form.action === 'updatePriority'}
          Priority updated successfully
        {:else}
          Group updated successfully
        {/if}
      </p>
    </div>
  {/if}

  <!-- Header -->
  <div class="flex items-center gap-4 pb-2">
    <a
      href="/groups"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to groups"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    
    <div class="flex-1">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-bold text-text-primary">{data.group?.name || 'Unknown Group'}</h1>
        <Badge variant="accent">{data.group?.members.length || 0} members</Badge>
      </div>
      <p class="text-text-secondary text-sm mt-0.5">{data.group?.description || 'No description'}</p>
    </div>
    
    {#if data.group}
      <div class="flex items-center gap-6 text-center">
        <div>
          <p class="text-2xl font-bold text-warning">{data.group.waitingCalls}</p>
          <p class="text-xs text-text-secondary">Waiting</p>
        </div>
        <div>
          <p class="text-2xl font-bold text-success">{data.group.answeredCalls}</p>
          <p class="text-xs text-text-secondary">Answered</p>
        </div>
      </div>
    {/if}
  </div>

  {#if data.group}
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <!-- Group Settings (narrower) -->
      <div class="lg:col-span-2 space-y-4">
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Settings class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-text-primary">Settings</h3>
            </div>
          {/snippet}

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
            class="space-y-3"
          >
            <div>
              <label for="name" class="block text-xs font-medium mb-1 text-text-secondary">Name</label>
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
              <label for="description" class="block text-xs font-medium mb-1 text-text-secondary">Description</label>
              <textarea
                id="description"
                name="description"
                bind:value={description}
                class="input w-full"
                rows="2"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="type" class="block text-xs font-medium mb-1 text-text-secondary">Ring Strategy</label>
                <select
                  id="type"
                  name="type"
                  bind:value={type}
                  class="input w-full"
                >
                  {#each groupTypes as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              </div>

              <div>
                <label for="extension" class="block text-xs font-medium mb-1 text-text-secondary">Extension</label>
                <input
                  id="extension"
                  name="extension"
                  type="text"
                  bind:value={extension}
                  oninput={validateExtension}
                  class="input w-full"
                  class:border-error={extensionError}
                />
                {#if extensionError}
                  <p class="text-xs text-error mt-0.5">{extensionError}</p>
                {/if}
              </div>
            </div>

            <div>
              <label for="maxQueueTime" class="block text-xs font-medium mb-1 text-text-secondary">Max Queue Time (seconds)</label>
              <input
                id="maxQueueTime"
                name="maxQueueTime"
                type="number"
                bind:value={maxQueueTime}
                class="input w-full"
                min="0"
                max="3600"
              />
            </div>

            <!-- Group Purpose Collapsible -->
            <div class="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                class="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                onclick={() => showPurpose = !showPurpose}
              >
                <div class="flex items-center gap-2">
                  <Shield class="w-4 h-4 text-text-primary" />
                  <span class="text-sm font-medium">Group Purpose</span>
                </div>
                <ChevronDown class="w-4 h-4 transition-transform {showPurpose ? 'rotate-180' : ''}" />
              </button>
              {#if showPurpose}
                <div class="p-3 border-t border-border space-y-3">
                  <Toggle
                    bind:checked={pbxEnabled}
                    name="pbx"
                    label="PBX (Call Queue)"
                    disabled={data.group?.pbx}
                    size="sm"
                  />
                  <Toggle
                    bind:checked={managerEnabled}
                    name="manager"
                    label="Manager (Supervisor)"
                    disabled={data.group?.manager}
                    size="sm"
                  />
                  <Toggle
                    bind:checked={recordEnabled}
                    name="record"
                    label="Record"
                    disabled={data.group?.record}
                    size="sm"
                  />
                  
                  {#if data.group?.pbx || data.group?.manager || data.group?.record}
                    <div class="p-2 bg-info/10 border border-info/20 rounded flex items-start gap-2">
                      <Info class="w-3 h-3 text-info mt-0.5 flex-shrink-0" />
                      <p class="text-xs text-info">Active purposes cannot be removed.</p>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            <div class="pt-2">
              <Button variant="primary" type="submit" loading={isSubmitting} disabled={!!extensionError} size="sm">
                <Save class="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <!-- Members (wider) -->
      <div class="lg:col-span-3">
        <Card class="h-full">
          {#snippet header()}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Users class="w-4 h-4 text-text-primary" />
                <h3 class="font-semibold text-text-primary">Members</h3>
                <Badge variant="neutral" size="sm">{data.group.members.length}</Badge>
              </div>
              <Button 
                variant="primary" 
                size="sm"
                onclick={() => showAddMember = !showAddMember}
              >
                <Plus class="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          {/snippet}

          <!-- Add Member Form -->
          {#if showAddMember}
            <form 
              method="POST" 
              action="?/addMember"
              use:enhance={() => {
                return async ({ update }) => {
                  await update();
                  showAddMember = false;
                  selectedUserId = '';
                };
              }}
              class="p-3 bg-bg-secondary rounded-lg mb-4"
            >
              <div class="flex gap-2">
                <select
                  name="userId"
                  bind:value={selectedUserId}
                  class="input flex-1"
                  required
                >
                  <option value="">Select user...</option>
                  {#each data.availableUsers as user}
                    <option value={user.id}>
                      {user.name} ({user.extension || 'No ext'})
                    </option>
                  {/each}
                </select>
                <input
                  type="number"
                  name="priority"
                  bind:value={newMemberPriority}
                  class="input w-16"
                  min="0"
                  placeholder="#"
                />
                <Button type="submit" variant="primary" size="sm" disabled={!selectedUserId}>
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onclick={() => showAddMember = false}>
                  Cancel
                </Button>
              </div>
            </form>
          {/if}

          <!-- Member List -->
          {#if data.group.members.length > 0}
            <div class="space-y-2 max-h-[400px] overflow-y-auto">
              {#each data.group.members as member, index}
                <div class="flex items-center justify-between p-2.5 bg-bg-secondary rounded-lg border border-border hover:border-accent/30 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <a href="/users/{member.id}" class="text-sm font-medium text-text-primary hover:text-text-primary">
                          {member.name}
                        </a>
                        {#if !member.enabled}
                          <Badge variant="neutral" size="sm">Disabled</Badge>
                        {/if}
                      </div>
                      <div class="flex items-center gap-3 text-xs text-text-secondary">
                        <span class="flex items-center gap-1">
                          <Phone class="w-3 h-3" />
                          {member.extension || 'No ext'}
                        </span>
                        <span>Pri: {member.priority}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-0.5">
                    <form method="POST" action="?/updatePriority" use:enhance>
                      <input type="hidden" name="membershipId" value={member.membershipId} />
                      <input type="hidden" name="priority" value={Math.max(0, member.priority - 1)} />
                      <button
                        type="submit"
                        class="p-1.5 hover:bg-bg-tertiary rounded"
                        title="Move up"
                        disabled={member.priority === 0}
                      >
                        <ChevronUp class="w-4 h-4" />
                      </button>
                    </form>
                    <form method="POST" action="?/updatePriority" use:enhance>
                      <input type="hidden" name="membershipId" value={member.membershipId} />
                      <input type="hidden" name="priority" value={member.priority + 1} />
                      <button
                        type="submit"
                        class="p-1.5 hover:bg-bg-tertiary rounded"
                        title="Move down"
                      >
                        <ChevronDown class="w-4 h-4" />
                      </button>
                    </form>
                    
                    <form method="POST" action="?/removeMember" use:enhance>
                      <input type="hidden" name="membershipId" value={member.membershipId} />
                      <button
                        type="submit"
                        class="p-1.5 hover:bg-error/10 text-error rounded"
                        title="Remove member"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-center py-8 text-text-secondary">
              <User class="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p class="text-sm">No members in this group</p>
              <Button variant="primary" size="sm" onclick={() => showAddMember = true} class="mt-3">
                <Plus class="w-4 h-4 mr-1" />
                Add First Member
              </Button>
            </div>
          {/if}
        </Card>
      </div>
    </div>

    <!-- Back Link -->
    <div class="pt-2">
      <Button variant="secondary" size="sm" href="/groups">
        <ArrowLeft class="w-4 h-4 mr-1" />
        Back to Groups
      </Button>
    </div>
  {:else if !data.error}
    <Card>
      <div class="text-center py-12 text-text-secondary">
        <Users class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Group not found</p>
      </div>
    </Card>
  {/if}
</div>
