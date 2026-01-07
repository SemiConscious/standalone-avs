<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { Card, Badge, Button, Input } from '$lib/components/ui';
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
  } from 'lucide-svelte';
  import type { SearchPageData } from './+page.server';
  
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
  
  function handleSearch() {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedSentiment && selectedSentiment !== 'all') params.set('sentiment', selectedSentiment);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    goto(`/ai-advisor/search?${params.toString()}`);
  }
  
  function clearFilters() {
    query = '';
    selectedSentiment = '';
    startDate = '';
    endDate = '';
    goto('/ai-advisor/search');
  }
  
  function goToPage(pageNum: number) {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('offset', String((pageNum - 1) * limit));
    goto(`/ai-advisor/search?${params.toString()}`);
  }
  
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }
  
  const hasActiveFilters = $derived(
    !!query || !!selectedSentiment || !!startDate || !!endDate
  );
</script>

<svelte:head>
  <title>Search Insights | AI Advisor</title>
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
        <a href="/ai-advisor" class="hover:text-accent">AI Advisor</a>
        <span class="mx-2">/</span>
        <span>Search</span>
      </nav>
      <h1 class="text-2xl font-bold">Search Insights</h1>
    </div>
  </div>

  <!-- Search Box -->
  <Card>
    <div class="space-y-4">
      <!-- Main Search -->
      <div class="flex gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            bind:value={query}
            onkeydown={handleKeyDown}
            class="input w-full pl-10"
            placeholder="Search transcripts, topics, or keywords..."
          />
        </div>
        <Button variant="secondary" onclick={() => showFilters = !showFilters}>
          <Filter class="w-4 h-4 mr-2" />
          Filters
          {#if hasActiveFilters}
            <span class="ml-2 w-2 h-2 bg-accent rounded-full"></span>
          {/if}
        </Button>
        <Button variant="primary" onclick={handleSearch}>
          <Search class="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      <!-- Filters Panel -->
      {#if showFilters}
        <div class="pt-4 border-t border-border">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Sentiment Filter -->
            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">Sentiment</label>
              <select
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
              <label class="block text-sm font-medium text-text-secondary mb-1">From Date</label>
              <input
                type="date"
                bind:value={startDate}
                class="input w-full"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-text-secondary mb-1">To Date</label>
              <input
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
      {#if data.facets}
        <div class="flex flex-wrap gap-2 pt-4 border-t border-border">
          {#if data.facets.sentiments}
            <span class="text-sm text-text-secondary mr-2">Quick filters:</span>
            {#each Object.entries(data.facets.sentiments) as [sentiment, count]}
              <button
                type="button"
                onclick={() => { selectedSentiment = sentiment; handleSearch(); }}
                class="px-2 py-1 text-xs rounded border border-border hover:border-accent transition-colors flex items-center gap-1"
                class:bg-accent={selectedSentiment === sentiment}
                class:bg-opacity-20={selectedSentiment === sentiment}
              >
                <svelte:component this={getSentimentIcon(sentiment as 'positive' | 'neutral' | 'negative')} class="w-3 h-3 {getSentimentColor(sentiment as 'positive' | 'neutral' | 'negative')}" />
                {sentiment} ({count})
              </button>
            {/each}
          {/if}
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
  </div>

  {#if data.results.length > 0}
    <div class="space-y-4">
      {#each data.results as result}
        {@const SentimentIcon = getSentimentIcon(result.sentiment)}
        <Card class="hover:border-accent transition-colors">
          <div class="space-y-3">
            <!-- Header -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-bg-secondary rounded">
                  {#if result.direction === 'inbound'}
                    <ArrowDownLeft class="w-4 h-4 text-green-400" />
                  {:else}
                    <ArrowUpRight class="w-4 h-4 text-blue-400" />
                  {/if}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium">Call #{result.callId}</span>
                    <Badge variant={getSentimentBadgeVariant(result.sentiment)}>
                      <SentimentIcon class="w-3 h-3 mr-1" />
                      {result.sentimentScore}%
                    </Badge>
                  </div>
                  <div class="flex items-center gap-3 text-sm text-text-secondary">
                    <span class="flex items-center gap-1">
                      <Phone class="w-3 h-3" />
                      {result.phoneNumber || 'Unknown'}
                    </span>
                    <span class="flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      {formatDuration(result.duration)}
                    </span>
                    {#if result.agentName}
                      <span>Agent: {result.agentName}</span>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <p class="text-sm text-text-secondary">{formatDate(result.timestamp)}</p>
                <Button variant="ghost" size="sm" href="/ai-advisor/{result.id}">
                  View Details
                  <ArrowRight class="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <!-- Summary / Transcript Preview -->
            <div class="bg-bg-secondary rounded p-3">
              {#if result.summary}
                <p class="text-sm font-medium mb-1">{result.summary}</p>
              {/if}
              <p class="text-sm text-text-secondary line-clamp-2">{result.transcript}</p>
              
              <!-- Highlights -->
              {#if result.highlights?.length}
                <div class="flex flex-wrap gap-1 mt-2">
                  {#each result.highlights as highlight}
                    <span class="px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-400 rounded">
                      "{highlight}"
                    </span>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Topics -->
            {#if result.topics?.length}
              <div class="flex flex-wrap gap-1">
                {#each result.topics as topic}
                  <button
                    type="button"
                    onclick={() => { query = topic; handleSearch(); }}
                    class="px-2 py-1 text-xs bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                  >
                    #{topic}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </Card>
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
          // Show pages around current page
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
            class="px-3 py-1 text-sm rounded transition-colors"
            class:bg-accent={pageNum === currentPage}
            class:hover:bg-bg-secondary={pageNum !== currentPage}
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
          Search by keywords, topics, or phrases from call transcripts.
        </p>
      </div>
    </Card>
  {/if}
</div>

