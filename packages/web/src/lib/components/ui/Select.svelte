<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props extends HTMLSelectAttributes {
    label?: string;
    error?: string;
    hint?: string;
    options: Array<{ value: string; label: string; disabled?: boolean }>;
    class?: string;
  }

  let {
    label,
    error,
    hint,
    options,
    class: className = '',
    id,
    ...restProps
  }: Props = $props();

  const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="w-full">
  {#if label}
    <label for={selectId} class="block text-sm font-medium text-text-primary mb-1.5">
      {label}
    </label>
  {/if}

  <select
    id={selectId}
    class="
      w-full px-3 py-2 bg-bg-primary border rounded-base
      text-text-primary
      focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
      transition-colors duration-150
      {error ? 'border-error focus:ring-error' : 'border-border'}
      {className}
    "
    {...restProps}
  >
    {#each options as option}
      <option value={option.value} disabled={option.disabled}>
        {option.label}
      </option>
    {/each}
  </select>

  {#if error}
    <p class="mt-1.5 text-sm text-error">{error}</p>
  {:else if hint}
    <p class="mt-1.5 text-sm text-text-secondary">{hint}</p>
  {/if}
</div>

