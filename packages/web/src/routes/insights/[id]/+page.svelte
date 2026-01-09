<script lang="ts">
  import { Card, Badge, Button } from '$lib/components/ui';
  import { 
    ArrowLeft, 
    Clock, 
    Phone, 
    Users, 
    Building2, 
    User, 
    UserCircle,
    Star,
    TrendingUp,
    TrendingDown,
    Minus,
    FlaskConical,
    AlertCircle,
    Tag,
    ArrowUpRight,
    ArrowDownLeft,
    FileText,
  } from 'lucide-svelte';
  import type { InsightDetailPageData, AIInsightDetail } from './+page.server';

  interface Props {
    data: InsightDetailPageData;
  }

  let { data }: Props = $props();

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  }

  function formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function formatRating(rating: number): string {
    return rating ? rating.toFixed(1) : '—';
  }

  function getSentimentFromRating(rating: number): 'positive' | 'neutral' | 'negative' {
    if (rating >= 4) return 'positive';
    if (rating >= 2.5) return 'neutral';
    return 'negative';
  }

  function getSentimentIcon(sentiment: 'positive' | 'neutral' | 'negative') {
    switch (sentiment) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      default: return Minus;
    }
  }

  function getSentimentBadgeVariant(sentiment: 'positive' | 'neutral' | 'negative'): 'success' | 'error' | 'neutral' {
    switch (sentiment) {
      case 'positive': return 'success';
      case 'negative': return 'error';
      default: return 'neutral';
    }
  }

  function getRatingColor(rating: number): string {
    if (rating >= 4) return 'text-success';
    if (rating >= 2.5) return 'text-warning';
    return 'text-error';
  }

  const sentiment = $derived(getSentimentFromRating(data.insight.overallRating));
  const SentimentIcon = $derived(getSentimentIcon(sentiment));
</script>

