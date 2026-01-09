<script lang="ts">
  import { Card, Button } from '$lib/components/ui';
  import { ArrowLeft, Construction, LayoutGrid } from 'lucide-svelte';
</script>

<svelte:head>
  <title>New Wallboard | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div>
    <nav class="text-sm text-text-secondary mb-2">
      <a href="/wallboards" class="hover:text-text-primary inline-flex items-center gap-1">
        <ArrowLeft class="w-4 h-4" />
        Back to Wallboards
      </a>
    </nav>
    <h1 class="text-2xl font-bold text-text-primary">Create New Wallboard</h1>
    <p class="text-text-secondary mt-1">Design a custom real-time dashboard</p>
  </div>

  <!-- Coming Soon -->
  <Card>
    <div class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-6">
        <Construction class="w-8 h-8 text-warning" />
      </div>
      <h2 class="text-xl font-semibold text-text-primary mb-2">Wallboard Editor Coming Soon</h2>
      <p class="text-text-secondary max-w-md mx-auto mb-6">
        The wallboard editor is currently being developed. This feature will allow you to create 
        custom dashboards with drag-and-drop widgets for real-time call center monitoring.
      </p>
      <div class="flex justify-center gap-4">
        <Button variant="secondary" href="/wallboards">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Wallboards
        </Button>
        <Button variant="primary" href="/wallboards/live">
          <LayoutGrid class="w-4 h-4 mr-2" />
          View Live Wallboard
        </Button>
      </div>
    </div>
  </Card>

  <!-- Feature Preview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <LayoutGrid class="w-5 h-5 text-text-primary" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Drag & Drop Widgets</h3>
        <p class="text-sm text-text-secondary">Build dashboards with customizable widgets</p>
      </div>
    </Card>
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <LayoutGrid class="w-5 h-5 text-success" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Real-time Data</h3>
        <p class="text-sm text-text-secondary">Live updates from your call center</p>
      </div>
    </Card>
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <LayoutGrid class="w-5 h-5 text-info" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Share & Publish</h3>
        <p class="text-sm text-text-secondary">Public or private wallboards for your team</p>
      </div>
    </Card>
  </div>
</div>
