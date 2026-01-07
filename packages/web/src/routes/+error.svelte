<script lang="ts">
  import { page } from '$app/stores';
  import { Card, Button } from '$lib/components/ui';
  import { AlertTriangle, Home, ArrowLeft } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Error {$page.status} | Natterbox AVS</title>
</svelte:head>

<div class="min-h-screen bg-bg-primary flex items-center justify-center p-4">
  <Card class="w-full max-w-md text-center">
    <div class="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
      <AlertTriangle class="w-8 h-8 text-error" />
    </div>
    
    <h1 class="mt-6 text-4xl font-bold text-text-primary">{$page.status}</h1>
    
    <p class="mt-2 text-lg text-text-secondary">
      {#if $page.status === 404}
        Page not found
      {:else if $page.status === 401}
        Not authorized
      {:else if $page.status === 403}
        Access denied
      {:else if $page.status === 500}
        Server error
      {:else}
        Something went wrong
      {/if}
    </p>
    
    {#if $page.error?.message}
      <div class="mt-4 p-4 bg-bg-secondary rounded-lg border border-border">
        <p class="text-sm text-text-secondary font-mono break-words">
          {$page.error.message}
        </p>
      </div>
    {/if}
    
    <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
      <Button variant="secondary" onclick={() => history.back()}>
        <ArrowLeft class="w-4 h-4 mr-2" />
        Go back
      </Button>
      <Button variant="primary" onclick={() => location.href = '/'}>
        <Home class="w-4 h-4 mr-2" />
        Home
      </Button>
    </div>
  </Card>
</div>

