<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends Omit<HTMLButtonAttributes, 'class'> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    type = 'button',
    class: className = '',
    children,
    ...restProps
  }: Props = $props();
</script>

<button
  {type}
  {disabled}
  class="btn btn-{variant} btn-size-{size} {className}"
  {...restProps}
>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Sizes */
  .btn-size-sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
  }

  .btn-size-md {
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }

  .btn-size-lg {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }

  /* Variants */
  .btn-primary {
    background: linear-gradient(135deg, rgb(var(--color-primary-600)), rgb(var(--color-primary-500)));
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--color-primary-500), 0.35);
  }

  .btn-secondary {
    background: rgb(var(--color-surface-700));
    border: 1px solid rgb(var(--color-surface-600));
    color: rgb(var(--color-surface-200));
  }

  .btn-secondary:hover:not(:disabled) {
    background: rgb(var(--color-surface-600));
    border-color: rgb(var(--color-surface-500));
  }

  .btn-ghost {
    background: transparent;
    color: rgb(var(--color-surface-300));
  }

  .btn-ghost:hover:not(:disabled) {
    background: rgb(var(--color-surface-700));
    color: rgb(var(--color-surface-100));
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.2);
    color: rgb(248, 113, 113);
  }

  .btn-danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
  }
</style>
