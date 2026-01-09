<script lang="ts">
  import { cn } from '$lib/utils';
  import {
    Search,
    RefreshCw,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
    Columns3,
    ChevronDown,
  } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  export interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    visible?: boolean;
  }

  interface Props {
    data: Record<string, unknown>[];
    columns: Column[];
    loading?: boolean;
    selectable?: boolean;
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
    columnSelector?: boolean;
    onRowClick?: (row: Record<string, unknown>) => void;
    onSelectionChange?: (ids: string[]) => void;
    onRefresh?: () => void;
    onColumnsChange?: (columns: Column[]) => void;
    cell?: Snippet<[Column, Record<string, unknown>]>;
    toolbar?: Snippet;
    // Pagination props
    paginated?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
  }

  let {
    data,
    columns,
    loading = false,
    selectable = false,
    searchable = true,
    searchPlaceholder = 'Search...',
    emptyMessage = 'No data found',
    columnSelector = false,
    onRowClick,
    onSelectionChange,
    onRefresh,
    onColumnsChange,
    cell,
    toolbar,
    // Pagination defaults
    paginated = true,
    pageSize: initialPageSize = 15,
    pageSizeOptions = [10, 15, 25, 50, 100],
  }: Props = $props();

  let sortColumn = $state<string | null>(null);
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let selectedIds = $state<Set<string>>(new Set());
  let currentPage = $state(1);
  let pageSize = $state(initialPageSize);
  let searchQuery = $state('');
  let showColumnSelector = $state(false);

  // Visible columns
  const visibleColumns = $derived(columns.filter((col) => col.visible !== false));

  // Filtered data (by search)
  const filteredData = $derived(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((row) => {
      return visibleColumns.some((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  });

  // Sorted data
  const sortedData = $derived(() => {
    const filtered = filteredData();
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn!];
      const bVal = b[sortColumn!];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  });

  // Total pages
  const totalPages = $derived(() => {
    if (!paginated) return 1;
    return Math.ceil(sortedData().length / pageSize) || 1;
  });

  // Paginated data
  const paginatedData = $derived(() => {
    const sorted = sortedData();
    if (!paginated) return sorted;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sorted.slice(start, end);
  });

  // Reset to page 1 when data, pageSize, or search changes
  $effect(() => {
    data;
    pageSize;
    searchQuery;
    currentPage = 1;
  });

  // Result range text
  const startIndex = $derived(sortedData().length === 0 ? 0 : (currentPage - 1) * pageSize + 1);
  const endIndex = $derived(Math.min(currentPage * pageSize, sortedData().length));

  function handleSort(column: Column) {
    if (!column.sortable) return;

    if (sortColumn === column.key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column.key;
      sortDirection = 'asc';
    }
  }

  function handleSelectAll(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      selectedIds = new Set(data.map((row) => String(row.id)));
    } else {
      selectedIds = new Set();
    }
    onSelectionChange?.([...selectedIds]);
  }

  function handleSelectRow(id: string, e: Event) {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    selectedIds = newSet;
    onSelectionChange?.([...selectedIds]);
  }

  function handleRowClick(row: Record<string, unknown>) {
    onRowClick?.(row);
  }

  function toggleColumnVisibility(columnKey: string) {
    const updatedColumns = columns.map((col) =>
      col.key === columnKey ? { ...col, visible: col.visible === false ? true : false } : col
    );
    onColumnsChange?.(updatedColumns);
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.column-selector-container')) {
      showColumnSelector = false;
    }
  }

  $effect(() => {
    if (showColumnSelector) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  const allSelected = $derived(data.length > 0 && selectedIds.size === data.length);
  const someSelected = $derived(selectedIds.size > 0 && selectedIds.size < data.length);
</script>

<div class="flex flex-col min-h-0 h-full bg-surface-800 rounded-lg border border-surface-700">
  <!-- Search and toolbar -->
  <div class="flex items-center gap-3 p-3 border-b border-surface-700">
    <!-- Left section: Refresh + Search + Custom toolbar -->
    <div class="flex items-center gap-2 flex-1">
      {#if onRefresh}
        <button
          onclick={onRefresh}
          class="flex items-center justify-center p-1.5 text-sm bg-surface-700 border border-surface-600 rounded-lg text-surface-200 hover:bg-surface-600 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw class="w-4 h-4" />
        </button>
      {/if}

      {#if searchable}
        <div class="relative w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={searchPlaceholder}
            class="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-900 border border-surface-600 rounded-lg text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      {/if}

      {#if toolbar}
        {@render toolbar()}
      {/if}

      {#if selectable && selectedIds.size > 0}
        <span class="text-sm text-surface-400">{selectedIds.size} selected</span>
      {/if}
    </div>

    <!-- Right section: Column selector -->
    <div class="flex items-center gap-2">
      {#if columnSelector && onColumnsChange}
        <div class="column-selector-container relative">
          <button
            onclick={() => (showColumnSelector = !showColumnSelector)}
            class="flex items-center gap-2 px-3 py-2 text-sm bg-surface-700 border border-surface-600 rounded-lg text-surface-200 hover:bg-surface-600 transition-colors"
          >
            <Columns3 class="w-4 h-4" />
            Columns
            <ChevronDown class="w-3 h-3" />
          </button>

          {#if showColumnSelector}
            <div
              class="absolute right-0 top-full mt-2 w-56 bg-surface-700 border border-surface-600 rounded-lg shadow-lg z-50 p-3"
            >
              <p class="text-xs font-semibold text-surface-400 uppercase mb-2">Toggle Columns</p>
              <div class="space-y-1.5">
                {#each columns as column}
                  <label
                    class="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface-600 p-1.5 rounded text-surface-200"
                  >
                    <input
                      type="checkbox"
                      checked={column.visible !== false}
                      onchange={() => toggleColumnVisibility(column.key)}
                      class="w-4 h-4 rounded cursor-pointer appearance-none bg-surface-800 border border-surface-500 checked:bg-primary-600 checked:border-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-700"
                    />
                    {column.label}
                  </label>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Table -->
  <div class="flex-1 overflow-auto min-h-0">
    <table class="w-full text-sm text-left">
      <thead
        class="sticky top-0 z-10 bg-surface-700 text-surface-400 uppercase text-xs tracking-wider border-b border-surface-600"
      >
        <tr>
          {#if selectable}
            <th class="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                indeterminate={someSelected}
                onchange={handleSelectAll}
                class="w-4 h-4 rounded cursor-pointer appearance-none bg-surface-600 border border-surface-500 checked:bg-primary-600 checked:border-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-700"
              />
            </th>
          {/if}
          {#each visibleColumns as column}
            <th
              class={cn(
                'px-4 py-3 font-semibold',
                column.sortable && 'cursor-pointer hover:bg-surface-600 transition-colors'
              )}
              style={column.width ? `width: ${column.width}` : ''}
              onclick={() => handleSort(column)}
            >
              <div class="flex items-center gap-2">
                {column.label}
                {#if column.sortable}
                  <svg
                    class={cn(
                      'w-4 h-4 transition-transform',
                      sortColumn === column.key ? 'text-primary-400' : 'text-surface-500',
                      sortColumn === column.key && sortDirection === 'desc' && 'rotate-180'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                {/if}
              </div>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="text-surface-200">
        {#if loading}
          <tr>
            <td colspan={visibleColumns.length + (selectable ? 1 : 0)} class="text-center py-12">
              <div class="flex items-center justify-center gap-3 text-surface-400">
                <div
                  class="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"
                ></div>
                Loading...
              </div>
            </td>
          </tr>
        {:else if paginatedData().length === 0}
          <tr>
            <td
              colspan={visibleColumns.length + (selectable ? 1 : 0)}
              class="text-center py-12 text-surface-400"
            >
              {emptyMessage}
            </td>
          </tr>
        {:else}
          {#each paginatedData() as row, index (row.id ?? index)}
            <tr
              class={cn(
                'border-b border-surface-700 hover:bg-surface-700/50 transition-colors',
                onRowClick && 'cursor-pointer',
                selectedIds.has(String(row.id)) && 'bg-primary-900/30'
              )}
              onclick={() => handleRowClick(row)}
            >
              {#if selectable}
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(String(row.id))}
                    onchange={(e) => handleSelectRow(String(row.id), e)}
                    class="w-4 h-4 rounded cursor-pointer appearance-none bg-surface-700 border border-surface-500 checked:bg-primary-600 checked:border-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-800"
                  />
                </td>
              {/if}
              {#each visibleColumns as column}
                <td class="px-4 py-3">
                  {#if cell}
                    {@render cell(column, row)}
                  {:else}
                    {row[column.key] ?? '-'}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if paginated && sortedData().length > 0}
    <div
      class="flex items-center justify-between px-4 py-3 border-t border-surface-600 bg-surface-700 flex-shrink-0"
    >
      <!-- Results info -->
      <div class="text-sm text-surface-400">
        Showing {startIndex} to {endIndex} of {sortedData().length} results
      </div>

      <!-- Pagination controls -->
      <div class="flex items-center gap-4">
        <!-- Page size selector -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-surface-400">Rows per page:</span>
          <select
            bind:value={pageSize}
            class="text-sm border border-surface-600 rounded px-2 py-1 bg-surface-700 text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {#each pageSizeOptions as size}
              <option value={size}>{size}</option>
            {/each}
          </select>
        </div>

        <!-- Page navigation -->
        <nav class="flex items-center" aria-label="Pagination">
          <button
            onclick={() => (currentPage = 1)}
            disabled={currentPage === 1}
            class="w-8 h-8 shrink-0 box-border flex items-center justify-center text-sm border border-surface-500 rounded-lg transition-colors bg-surface-600 text-surface-100 hover:bg-surface-500 hover:border-surface-400 disabled:bg-surface-800 disabled:text-surface-500 disabled:cursor-not-allowed"
            aria-label="First page"
          >
            <ChevronsLeft class="w-4 h-4" />
          </button>

          <button
            onclick={() => (currentPage = Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            class="w-8 h-8 shrink-0 box-border flex items-center justify-center text-sm border border-surface-500 rounded-lg transition-colors bg-surface-600 text-surface-100 hover:bg-surface-500 hover:border-surface-400 disabled:bg-surface-800 disabled:text-surface-500 disabled:cursor-not-allowed ml-0.5"
            aria-label="Previous page"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <button
            onclick={() => (currentPage = Math.min(totalPages(), currentPage + 1))}
            disabled={currentPage === totalPages()}
            class="w-8 h-8 shrink-0 box-border flex items-center justify-center text-sm border border-surface-500 rounded-lg transition-colors bg-surface-600 text-surface-100 hover:bg-surface-500 hover:border-surface-400 disabled:bg-surface-800 disabled:text-surface-500 disabled:cursor-not-allowed ml-0.5"
            aria-label="Next page"
          >
            <ChevronRight class="w-4 h-4" />
          </button>

          <button
            onclick={() => (currentPage = totalPages())}
            disabled={currentPage === totalPages()}
            class="w-8 h-8 shrink-0 box-border flex items-center justify-center text-sm border border-surface-500 rounded-lg transition-colors bg-surface-600 text-surface-100 hover:bg-surface-500 hover:border-surface-400 disabled:bg-surface-800 disabled:text-surface-500 disabled:cursor-not-allowed ml-0.5"
            aria-label="Last page"
          >
            <ChevronsRight class="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  {/if}
</div>

<style>
  input[type='checkbox']:checked {
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
  }

  input[type='checkbox']:indeterminate {
    background-color: rgb(var(--color-primary-600));
    border-color: rgb(var(--color-primary-600));
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M4 8h8' stroke='white' stroke-width='2' stroke-linecap='round'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
  }
</style>
