<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'success' | 'warning' | 'error' | 'neutral' | 'accent';
    size?: 'sm' | 'md';
    class?: string;
    children: Snippet;
  }

  let { variant = 'neutral', size = 'md', class: className = '', children }: Props = $props();
</script>

<span class="badge badge-{variant} badge-size-{size} {className}">
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    font-weight: 500;
    border-radius: 9999px;
  }

  /* Sizes */
  .badge-size-sm {
    padding: 0.125rem 0.5rem;
    font-size: 0.625rem;
  }

  .badge-size-md {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
  }

  /* Variants */
  .badge-success {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(74, 222, 128);
  }

  .badge-warning {
    background: rgba(251, 191, 36, 0.2);
    color: rgb(251, 191, 36);
  }

  .badge-error {
    background: rgba(239, 68, 68, 0.2);
    color: rgb(248, 113, 113);
  }

  .badge-neutral {
    background: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-300));
  }

  .badge-accent {
    background: rgba(var(--color-primary-500), 0.2);
    color: rgb(var(--color-primary-400));
  }
</style>
