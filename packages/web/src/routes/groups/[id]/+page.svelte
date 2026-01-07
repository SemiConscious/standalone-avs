<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button, Input } from '$lib/components/ui';
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
  } from 'lucide-svelte';
  import type { ActionData } from './$types';
  import type { Group } from './+page.server';
  
  interface Props {
    data: {
      group: Group | null;
      availableUsers: { id: string; name: string; username: string; extension: string }[];
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
  
  let isSubmitting = $state(false);
  let showAddMember = $state(false);
  let selectedUserId = $state('');
  let newMemberPriority = $state(data.group?.members.length || 0);
  
  const groupTypes = [
    { value: 'RING_ALL', label: 'Ring All - Call all agents simultaneously' },
    { value: 'ROUND_ROBIN', label: 'Round Robin - Rotate through agents' },
    { value: 'LEAST_CALLS', label: 'Least Calls - Agent with fewest calls' },
    { value: 'LONGEST_IDLE', label: 'Longest Idle - Agent idle longest' },
    { value: 'PRIORITY', label: 'Priority - Based on agent priority' },
  ];
</script>

<svelte:head>
  <title>{data.group?.name || 'Group'} | Natterbox AVS</title>
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
  <div class="flex items-center gap-4">
    <a
      href="/groups"
      class="p-2 rounded-base hover:bg-bg-secondary transition-colors"
      aria-label="Back to groups"
    >
      <ArrowLeft class="w-5 h-5" />
    </a>
    <div class="flex-1">
      <h1 class="text-2xl font-bold">{data.group?.name || 'Unknown Group'}</h1>
      <p class="text-text-secondary mt-1">{data.group?.description || 'No description'}</p>
    </div>
    
    {#if data.group}
      <div class="flex items-center gap-4 text-sm">
        <div class="text-center">
          <p class="text-2xl font-bold text-accent">{data.group.members.length}</p>
          <p class="text-text-secondary">Members</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning">{data.group.waitingCalls}</p>
          <p class="text-text-secondary">Waiting</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-success">{data.group.answeredCalls}</p>
          <p class="text-text-secondary">Answered</p>
        </div>
      </div>
    {/if}
  </div>

  {#if data.group}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Group Settings -->
      <Card>
        {#snippet header()}
          <div class="flex items-center gap-2">
            <Settings class="w-5 h-5 text-accent" />
            <h2 class="font-semibold">Group Settings</h2>
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
          class="space-y-4"
        >
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
            <label for="description" class="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="description"
              name="description"
              bind:value={description}
              class="input w-full"
              rows="3"
            ></textarea>
          </div>

          <div>
            <label for="type" class="block text-sm font-medium mb-1">Ring Strategy</label>
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
            <label for="maxQueueTime" class="block text-sm font-medium mb-1">Max Queue Time (seconds)</label>
            <input
              id="maxQueueTime"
              name="maxQueueTime"
              type="number"
              bind:value={maxQueueTime}
              class="input w-full"
              min="0"
              max="3600"
            />
            <p class="text-xs text-text-secondary mt-1">
              Maximum time a call will wait in queue before overflow
            </p>
          </div>

          <div class="pt-2">
            <Button variant="primary" type="submit" loading={isSubmitting}>
              <Save class="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </form>
      </Card>

      <!-- Members -->
      <Card>
        {#snippet header()}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Users class="w-5 h-5 text-accent" />
              <h2 class="font-semibold">Members ({data.group.members.length})</h2>
            </div>
            <Button 
              variant="primary" 
              size="sm"
              onclick={() => showAddMember = !showAddMember}
            >
              <Plus class="w-4 h-4" />
              Add Member
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
            class="p-3 bg-bg-secondary rounded mb-4"
          >
            <div class="flex gap-2">
              <select
                name="userId"
                bind:value={selectedUserId}
                class="input flex-1"
                required
              >
                <option value="">Select a user...</option>
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
                class="input w-20"
                min="0"
                placeholder="Priority"
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
          <div class="space-y-2">
            {#each data.group.members as member, index}
              <div class="flex items-center justify-between p-3 bg-bg-secondary rounded border border-border">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <a href="/users/{member.id}" class="font-medium hover:text-accent">
                        {member.name}
                      </a>
                      {#if !member.enabled}
                        <Badge variant="neutral">Disabled</Badge>
                      {/if}
                    </div>
                    <div class="flex items-center gap-3 text-xs text-text-secondary">
                      <span class="flex items-center gap-1">
                        <Phone class="w-3 h-3" />
                        {member.extension || 'No ext'}
                      </span>
                      <span>Priority: {member.priority}</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-1">
                  <!-- Priority Adjust -->
                  <form method="POST" action="?/updatePriority" use:enhance class="flex gap-1">
                    <input type="hidden" name="membershipId" value={member.membershipId} />
                    <input type="hidden" name="priority" value={Math.max(0, member.priority - 1)} />
                    <button
                      type="submit"
                      class="p-1 hover:bg-bg-tertiary rounded"
                      title="Move up"
                      disabled={member.priority === 0}
                    >
                      <ChevronUp class="w-4 h-4" />
                    </button>
                  </form>
                  <form method="POST" action="?/updatePriority" use:enhance class="flex gap-1">
                    <input type="hidden" name="membershipId" value={member.membershipId} />
                    <input type="hidden" name="priority" value={member.priority + 1} />
                    <button
                      type="submit"
                      class="p-1 hover:bg-bg-tertiary rounded"
                      title="Move down"
                    >
                      <ChevronDown class="w-4 h-4" />
                    </button>
                  </form>
                  
                  <!-- Remove -->
                  <form method="POST" action="?/removeMember" use:enhance>
                    <input type="hidden" name="membershipId" value={member.membershipId} />
                    <button
                      type="submit"
                      class="p-1 hover:bg-red-500/10 text-red-400 rounded"
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
            <p>No members in this group</p>
            <Button variant="primary" size="sm" onclick={() => showAddMember = true} class="mt-3">
              <Plus class="w-4 h-4 mr-2" />
              Add First Member
            </Button>
          </div>
        {/if}
      </Card>
    </div>

    <!-- Back Link -->
    <div class="flex justify-start">
      <a href="/groups">
        <Button variant="secondary">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Groups
        </Button>
      </a>
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

