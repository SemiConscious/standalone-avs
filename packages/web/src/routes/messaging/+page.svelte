<script lang="ts">
  import { Card, Button, Badge } from '$lib/components/ui';
  import { MessageSquare, Settings, FlaskConical, AlertCircle, Send, Phone, CheckCircle, XCircle } from 'lucide-svelte';
  import type { MessagingPageData } from './+page.server';

  interface Props {
    data: MessagingPageData;
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>Natterbox Messaging | Natterbox AVS</title>
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
      <h1 class="text-2xl font-bold">Natterbox Messaging</h1>
      <p class="text-text-secondary mt-1">SMS and WhatsApp messaging configuration</p>
    </div>
    <Button variant="secondary" href="/messaging/settings">
      <Settings class="w-4 h-4 mr-2" />
      Settings
    </Button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-green-500/10 rounded-base">
          <MessageSquare class="w-6 h-6 text-green-500" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.smsSentToday.toLocaleString()}</p>
          <p class="text-sm text-text-secondary">SMS Sent Today</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-blue-500/10 rounded-base">
          <MessageSquare class="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.smsReceivedToday.toLocaleString()}</p>
          <p class="text-sm text-text-secondary">SMS Received</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-green-600/10 rounded-base">
          <Send class="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.whatsappSentToday.toLocaleString()}</p>
          <p class="text-sm text-text-secondary">WhatsApp Sent</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-teal-500/10 rounded-base">
          <Send class="w-6 h-6 text-teal-500" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.whatsappReceivedToday.toLocaleString()}</p>
          <p class="text-sm text-text-secondary">WhatsApp Received</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-accent/10 rounded-base">
          <Phone class="w-6 h-6 text-accent" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.stats.activeNumbers}</p>
          <p class="text-sm text-text-secondary">Active Numbers</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Configuration -->
  <Card>
    <h2 class="text-lg font-semibold mb-4">Messaging Configuration</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-4 border border-border rounded-base">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <MessageSquare class="w-6 h-6 text-green-500" />
            <div>
              <h3 class="font-medium">SMS</h3>
            </div>
          </div>
          {#if data.config.smsEnabled}
            <Badge variant="success">
              <CheckCircle class="w-3 h-3 mr-1" />
              Enabled
            </Badge>
          {:else}
            <Badge variant="neutral">
              <XCircle class="w-3 h-3 mr-1" />
              Disabled
            </Badge>
          {/if}
        </div>
        <p class="text-sm text-text-secondary">
          Send and receive SMS messages through your Natterbox numbers.
        </p>
        {#if data.phoneNumbers.length > 0}
          <div class="mt-4 pt-4 border-t border-border">
            <p class="text-xs font-medium text-text-secondary mb-2">SMS-Enabled Numbers</p>
            <div class="space-y-1">
              {#each data.phoneNumbers.slice(0, 3) as pn}
                <div class="flex items-center justify-between text-sm">
                  <span class="font-mono">{pn.number}</span>
                  <div class="flex items-center gap-1">
                    {#if pn.mmsEnabled}
                      <Badge variant="accent" size="sm">MMS</Badge>
                    {/if}
                  </div>
                </div>
              {/each}
              {#if data.phoneNumbers.length > 3}
                <p class="text-xs text-text-secondary">+{data.phoneNumbers.length - 3} more numbers</p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      <div class="p-4 border border-border rounded-base">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <Send class="w-6 h-6 text-green-600" />
            <div>
              <h3 class="font-medium">WhatsApp</h3>
            </div>
          </div>
          {#if data.config.whatsappEnabled && data.config.whatsappConfigured}
            <Badge variant="success">
              <CheckCircle class="w-3 h-3 mr-1" />
              Enabled
            </Badge>
          {:else if data.config.whatsappConfigured}
            <Badge variant="warning">Configured</Badge>
          {:else}
            <Badge variant="neutral">Not Configured</Badge>
          {/if}
        </div>
        <p class="text-sm text-text-secondary">
          Connect your WhatsApp Business account for messaging.
        </p>
        {#if !data.config.whatsappConfigured}
          <div class="mt-4 pt-4 border-t border-border">
            <Button variant="secondary" size="sm" href="/messaging/whatsapp-setup">
              Configure WhatsApp
            </Button>
          </div>
        {/if}
      </div>
    </div>
  </Card>

  <!-- Phone Numbers with SMS -->
  {#if data.phoneNumbers.length > 0}
    <Card>
      <h2 class="text-lg font-semibold mb-4">SMS-Enabled Phone Numbers</h2>
      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Number</th>
              <th>SMS</th>
              <th>MMS</th>
            </tr>
          </thead>
          <tbody>
            {#each data.phoneNumbers as pn}
              <tr>
                <td>{pn.name}</td>
                <td class="font-mono">{pn.number}</td>
                <td>
                  {#if pn.smsEnabled}
                    <CheckCircle class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-text-secondary" />
                  {/if}
                </td>
                <td>
                  {#if pn.mmsEnabled}
                    <CheckCircle class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-text-secondary" />
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
</div>
