<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { ChevronUp, ChevronDown } from 'lucide-svelte';

  interface Column<T> {
    key: keyof T | string;
    label: string;
    sortable?: boolean;
    width?: string;
    render?: Snippet<[T]>;
  }

  interface Props {
    columns: Column<T>[];
    data: T[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (key: string) => void;
    loading?: boolean;
    emptyMessage?: string;
    rowKey?: keyof T;
  }

  let {
    columns,
    data,
    sortBy,
    sortOrder = 'asc',
    onSort,
    loading = false,
    emptyMessage = 'No data available',
    rowKey = 'id' as keyof T,
  }: Props = $props();

  function handleSort(key: string) {
    if (onSort) {
      onSort(key);
    }
  }

  function getValue(row: T, key: keyof T | string): unknown {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj, k) => (obj as Record<string, unknown>)?.[k], row);
    }
    return row[key as keyof T];
  }
</script>

<div class="overflow-x-auto">
  <table class="w-full text-left border-collapse">
    <thead>
      <tr>
        {#each columns as column}
          <th
            class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-secondary bg-bg-secondary border-b border-border"
            style={column.width ? `width: ${column.width}` : ''}
          >
            {#if column.sortable && onSort}
              <button
                class="flex items-center gap-1 hover:text-text-primary transition-colors"
                onclick={() => handleSort(String(column.key))}
              >
                {column.label}
                <span class="inline-flex flex-col">
                  <ChevronUp
                    class="w-3 h-3 -mb-1 {sortBy === column.key && sortOrder === 'asc'
                      ? 'text-accent'
                      : 'text-text-secondary/30'}"
                  />
                  <ChevronDown
                    class="w-3 h-3 -mt-1 {sortBy === column.key && sortOrder === 'desc'
                      ? 'text-accent'
                      : 'text-text-secondary/30'}"
                  />
                </span>
              </button>
            {:else}
              {column.label}
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if loading}
        <tr>
          <td colspan={columns.length} class="px-4 py-8 text-center">
            <div class="flex items-center justify-center gap-2 text-text-secondary">
              <svg class="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Loading...</span>
            </div>
          </td>
        </tr>
      {:else if data.length === 0}
        <tr>
          <td colspan={columns.length} class="px-4 py-8 text-center text-text-secondary">
            {emptyMessage}
          </td>
        </tr>
      {:else}
        {#each data as row (row[rowKey])}
          <tr class="border-b border-border hover:bg-bg-secondary/50 transition-colors">
            {#each columns as column}
              <td class="px-4 py-3">
                {#if column.render}
                  {@render column.render(row)}
                {:else}
                  {getValue(row, column.key)}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

