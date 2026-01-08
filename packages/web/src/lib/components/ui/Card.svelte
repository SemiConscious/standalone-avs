<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    padding?: 'none' | 'sm' | 'md' | 'lg';
    class?: string;
    children: Snippet;
    header?: Snippet;
  }

  let { padding = 'md', class: className = '', children, header }: Props = $props();

  const paddingMap = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
</script>

<div class="card {className}">
  {#if header}
    <div class="card-header {paddingMap[padding]} border-b border-surface-700">
      {@render header()}
    </div>
    <div class="{paddingMap[padding]}">
      {@render children()}
    </div>
  {:else}
    <div class="{paddingMap[padding]}">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .card {
    background-color: rgb(var(--color-surface-800));
    border: 1px solid rgb(var(--color-surface-700));
    border-radius: 8px;
  }
</style>