<svelte:head>
  <title>{data.insight.name} | Insights</title>
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
  <div class="flex items-start justify-between gap-4">
    <div>
      <nav class="text-sm text-text-secondary mb-2">
        <a href="/insights" class="hover:text-text-primary inline-flex items-center gap-1">
          <ArrowLeft class="w-4 h-4" />
          Back to Insights
        </a>
      </nav>
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-2xl font-bold text-text-primary">{data.insight.name}</h1>
        <Badge variant={getSentimentBadgeVariant(sentiment)}>
          <svelte:component this={SentimentIcon} class="w-3 h-3 mr-1" />
          {sentiment}
        </Badge>
        {#if data.insight.transcriptStatus === 'Completed' || data.insight.transcriptStatus === 'Complete'}
          <Badge variant="success">Completed</Badge>
        {:else if data.insight.transcriptStatus === 'Processing' || data.insight.transcriptStatus === 'In Progress'}
          <Badge variant="warning">Processing</Badge>
        {:else}
          <Badge variant="neutral">{data.insight.transcriptStatus}</Badge>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main Content Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left Column - Summary -->
    <div class="lg:col-span-2 space-y-6">
      <!-- Summary Card -->
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
          <FileText class="w-5 h-5 text-text-primary" />
          Call Summary
        </h2>
        <p class="text-text-secondary leading-relaxed">{data.insight.summary}</p>
        
        <!-- Categories / Tags -->
        {#if data.insight.categories.length > 0}
          <div class="mt-4 pt-4 border-t border-border">
            <div class="flex items-center gap-2 flex-wrap">
              <Tag class="w-4 h-4 text-text-secondary" />
              {#each data.insight.categories as category}
                <span class="px-2 py-1 text-xs bg-primary-500/10 text-text-primary rounded">
                  {category}
                </span>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Wrapups -->
        {#if data.insight.wrapups.length > 0}
          <div class="mt-4 pt-4 border-t border-border">
            <p class="text-sm text-text-secondary mb-2">Wrap-up Codes:</p>
            <div class="flex gap-2 flex-wrap">
              {#each data.insight.wrapups as wrapup}
                <Badge variant="neutral">{wrapup}</Badge>
              {/each}
            </div>
          </div>
        {/if}
      </Card>
    </div>

    <!-- Right Column - Details & Ratings -->
    <div class="space-y-6">
      <!-- Call Details Card -->
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-4">Call Details</h2>
        <div class="space-y-4">
          <!-- Date/Time -->
          <div class="flex items-center gap-3">
            <Clock class="w-5 h-5 text-text-secondary" />
            <div>
              <p class="text-sm text-text-secondary">Date & Time</p>
              <p class="text-text-primary">{formatDate(data.insight.startTime)}</p>
            </div>
          </div>
          
          <!-- Duration -->
          <div class="flex items-center gap-3">
            <Phone class="w-5 h-5 text-text-secondary" />
            <div>
              <p class="text-sm text-text-secondary">Duration</p>
              <p class="text-text-primary">{formatDuration(data.insight.duration)}</p>
            </div>
          </div>
          
          <!-- Direction -->
          <div class="flex items-center gap-3">
            {#if data.insight.direction === 'Inbound'}
              <ArrowDownLeft class="w-5 h-5 text-success" />
            {:else}
              <ArrowUpRight class="w-5 h-5 text-text-primary" />
            {/if}
            <div>
              <p class="text-sm text-text-secondary">Direction</p>
              <p class="text-text-primary">{data.insight.direction}</p>
            </div>
          </div>
          
          <!-- Phone Number -->
          {#if data.insight.phoneNumber}
            <div class="flex items-center gap-3">
              <Phone class="w-5 h-5 text-text-secondary" />
              <div>
                <p class="text-sm text-text-secondary">Phone Number</p>
                <p class="text-text-primary">{data.insight.phoneNumber}</p>
              </div>
            </div>
          {/if}
          
          <!-- Agent -->
          {#if data.insight.agentName && data.insight.agentName !== 'Unknown'}
            <div class="flex items-center gap-3">
              <Users class="w-5 h-5 text-text-secondary" />
              <div>
                <p class="text-sm text-text-secondary">Agent</p>
                <p class="text-text-primary">{data.insight.agentName}</p>
              </div>
            </div>
          {/if}
          
          <!-- Group -->
          {#if data.insight.groupName}
            <div class="flex items-center gap-3">
              <Users class="w-5 h-5 text-text-secondary" />
              <div>
                <p class="text-sm text-text-secondary">Group</p>
                <p class="text-text-primary">{data.insight.groupName}</p>
              </div>
            </div>
          {/if}
        </div>
        
        <!-- Related Records -->
        {#if data.insight.account || data.insight.contact || data.insight.lead}
          <div class="mt-4 pt-4 border-t border-border space-y-3">
            <p class="text-sm font-medium text-text-secondary">Related Records</p>
            
            {#if data.insight.account}
              <div class="flex items-center gap-2">
                <Building2 class="w-4 h-4 text-text-secondary" />
                <span class="text-text-primary">{data.insight.account.name}</span>
              </div>
            {/if}
            
            {#if data.insight.contact}
              <div class="flex items-center gap-2">
                <User class="w-4 h-4 text-text-secondary" />
                <span class="text-text-primary">{data.insight.contact.name}</span>
              </div>
            {/if}
            
            {#if data.insight.lead}
              <div class="flex items-center gap-2">
                <UserCircle class="w-4 h-4 text-text-secondary" />
                <span class="text-text-primary">{data.insight.lead.name}</span>
              </div>
            {/if}
          </div>
        {/if}
      </Card>

      <!-- Ratings Card -->
      <Card>
        <h2 class="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Star class="w-5 h-5 text-warning fill-warning" />
          AI Ratings
        </h2>
        
        <!-- Overall Rating -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center gap-2">
            <span class="text-4xl font-bold {getRatingColor(data.insight.overallRating)}">
              {formatRating(data.insight.overallRating)}
            </span>
            <span class="text-text-secondary">/ 5.0</span>
          </div>
          <p class="text-sm text-text-secondary mt-1">Overall Rating</p>
        </div>
        
        <!-- Individual Ratings -->
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-text-secondary">Call Quality</span>
              <span class="{getRatingColor(data.insight.ratings.callQuality)} font-medium">
                {formatRating(data.insight.ratings.callQuality)}
              </span>
            </div>
            <div class="h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-500 rounded-full transition-all" 
                style="width: {(data.insight.ratings.callQuality / 5) * 100}%"
              ></div>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-text-secondary">Customer Experience</span>
              <span class="{getRatingColor(data.insight.ratings.customerExperience)} font-medium">
                {formatRating(data.insight.ratings.customerExperience)}
              </span>
            </div>
            <div class="h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-500 rounded-full transition-all" 
                style="width: {(data.insight.ratings.customerExperience / 5) * 100}%"
              ></div>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-text-secondary">Agent Knowledge</span>
              <span class="{getRatingColor(data.insight.ratings.agentKnowledge)} font-medium">
                {formatRating(data.insight.ratings.agentKnowledge)}
              </span>
            </div>
            <div class="h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-500 rounded-full transition-all" 
                style="width: {(data.insight.ratings.agentKnowledge / 5) * 100}%"
              ></div>
            </div>
          </div>
          
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-text-secondary">Politeness</span>
              <span class="{getRatingColor(data.insight.ratings.politeness)} font-medium">
                {formatRating(data.insight.ratings.politeness)}
              </span>
            </div>
            <div class="h-2 bg-bg-secondary rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-500 rounded-full transition-all" 
                style="width: {(data.insight.ratings.politeness / 5) * 100}%"
              ></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</div>
