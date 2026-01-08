<script lang="ts">
  import { Card } from '$lib/components/ui';
  import { Sparkles, Construction, ArrowRight } from 'lucide-svelte';
</script>

<svelte:head>
  <title>AI Advisor | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex items-center gap-3">
    <div class="p-3 bg-primary-500/10 rounded-base">
      <Sparkles class="w-6 h-6 text-primary-400" />
    </div>
    <div>
      <h1 class="text-2xl font-bold text-text-primary">AI Advisor</h1>
      <p class="text-text-secondary mt-1">AI-powered assistant for call coaching and analysis</p>
    </div>
  </div>

  <!-- Coming Soon Card -->
  <Card>
    <div class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-6">
        <Construction class="w-8 h-8 text-warning" />
      </div>
      <h2 class="text-xl font-semibold text-text-primary mb-2">Coming Soon</h2>
      <p class="text-text-secondary max-w-md mx-auto mb-6">
        The AI Advisor feature is currently being ported to this application. 
        This interactive assistant will help you analyze calls, provide coaching suggestions, 
        and answer questions about your call data.
      </p>
      <a 
        href="/insights" 
        class="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
      >
        View Call Insights
        <ArrowRight class="w-4 h-4" />
      </a>
    </div>
  </Card>

  <!-- Feature Preview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles class="w-5 h-5 text-primary-400" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Smart Analysis</h3>
        <p class="text-sm text-text-secondary">AI-powered analysis of call transcriptions and patterns</p>
      </div>
    </Card>
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles class="w-5 h-5 text-success" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Coaching Tips</h3>
        <p class="text-sm text-text-secondary">Personalized suggestions to improve call quality</p>
      </div>
    </Card>
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Sparkles class="w-5 h-5 text-info" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Interactive Q&A</h3>
        <p class="text-sm text-text-secondary">Ask questions about your calls and get instant answers</p>
      </div>
    </Card>
  </div>
</div>
