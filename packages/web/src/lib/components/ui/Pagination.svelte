<script lang="ts">
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { Button } from './index';

  interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    showPageNumbers?: boolean;
    maxVisiblePages?: number;
  }

  let {
    currentPage,
    totalPages,
    onPageChange,
    showPageNumbers = true,
    maxVisiblePages = 5,
  }: Props = $props();

  const visiblePages = $derived(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  }
</script>

<nav class="flex items-center justify-center gap-1" aria-label="Pagination">
  <Button
    variant="ghost"
    size="sm"
    disabled={currentPage === 1}
    onclick={() => goToPage(currentPage - 1)}
    aria-label="Previous page"
  >
    <ChevronLeft class="w-4 h-4" />
  </Button>

  {#if showPageNumbers}
    {#each visiblePages() as page}
      <button
        class="px-3 py-1.5 rounded-base text-sm font-medium transition-colors
               {currentPage === page
          ? 'bg-accent text-white'
          : 'hover:bg-bg-secondary text-text-primary'}"
        onclick={() => goToPage(page)}
        aria-current={currentPage === page ? 'page' : undefined}
      >
        {page}
      </button>
    {/each}
  {:else}
    <span class="px-3 py-1.5 text-sm text-text-secondary">
      Page {currentPage} of {totalPages}
    </span>
  {/if}

  <Button
    variant="ghost"
    size="sm"
    disabled={currentPage === totalPages}
    onclick={() => goToPage(currentPage + 1)}
    aria-label="Next page"
  >
    <ChevronRight class="w-4 h-4" />
  </Button>
</nav>

