<script lang="ts">
  import { Card, Button } from '$lib/components/ui';
  import { ArrowLeft, Construction, Settings, MessageSquare, Send, Bell, Shield } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Messaging Settings | Natterbox AVS</title>
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
    <h1 class="text-2xl font-bold text-text-primary">Messaging Settings</h1>
    <p class="text-text-secondary mt-1">Configure SMS and WhatsApp messaging options</p>
  </div>

  <!-- Coming Soon -->
  <Card>
    <div class="text-center py-16">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-warning/10 rounded-full mb-6">
        <Construction class="w-8 h-8 text-warning" />
      </div>
      <h2 class="text-xl font-semibold text-text-primary mb-2">Settings Configuration Coming Soon</h2>
      <p class="text-text-secondary max-w-md mx-auto mb-6">
        The messaging settings page is currently being developed. This will allow you to configure 
        SMS templates, WhatsApp Business integration, consent management, and notification preferences.
      </p>
      <Button variant="secondary" href="/messaging">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back to Messaging
      </Button>
    </div>
  </Card>

  <!-- Feature Preview -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <MessageSquare class="w-5 h-5 text-green-500" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">SMS Templates</h3>
        <p class="text-sm text-text-secondary">Create reusable message templates</p>
      </div>
    </Card>
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-green-600/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Send class="w-5 h-5 text-green-600" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">WhatsApp Config</h3>
        <p class="text-sm text-text-secondary">Business account integration</p>
      </div>
    </Card>
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Shield class="w-5 h-5 text-primary-400" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Consent Management</h3>
        <p class="text-sm text-text-secondary">GDPR compliance settings</p>
      </div>
    </Card>
    <Card>
      <div class="text-center p-4">
        <div class="w-10 h-10 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Bell class="w-5 h-5 text-info" />
        </div>
        <h3 class="font-medium text-text-primary mb-1">Notifications</h3>
        <p class="text-sm text-text-secondary">Alert preferences</p>
      </div>
    </Card>
  </div>
</div>
