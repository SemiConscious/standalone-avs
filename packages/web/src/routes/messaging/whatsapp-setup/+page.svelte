<script lang="ts">
  import { Card, Button } from '$lib/components/ui';
  import { ArrowLeft, Construction, Send, Link, CheckCircle, MessageCircle } from 'lucide-svelte';
</script>

<svelte:head>
  <title>WhatsApp Setup | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div>
    <nav class="text-sm text-text-secondary mb-2">
      <a href="/messaging" class="hover:text-primary-400 inline-flex items-center gap-1">
        <ArrowLeft class="w-4 h-4" />
        Back to Messaging
      </a>
    </nav>
    <h1 class="text-2xl font-bold text-text-primary">WhatsApp Business Setup</h1>
    <p class="text-text-secondary mt-1">Connect your WhatsApp Business account</p>
  </div>

  <!-- Coming Soon -->
  <Card>
    <div class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-6">
        <Construction class="w-8 h-8 text-warning" />
      </div>
      <h2 class="text-xl font-semibold text-text-primary mb-2">WhatsApp Integration Coming Soon</h2>
      <p class="text-text-secondary max-w-md mx-auto mb-6">
        The WhatsApp Business integration wizard is currently being developed. This will guide you 
        through connecting your WhatsApp Business account with Natterbox for seamless messaging.
      </p>
      <Button variant="secondary" href="/messaging">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back to Messaging
      </Button>
    </div>
  </Card>

  <!-- Setup Steps Preview -->
  <Card>
    <h2 class="text-lg font-semibold text-text-primary mb-4">Setup Process Preview</h2>
    <div class="space-y-4">
      <div class="flex items-start gap-4 p-4 bg-bg-secondary rounded-base opacity-50">
        <div class="w-8 h-8 bg-green-600/10 rounded-full flex items-center justify-center flex-shrink-0">
          <span class="text-green-600 font-semibold">1</span>
        </div>
        <div>
          <h3 class="font-medium text-text-primary">Connect WhatsApp Business Account</h3>
          <p class="text-sm text-text-secondary mt-1">Link your Meta Business account with Natterbox</p>
        </div>
      </div>
      <div class="flex items-start gap-4 p-4 bg-bg-secondary rounded-base opacity-50">
        <div class="w-8 h-8 bg-green-600/10 rounded-full flex items-center justify-center flex-shrink-0">
          <span class="text-green-600 font-semibold">2</span>
        </div>
        <div>
          <h3 class="font-medium text-text-primary">Verify Phone Number</h3>
          <p class="text-sm text-text-secondary mt-1">Confirm the phone number for WhatsApp messaging</p>
        </div>
      </div>
      <div class="flex items-start gap-4 p-4 bg-bg-secondary rounded-base opacity-50">
        <div class="w-8 h-8 bg-green-600/10 rounded-full flex items-center justify-center flex-shrink-0">
          <span class="text-green-600 font-semibold">3</span>
        </div>
        <div>
          <h3 class="font-medium text-text-primary">Configure Message Templates</h3>
          <p class="text-sm text-text-secondary mt-1">Set up approved templates for outbound messaging</p>
        </div>
      </div>
      <div class="flex items-start gap-4 p-4 bg-bg-secondary rounded-base opacity-50">
        <div class="w-8 h-8 bg-green-600/10 rounded-full flex items-center justify-center flex-shrink-0">
          <span class="text-green-600 font-semibold">4</span>
        </div>
        <div>
          <h3 class="font-medium text-text-primary">Test & Go Live</h3>
          <p class="text-sm text-text-secondary mt-1">Send a test message and activate WhatsApp messaging</p>
        </div>
      </div>
    </div>
  </Card>
</div>
