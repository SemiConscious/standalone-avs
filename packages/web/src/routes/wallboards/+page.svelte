<script lang="ts">
  import { Card, Button, Badge } from '$lib/components/ui';
  import { LayoutGrid, Plus, FlaskConical, AlertCircle, Edit, Trash2, Maximize, Clock, User, Eye, EyeOff, Zap, Activity } from 'lucide-svelte';
  import type { WallboardsPageData, Wallboard } from './+page.server';

  interface Props {
    data: WallboardsPageData;
  }

  let { data }: Props = $props();
  let showDeleteConfirm = $state<string | null>(null);

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  async function handleDelete(wallboardId: string) {
    try {
      const formData = new FormData();
      formData.append('wallboardId', wallboardId);

      const response = await fetch('?/delete', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert('Failed to delete wallboard');
      }
    } catch (error) {
      alert('Failed to delete wallboard');
    } finally {
      showDeleteConfirm = null;
    }
  }
</script>

<svelte:head>
  <title>Wallboards | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data. Live wallboard data is not available.</p>
    </div>
  {:else if data.canShowLiveData}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-4 flex items-center gap-3">
      <Zap class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Connected to Sapien API - wallboards can show real-time call data.</p>
    </div>
  {:else if !data.error}
    <div class="bg-info/10 border border-info/20 text-info rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">For live wallboard data, configure SAPIEN_HOST environment variable.</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Wallboards</h1>
      <p class="text-text-secondary mt-1">
        Customizable real-time dashboards for contact center monitoring
        {#if data.totalCount > 0}
          <span class="text-text-primary font-medium">({data.totalCount} total)</span>
        {/if}
      </p>
    </div>
    <Button variant="primary" href="/wallboards/new">
      <Plus class="w-4 h-4 mr-2" />
      New Wallboard
    </Button>
  </div>

  <!-- Wallboard Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each data.wallboards as wallboard}
      <Card class="group hover:border-primary-500/50 transition-colors">
        <div class="aspect-video bg-bg-secondary rounded-base mb-4 flex items-center justify-center relative overflow-hidden">
          <LayoutGrid class="w-12 h-12 text-text-secondary" />
          <!-- Action buttons on hover -->
          <div class="absolute inset-0 bg-bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button variant="primary" size="sm" href="/wallboards/{wallboard.id}">
              <Maximize class="w-4 h-4 mr-1" />
              Open
            </Button>
            <Button variant="secondary" size="sm" href="/wallboards/{wallboard.id}/edit">
              <Edit class="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold truncate text-text-primary">{wallboard.name}</h3>
              {#if wallboard.isPublic}
                <Eye class="w-4 h-4 text-text-secondary flex-shrink-0" title="Public" />
              {:else}
                <EyeOff class="w-4 h-4 text-text-secondary flex-shrink-0" title="Private" />
              {/if}
            </div>
            <p class="text-sm text-text-secondary mt-1 truncate">{wallboard.description || 'No description'}</p>
            <div class="flex items-center gap-3 mt-2 text-xs text-text-secondary">
              <span>{wallboard.widgetCount} widgets</span>
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" />
                {formatDate(wallboard.lastModified)}
              </span>
            </div>
            <div class="flex items-center gap-1 mt-1 text-xs text-text-secondary">
              <User class="w-3 h-3" />
              {wallboard.createdByName}
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {#if showDeleteConfirm === wallboard.id}
              <Button variant="ghost" size="sm" onclick={() => handleDelete(wallboard.id)}>
                <span class="text-error text-xs">Confirm</span>
              </Button>
              <Button variant="ghost" size="sm" onclick={() => (showDeleteConfirm = null)}>
                <span class="text-xs">Cancel</span>
              </Button>
            {:else}
              <Button
                variant="ghost"
                size="sm"
                onclick={() => (showDeleteConfirm = wallboard.id)}
                disabled={data.isDemo}
              >
                <Trash2 class="w-4 h-4 text-error" />
              </Button>
            {/if}
          </div>
        </div>
      </Card>
    {/each}

    <!-- Create New Wallboard Card -->
    <a href="/wallboards/new" class="block">
      <Card class="border-dashed hover:border-primary-500/50 transition-colors cursor-pointer h-full">
        <div class="aspect-video flex flex-col items-center justify-center text-text-secondary">
          <Plus class="w-8 h-8 mb-2" />
          <p>Create New Wallboard</p>
        </div>
      </Card>
    </a>
  </div>

  {#if data.wallboards.length === 0 && !data.isDemo}
    <Card>
      <div class="text-center py-12 text-text-secondary">
        <LayoutGrid class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No wallboards created yet.</p>
        <p class="text-sm mt-2">Create your first wallboard to monitor real-time metrics.</p>
      </div>
    </Card>
  {/if}
</div>
