<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { Card, Badge, Button } from '$lib/components/ui';
  import { 
    Search, 
    Filter, 
    Clock, 
    Phone, 
    ArrowRight, 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    AlertCircle, 
    FlaskConical,
    X,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownLeft,
    Columns,
    Save,
    BookmarkPlus,
    Trash2,
    Star,
    Check,
  } from 'lucide-svelte';
  import type { SearchPageData, FilterView, InsightResult } from './+page.server';
  
  interface Props {
    data: SearchPageData;
  }
  
  let { data }: Props = $props();
  
  // Search state
  let query = $state(data.filters.query || '');
  let selectedSentiment = $state<string>(data.filters.sentiment || '');
  let startDate = $state(data.filters.startDate || '');
  let endDate = $state(data.filters.endDate || '');
  let showFilters = $state(false);
  let showColumnSelector = $state(false);
  let showSaveViewModal = $state(false);
  
  // Column selection state
  let selectedColumns = $state<string[]>([...data.columns]);
  
  // Save view state
  let saveViewName = $state('');
  let saveViewIsDefault = $state(false);
  let editingViewId = $state<string | null>(null);
  let saveViewLoading = $state(false);
  let saveViewError = $state<string | null>(null);
  
  // Pagination
  const limit = data.filters.limit || 20;
  const offset = data.filters.offset || 0;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(data.total / limit);
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
  
  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  function getSentimentIcon(sentiment: 'positive' | 'neutral' | 'negative') {
    switch (sentiment) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      default: return Minus;
    }
  }
  
  function getSentimentColor(sentiment: 'positive' | 'neutral' | 'negative'): string {
    switch (sentiment) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      default: return 'text-text-secondary';
    }
  }
  
  function getSentimentBadgeVariant(sentiment: 'positive' | 'neutral' | 'negative'): 'success' | 'error' | 'neutral' {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'neutral';
    }
  }
  
  function buildSearchParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedSentiment && selectedSentiment !== 'all') params.set('sentiment', selectedSentiment);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (selectedColumns.length > 0 && selectedColumns.join(',') !== data.availableColumns.filter(c => c.default).map(c => c.key).join(',')) {
      params.set('columns', selectedColumns.join(','));
    }
    return params;
  }
  
  function handleSearch() {
    const params = buildSearchParams();
    goto(`/insights/search?${params.toString()}`);
  }
  
  function clearFilters() {
    query = '';
    selectedSentiment = '';
    startDate = '';
    endDate = '';
    goto('/insights/search');
  }
  
  function goToPage(pageNum: number) {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('offset', String((pageNum - 1) * limit));
    goto(`/insights/search?${params.toString()}`);
  }
  
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }
  
  function toggleColumn(columnKey: string) {
    if (selectedColumns.includes(columnKey)) {
      selectedColumns = selectedColumns.filter(c => c !== columnKey);
    } else {
      selectedColumns = [...selectedColumns, columnKey];
    }
  }
  
  function applyColumns() {
    showColumnSelector = false;
    handleSearch();
  }
  
  function resetColumns() {
    selectedColumns = data.availableColumns.filter(c => c.default).map(c => c.key);
  }
  
  function loadFilterView(view: FilterView) {
    query = view.filters.query || '';
    selectedSentiment = view.filters.sentiment || '';
    startDate = view.filters.startDate || '';
    endDate = view.filters.endDate || '';
    selectedColumns = [...view.columns];
    
    const params = new URLSearchParams();
    if (view.filters.query) params.set('q', view.filters.query);
    if (view.filters.sentiment) params.set('sentiment', view.filters.sentiment);
    if (view.filters.startDate) params.set('startDate', view.filters.startDate);
    if (view.filters.endDate) params.set('endDate', view.filters.endDate);
    if (view.columns.length > 0) params.set('columns', view.columns.join(','));
    params.set('viewId', view.id);
    
    goto(`/insights/search?${params.toString()}`);
  }
  
  function openSaveViewModal(existingView?: FilterView) {
    if (existingView) {
      saveViewName = existingView.name;
      saveViewIsDefault = existingView.isDefault;
      editingViewId = existingView.id;
    } else {
      saveViewName = '';
      saveViewIsDefault = false;
      editingViewId = null;
    }
    saveViewError = null;
    showSaveViewModal = true;
  }
  
  async function handleSaveView() {
    if (!saveViewName.trim()) {
      saveViewError = 'View name is required';
      return;
    }
    
    saveViewLoading = true;
    saveViewError = null;
    
    try {
      const formData = new FormData();
      formData.append('viewName', saveViewName.trim());
      formData.append('viewId', editingViewId || '0');
      formData.append('columns', JSON.stringify(selectedColumns));
      formData.append('filters', JSON.stringify({
        query: query || undefined,
        sentiment: selectedSentiment || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }));
      formData.append('isDefault', String(saveViewIsDefault));
      
      const response = await fetch('?/saveView', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.type === 'failure') {
        saveViewError = result.data?.error || 'Failed to save view';
      } else {
        showSaveViewModal = false;
        invalidateAll();
      }
    } catch {
      saveViewError = 'Failed to save view';
    } finally {
      saveViewLoading = false;
    }
  }
  
  async function handleDeleteView(viewId: string) {
    if (!confirm('Are you sure you want to delete this view?')) {
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('viewId', viewId);
      
      const response = await fetch('?/deleteView', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.type !== 'failure') {
        invalidateAll();
      }
    } catch (e) {
      console.error('Failed to delete view:', e);
    }
  }
  
  const hasActiveFilters = $derived(
    !!query || !!selectedSentiment || !!startDate || !!endDate
  );
  
  const hasColumnChanges = $derived(
    selectedColumns.join(',') !== data.availableColumns.filter(c => c.default).map(c => c.key).join(',')
  );
