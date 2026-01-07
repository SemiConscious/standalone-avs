<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    class?: string;
    children: Snippet;
  }

  let { padding = 'md', class: className = '', children }: Props = $props();

  const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
</script>

<div class="card {paddingMap[padding]} {className}">
  {@render children()}
</div>

<style>
  .card {
    background-color: rgb(var(--color-surface-800));
    border: 1px solid rgb(var(--color-surface-700));
    border-radius: 8px;
  }
</style>
