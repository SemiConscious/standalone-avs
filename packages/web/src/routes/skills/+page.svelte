<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button, Input } from '$lib/components/ui';
  import { 
    Award, 
    Plus, 
    Trash2, 
    Edit2, 
    AlertCircle, 
    FlaskConical,
    CheckCircle,
    X,
    Users,
    Tag,
  } from 'lucide-svelte';
  import type { SkillsPageData } from './+page.server';
  import type { ActionData } from './$types';
  
  interface Props {
    data: SkillsPageData;
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Modal state
  let showCreateModal = $state(false);
  let editingSkill = $state<typeof data.skills[0] | null>(null);
  let deleteConfirmId = $state<string | null>(null);
  
  // Form state
  let skillName = $state('');
  let skillDescription = $state('');
  let skillCategory = $state('');
  let isSubmitting = $state(false);
  
  // Filter state
  let selectedCategory = $state('');
  let searchQuery = $state('');
  
  // Filtered skills
  const filteredSkills = $derived(() => {
    return data.skills.filter(skill => {
      if (selectedCategory && skill.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!skill.name.toLowerCase().includes(q) && 
            !skill.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  });
  
  // Group skills by category
  const skillsByCategory = $derived(() => {
    const groups: Record<string, typeof data.skills> = {};
    for (const skill of filteredSkills()) {
      const cat = skill.category || 'Uncategorized';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(skill);
    }
    return groups;
  });
  
  function openCreate() {
    skillName = '';
    skillDescription = '';
    skillCategory = '';
    editingSkill = null;
    showCreateModal = true;
  }
  
  function openEdit(skill: typeof data.skills[0]) {
    skillName = skill.name;
    skillDescription = skill.description;
    skillCategory = skill.category;
    editingSkill = skill;
    showCreateModal = true;
  }
  
  function closeModal() {
    showCreateModal = false;
    editingSkill = null;
    isSubmitting = false;
  }
  
  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Language': 'bg-blue-500/10 text-blue-400',
      'Technical': 'bg-purple-500/10 text-purple-400',
      'Sales': 'bg-green-500/10 text-green-400',
      'Service': 'bg-yellow-500/10 text-yellow-400',
    };
    return colors[category] || 'bg-gray-500/10 text-gray-400';
  }
</script>

<svelte:head>
  <title>Skills | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data</p>
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
        {#if form.action === 'create'}
          Skill created successfully
        {:else if form.action === 'update'}
          Skill updated successfully
        {:else if form.action === 'delete'}
          Skill deleted successfully
        {:else}
          Operation successful
        {/if}
      </p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Skills</h1>
      <p class="text-text-secondary mt-1">Manage skills for skill-based routing</p>
    </div>
    <Button variant="primary" onclick={openCreate}>
      <Plus class="w-4 h-4 mr-2" />
      Add Skill
    </Button>
  </div>

  <!-- Stats & Filters -->
  <div class="flex flex-wrap gap-4">
    <Card class="flex-1 min-w-[200px]">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-accent/10 rounded-base">
          <Award class="w-6 h-6 text-text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.skills.length}</p>
          <p class="text-sm text-text-secondary">Total Skills</p>
        </div>
      </div>
    </Card>
    <Card class="flex-1 min-w-[200px]">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-500/10 rounded-base">
          <Tag class="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.categories.length}</p>
          <p class="text-sm text-text-secondary">Categories</p>
        </div>
      </div>
    </Card>
    <Card class="flex-1 min-w-[200px]">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-green-500/10 rounded-base">
          <Users class="w-6 h-6 text-green-400" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.skills.reduce((acc, s) => acc + s.userCount, 0)}</p>
          <p class="text-sm text-text-secondary">Total Assignments</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Filters -->
  <Card>
    <div class="flex flex-wrap gap-4">
      <div class="flex-1 min-w-[200px]">
        <input
          type="text"
          bind:value={searchQuery}
          class="input w-full"
          placeholder="Search skills..."
        />
      </div>
      <div class="w-48">
        <select
          bind:value={selectedCategory}
          class="input w-full"
        >
          <option value="">All Categories</option>
          {#each data.categories as category}
            <option value={category}>{category}</option>
          {/each}
        </select>
      </div>
    </div>
  </Card>

  <!-- Skills List by Category -->
  {#each Object.entries(skillsByCategory()) as [category, skills]}
    <Card>
      {#snippet header()}
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 text-xs rounded {getCategoryColor(category)}">{category}</span>
          <span class="text-text-secondary">({skills.length} skills)</span>
        </div>
      {/snippet}

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each skills as skill}
          <div class="p-4 bg-bg-secondary rounded border border-border hover:border-accent transition-colors">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-medium">{skill.name}</h3>
                {#if skill.description}
                  <p class="text-sm text-text-secondary mt-1">{skill.description}</p>
                {/if}
                <div class="flex items-center gap-2 mt-2">
                  <Badge variant="accent">
                    <Users class="w-3 h-3 mr-1" />
                    {skill.userCount} users
                  </Badge>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  onclick={() => openEdit(skill)}
                  class="p-1 hover:bg-bg-tertiary rounded"
                  title="Edit skill"
                >
                  <Edit2 class="w-4 h-4" />
                </button>
                {#if deleteConfirmId === skill.id}
                  <form method="POST" action="?/delete" use:enhance class="flex items-center gap-1">
                    <input type="hidden" name="id" value={skill.id} />
                    <button type="submit" class="p-1 text-red-400 hover:bg-red-500/10 rounded text-xs">
                      Confirm
                    </button>
                    <button type="button" onclick={() => deleteConfirmId = null} class="p-1 hover:bg-bg-tertiary rounded text-xs">
                      Cancel
                    </button>
                  </form>
                {:else}
                  <button
                    type="button"
                    onclick={() => deleteConfirmId = skill.id}
                    class="p-1 hover:bg-red-500/10 text-red-400 rounded"
                    title="Delete skill"
                    disabled={skill.userCount > 0}
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  {:else}
    <Card>
      <div class="text-center py-12 text-text-secondary">
        <Award class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No skills found</p>
        {#if searchQuery || selectedCategory}
          <p class="text-sm mt-2">Try adjusting your filters</p>
        {:else}
          <Button variant="primary" onclick={openCreate} class="mt-4">
            <Plus class="w-4 h-4 mr-2" />
            Add First Skill
          </Button>
        {/if}
      </div>
    </Card>
  {/each}
</div>

<!-- Create/Edit Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={closeModal}
      onkeydown={(e) => e.key === 'Escape' && closeModal()}
      role="button"
      tabindex="0"
    ></div>
    
    <!-- Modal -->
    <div class="relative z-10 bg-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h2 class="text-lg font-semibold">
          {editingSkill ? 'Edit Skill' : 'Create Skill'}
        </h2>
        <button 
          onclick={closeModal}
          class="p-1 hover:bg-bg-tertiary rounded"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <form 
        method="POST" 
        action={editingSkill ? '?/update' : '?/create'}
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            await update();
            isSubmitting = false;
            if (!form?.error) {
              closeModal();
            }
          };
        }}
        class="p-4 space-y-4"
      >
        {#if editingSkill}
          <input type="hidden" name="id" value={editingSkill.id} />
        {/if}
        
        <div>
          <label for="name" class="block text-sm font-medium mb-1">Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            bind:value={skillName}
            class="input w-full"
            placeholder="e.g., Spanish"
            required
          />
        </div>
        
        <div>
          <label for="category" class="block text-sm font-medium mb-1">Category</label>
          <input
            id="category"
            name="category"
            type="text"
            bind:value={skillCategory}
            class="input w-full"
            placeholder="e.g., Language"
            list="categories"
          />
          <datalist id="categories">
            {#each data.categories as cat}
              <option value={cat} />
            {/each}
          </datalist>
        </div>
        
        <div>
          <label for="description" class="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="description"
            name="description"
            bind:value={skillDescription}
            class="input w-full"
            rows="3"
            placeholder="Optional description..."
          ></textarea>
        </div>
        
        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onclick={closeModal}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !skillName}>
            {isSubmitting ? 'Saving...' : (editingSkill ? 'Update Skill' : 'Create Skill')}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}