</script>

<svelte:head>
  <title>Search Insights | Insights</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <nav class="text-sm text-text-secondary mb-1">
        <a href="/insights" class="hover:text-text-primary">Insights</a>
        <span class="mx-2">/</span>
        <span>Search</span>
      </nav>
      <h1 class="text-2xl font-bold text-text-primary">Search Insights</h1>
    </div>
  </div>

  <!-- Saved Views -->
  {#if data.filterViews.length > 0}
    <Card>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-text-primary">Saved Views</h3>
        <Button variant="ghost" size="sm" onclick={() => openSaveViewModal()}>
          <BookmarkPlus class="w-4 h-4 mr-1" />
          Save Current View
        </Button>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each data.filterViews as view}
          <div class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors {data.selectedViewId === view.id ? 'bg-primary-500/20 border-primary-400 text-text-primary' : 'border-border hover:border-primary-400'}">
            <button
              type="button"
              onclick={() => loadFilterView(view)}
              class="flex items-center gap-1"
            >
              {#if view.isDefault}
                <Star class="w-3 h-3 fill-current" />
              {/if}
              <span class="text-sm">{view.name}</span>
            </button>
            {#if view.isOwner}
              <button
                type="button"
                onclick={() => openSaveViewModal(view)}
                class="p-0.5 hover:text-text-primary text-text-secondary"
                title="Edit view"
              >
                <Columns class="w-3 h-3" />
              </button>
              <button
                type="button"
                onclick={() => handleDeleteView(view.id)}
                class="p-0.5 hover:text-error text-text-secondary"
                title="Delete view"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <!-- Search Box -->
  <Card>
    <div class="space-y-4">
      <!-- Main Search -->
      <div class="flex gap-3 flex-wrap">
        <div class="relative flex-1 min-w-[200px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            bind:value={query}
            onkeydown={handleKeyDown}
            class="input w-full pl-10"
            placeholder="Search by name or phone number..."
          />
        </div>
        <Button variant="secondary" onclick={() => showFilters = !showFilters}>
          <Filter class="w-4 h-4 mr-2" />
          Filters
          {#if hasActiveFilters}
            <span class="ml-2 w-2 h-2 bg-primary-400 rounded-full"></span>
          {/if}
        </Button>
        <Button variant="secondary" onclick={() => showColumnSelector = !showColumnSelector}>
          <Columns class="w-4 h-4 mr-2" />
          Columns
          {#if hasColumnChanges}
            <span class="ml-2 w-2 h-2 bg-primary-400 rounded-full"></span>
          {/if}
        </Button>
        <Button variant="primary" onclick={handleSearch}>
          <Search class="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <!-- Column Selector -->
      {#if showColumnSelector}
        <div class="pt-4 border-t border-border">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-text-primary">Select Columns</h4>
            <div class="flex gap-2">
              <Button variant="ghost" size="sm" onclick={resetColumns}>
                Reset
              </Button>
              <Button variant="primary" size="sm" onclick={applyColumns}>
                Apply
              </Button>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each data.availableColumns as column}
              <button
                type="button"
                onclick={() => toggleColumn(column.key)}
                class="px-3 py-1.5 text-sm rounded border transition-colors flex items-center gap-2 {selectedColumns.includes(column.key) ? 'bg-primary-500/20 border-primary-400 text-text-primary' : 'border-border hover:border-primary-400 text-text-secondary'}"
              >
                {#if selectedColumns.includes(column.key)}
                  <Check class="w-3 h-3" />
                {/if}
                {column.label}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Filters Panel -->
      {#if showFilters}
        <div class="pt-4 border-t border-border">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Sentiment Filter -->
            <div>
              <label for="sentiment-filter" class="block text-sm font-medium text-text-secondary mb-1">Sentiment</label>
              <select
                id="sentiment-filter"
                bind:value={selectedSentiment}
                class="input w-full"
              >
                <option value="">All</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>

            <!-- Date Range -->
            <div>
              <label for="start-date" class="block text-sm font-medium text-text-secondary mb-1">From Date</label>
              <input
                id="start-date"
                type="date"
                bind:value={startDate}
                class="input w-full"
              />
            </div>

            <div>
              <label for="end-date" class="block text-sm font-medium text-text-secondary mb-1">To Date</label>
              <input
                id="end-date"
                type="date"
                bind:value={endDate}
                class="input w-full"
              />
            </div>

            <!-- Clear Filters -->
            <div class="flex items-end">
              <Button variant="ghost" onclick={clearFilters} disabled={!hasActiveFilters}>
                <X class="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Facets / Quick Filters -->
      {#if data.facets?.sentiments}
        <div class="flex flex-wrap gap-2 pt-4 border-t border-border">
          <span class="text-sm text-text-secondary mr-2">Quick filters:</span>
          {#each Object.entries(data.facets.sentiments) as [sentiment, count]}
            {@const SentimentIcon = getSentimentIcon(sentiment as 'positive' | 'neutral' | 'negative')}
            <button
              type="button"
              onclick={() => { selectedSentiment = sentiment; handleSearch(); }}
              class="px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 {selectedSentiment === sentiment ? 'bg-primary-500/20 border-primary-400' : 'border-border hover:border-primary-400'}"
            >
              <SentimentIcon class="w-3 h-3 {getSentimentColor(sentiment as 'positive' | 'neutral' | 'negative')}" />
              {sentiment} ({count})
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </Card>

  <!-- Results -->
  <div class="flex items-center justify-between">
    <p class="text-sm text-text-secondary">
      {#if data.total > 0}
        Showing {offset + 1}-{Math.min(offset + limit, data.total)} of {data.total} results
      {:else}
        No results found
      {/if}
    </p>
    {#if hasActiveFilters || hasColumnChanges}
      <Button variant="ghost" size="sm" onclick={() => openSaveViewModal()}>
        <Save class="w-4 h-4 mr-1" />
        Save View
      </Button>
    {/if}
  </div>

  {#if data.results.length > 0}
    <div class="space-y-4">
      {#each data.results as result}
        {@const SentimentIcon = getSentimentIcon(result.sentiment)}
        <a href="/insights/{result.id}" class="block">
          <Card class="hover:border-primary-500/50 transition-colors">
            <div class="space-y-3">
              <!-- Header -->
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-center gap-3">
                  {#if selectedColumns.includes('direction')}
                    <div class="p-2 bg-bg-secondary rounded">
                      {#if result.direction === 'Inbound'}
                        <ArrowDownLeft class="w-4 h-4 text-green-400" />
                      {:else}
                        <ArrowUpRight class="w-4 h-4 text-text-primary" />
                      {/if}
                    </div>
                  {/if}
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      {#if selectedColumns.includes('name')}
                        <span class="font-medium text-text-primary">{result.name}</span>
                      {/if}
                      {#if selectedColumns.includes('sentiment')}
                        <Badge variant={getSentimentBadgeVariant(result.sentiment)}>
                          <SentimentIcon class="w-3 h-3 mr-1" />
                          {#if selectedColumns.includes('sentimentScore')}
                            {result.sentimentScore}%
                          {:else}
                            {result.sentiment}
                          {/if}
                        </Badge>
                      {/if}
                      {#if selectedColumns.includes('status') && result.status}
                        <Badge variant={result.status === 'Completed' ? 'success' : result.status === 'Processing' ? 'warning' : 'neutral'}>
                          {result.status}
                        </Badge>
                      {/if}
                    </div>
                    <div class="flex items-center gap-3 text-sm text-text-secondary flex-wrap">
                      {#if selectedColumns.includes('phoneNumber') && result.phoneNumber}
                        <span class="flex items-center gap-1">
                          <Phone class="w-3 h-3" />
                          {result.phoneNumber}
                        </span>
                      {/if}
                      {#if selectedColumns.includes('duration')}
                        <span class="flex items-center gap-1">
                          <Clock class="w-3 h-3" />
                          {formatDuration(result.duration)}
                        </span>
                      {/if}
                      {#if selectedColumns.includes('agentName') && result.agentName && result.agentName !== 'Unknown'}
                        <span>Agent: {result.agentName}</span>
                      {/if}
                      {#if selectedColumns.includes('groupName') && result.groupName}
                        <span>Group: {result.groupName}</span>
                      {/if}
                    </div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  {#if selectedColumns.includes('timestamp')}
                    <p class="text-sm text-text-secondary">{formatDate(result.timestamp)}</p>
                  {/if}
                  <Button variant="ghost" size="sm" href="/insights/{result.id}" onclick={(e: MouseEvent) => e.stopPropagation()}>
                    View Details
                    <ArrowRight class="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <!-- Summary -->
              {#if selectedColumns.includes('summary') && result.summary}
                <div class="bg-bg-secondary rounded p-3">
                  <p class="text-sm text-text-secondary line-clamp-2">{result.summary}</p>
                </div>
              {/if}
            </div>
          </Card>
        </a>
      {/each}
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-center gap-2 mt-6">
        <Button
          variant="secondary"
          size="sm"
          onclick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft class="w-4 h-4" />
        </Button>

        {#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum = i + 1;
          if (totalPages > 5) {
            if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
          }
          return pageNum;
        }) as pageNum}
          <button
            type="button"
            onclick={() => goToPage(pageNum)}
            class="px-3 py-1 text-sm rounded transition-colors {pageNum === currentPage ? 'bg-primary-500 text-white' : 'hover:bg-bg-secondary'}"
          >
            {pageNum}
          </button>
        {/each}

        <Button
          variant="secondary"
          size="sm"
          onclick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    {/if}
  {:else if hasActiveFilters}
    <Card>
      <div class="text-center py-12">
        <Search class="w-12 h-12 mx-auto mb-4 text-text-secondary opacity-50" />
        <p class="text-text-secondary">No results match your search criteria.</p>
        <Button variant="ghost" onclick={clearFilters} class="mt-4">
          Clear Filters
        </Button>
      </div>
    </Card>
  {:else}
    <Card>
      <div class="text-center py-12">
        <Search class="w-12 h-12 mx-auto mb-4 text-text-secondary opacity-50" />
        <p class="text-text-secondary">Enter a search term to find insights.</p>
        <p class="text-sm text-text-secondary mt-2">
          Search by insight name or phone number.
        </p>
      </div>
    </Card>
  {/if}
</div>

<!-- Save View Modal -->
{#if showSaveViewModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-bg-primary border border-border rounded-lg shadow-xl max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-text-primary mb-4">
          {editingViewId ? 'Edit View' : 'Save View'}
        </h3>
        
        {#if saveViewError}
          <div class="bg-error/10 border border-error/20 text-error rounded-base p-3 mb-4 text-sm">
            {saveViewError}
          </div>
        {/if}
        
        <div class="space-y-4">
          <div>
            <label for="view-name" class="block text-sm font-medium text-text-secondary mb-1">View Name</label>
            <input
              id="view-name"
              type="text"
              bind:value={saveViewName}
              class="input w-full"
              placeholder="e.g., Negative Support Calls"
            />
          </div>
          
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={saveViewIsDefault}
              class="w-4 h-4 rounded border-border"
            />
            <span class="text-sm text-text-primary">Set as default view</span>
          </label>
          
          <div class="bg-bg-secondary rounded-base p-3">
            <p class="text-sm text-text-secondary mb-2">This view will save:</p>
            <ul class="text-sm text-text-primary space-y-1">
              <li>• {selectedColumns.length} columns selected</li>
              {#if query}
                <li>• Search: "{query}"</li>
              {/if}
              {#if selectedSentiment}
                <li>• Sentiment: {selectedSentiment}</li>
              {/if}
              {#if startDate || endDate}
                <li>• Date range: {startDate || 'Any'} to {endDate || 'Any'}</li>
              {/if}
            </ul>
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onclick={() => showSaveViewModal = false}>
            Cancel
          </Button>
          <Button variant="primary" onclick={handleSaveView} disabled={saveViewLoading}>
            <Save class="w-4 h-4 mr-2" />
            {saveViewLoading ? 'Saving...' : 'Save View'}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
