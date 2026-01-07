<script lang="ts">
  import type { Snippet } from 'svelte';
  
  interface Props {
    children: Snippet;
  }
  
  let { children }: Props = $props();
</script>

<!-- Full-screen layout for the policy editor - no sidebar or header -->
<div class="h-screen w-screen overflow-hidden">
  {@render children()}
</div>

<style>
  /* Override any parent layout styles */
  :global(body) {
    overflow: hidden;
  }
</style>

