<script lang="ts">
  import '../../app.css';
  import type { Snippet } from 'svelte';
  
  interface Props {
    children: Snippet;
  }
  
  let { children }: Props = $props();
</script>

<!-- Fullscreen layout - no sidebar or header -->
<div class="h-screen w-screen overflow-hidden bg-surface-100-900">
  {@render children()}
</div>

