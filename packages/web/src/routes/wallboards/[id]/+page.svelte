<script lang="ts">
  import { page } from '$app/stores';
  import { Card, Button } from '$lib/components/ui';
  import { ArrowLeft, Construction, LayoutGrid, Maximize, Edit } from 'lucide-svelte';

  const wallboardId = $page.params.id;
</script>

<svelte:head>
  <title>Wallboard | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <nav class="text-sm text-text-secondary mb-2">
        <a href="/wallboards" class="hover:text-text-primary inline-flex items-center gap-1">
          <ArrowLeft class="w-4 h-4" />
          Back to Wallboards
        </a>
      </nav>
      <h1 class="text-2xl font-bold text-text-primary">Wallboard</h1>
      <p class="text-text-secondary mt-1">ID: {wallboardId}</p>
    </div>
    <div class="flex gap-2">
      <Button variant="secondary" href="/wallboards/live">
        <Maximize class="w-4 h-4 mr-2" />
        View Live
      </Button>
    </div>
  </div>

  <!-- Coming Soon -->
  <Card>
    <div class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-6">
        <Construction class="w-8 h-8 text-warning" />
      </div>
      <h2 class="text-xl font-semibold text-text-primary mb-2">Custom Wallboard View Coming Soon</h2>
      <p class="text-text-secondary max-w-md mx-auto mb-6">
        Individual wallboard configuration and display is being developed. 
        In the meantime, you can view the generic live wallboard with real-time call center metrics.
      </p>
      <div class="flex justify-center gap-4">
        <Button variant="secondary" href="/wallboards">
          <ArrowLeft class="w-4 h-4 mr-2" />
          All Wallboards
        </Button>
        <Button variant="primary" href="/wallboards/live">
          <LayoutGrid class="w-4 h-4 mr-2" />
          View Live Wallboard
        </Button>
      </div>
    </div>
  </Card>

  <!-- Placeholder for future wallboard content -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50">
    {#each Array(8) as _, i}
      <Card>
        <div class="aspect-square flex items-center justify-center bg-bg-secondary rounded-base">
          <LayoutGrid class="w-8 h-8 text-text-secondary" />
        </div>
        <p class="text-xs text-text-secondary text-center mt-2">Widget {i + 1}</p>
      </Card>
    {/each}
  </div>
</div>
