<script lang="ts">
  import { Card, Badge, Button } from '$lib/components/ui';
  import { Bot, Search, Play, FileText, BarChart3, FlaskConical, AlertCircle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-svelte';
  import type { AIAdvisorPageData, AIInsight } from './+page.server';

  interface Props {
    data: AIAdvisorPageData;
  }

  let { data }: Props = $props();

  function formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  }

  function getSentimentIcon(sentiment: AIInsight['sentiment']) {
    switch (sentiment) {
      case 'positive':
        return TrendingUp;
      case 'negative':
        return TrendingDown;
      default:
        return Minus;
    }
  }

  function getSentimentColor(sentiment: AIInsight['sentiment']): string {
    switch (sentiment) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-error';
      default:
        return 'text-text-secondary';
    }
  }

  function getSentimentBadgeVariant(sentiment: AIInsight['sentiment']): 'success' | 'error' | 'neutral' {
    switch (sentiment) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      default:
        return 'neutral';
    }
  }
</script>

<svelte:head>
  <title>Insights | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold text-text-primary">Insights</h1>
      <p class="text-text-secondary mt-1">AI-powered call insights and transcription analysis</p>
    </div>
    <Button variant="primary" href="/insights/search">
      <Search class="w-4 h-4 mr-2" />
      Search Insights
    </Button>
  </div>

  <!-- Stats Overview -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-primary-500/10 rounded-base">
          <Bot class="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.totalInsights.toLocaleString()}</p>
          <p class="text-sm text-text-secondary">Total Insights</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-success/10 rounded-base">
          <FileText class="w-6 h-6 text-success" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.transcriptions.toLocaleString()}</p>
          <p class="text-sm text-text-secondary">Transcriptions</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-warning/10 rounded-base">
          <Play class="w-6 h-6 text-warning" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.processing}</p>
          <p class="text-sm text-text-secondary">Processing</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-purple-500/10 rounded-base">
          <BarChart3 class="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.avgSentimentScore}%</p>
          <p class="text-sm text-text-secondary">Avg Sentiment</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Recent Insights -->
  <Card>
    <h2 class="text-lg font-semibold text-text-primary mb-4">Recent AI Insights</h2>
    {#if data.recentInsights.length > 0}
      <div class="space-y-4">
        {#each data.recentInsights as insight}
          {@const SentimentIcon = getSentimentIcon(insight.sentiment)}
          <a href="/insights/{insight.id}" class="block p-4 bg-bg-secondary rounded-base border border-border hover:border-primary-500/50 transition-colors">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <span class="font-medium text-primary-400">
                    {insight.name}
                  </span>
                  <Badge variant={getSentimentBadgeVariant(insight.sentiment)}>
                    <SentimentIcon class="w-3 h-3 mr-1" />
                    {insight.sentiment}
                  </Badge>
                  {#if insight.transcriptStatus === 'Processing'}
                    <Badge variant="warning">Processing</Badge>
                  {/if}
                </div>
                <p class="text-sm text-text-secondary line-clamp-2">{insight.summary}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                  <span class="flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    {formatDate(insight.createdDate)}
                  </span>
                  {#if insight.score > 0}
                    <span>Score: {insight.score}%</span>
                  {/if}
                </div>
              </div>
              {#if insight.transcriptStatus === 'Completed'}
                <Button variant="ghost" size="sm" href="/call-logs?uuid={insight.uuid}" onclick={(e: MouseEvent) => e.stopPropagation()}>
                  <Play class="w-4 h-4" />
                </Button>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12 text-text-secondary">
        <Bot class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No AI Insights available yet.</p>
        <p class="text-sm mt-2">Insights insights will appear here once calls are processed.</p>
      </div>
    {/if}
  </Card>
</div>
