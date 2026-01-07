<script lang="ts">
  import { Card, Badge, Button } from '$lib/components/ui';
  import {
    Users,
    Phone,
    Smartphone,
    UsersRound,
    Workflow,
    Shield,
    Play,
    Square,
    FileText,
    AlertCircle,
    FlaskConical,
    Settings,
    RefreshCw,
    Plus,
    ExternalLink,
    HelpCircle,
    Mail,
    Headphones,
    Mic,
    Monitor,
    ShieldCheck,
    BarChart3,
    Globe,
    Cloud,
    MessageSquare,
    MessageCircle,
    Sparkles,
    Bot,
    Brain,
    PhoneCall,
    PhoneIncoming,
    MessagesSquare,
  } from 'lucide-svelte';
  import type { AdminData } from './+page.server';

  interface Props {
    data: { data: AdminData };
  }

  let { data }: Props = $props();
  const adminData = $derived(data.data);

  // Map icon names to components
  const iconMap: Record<string, typeof Phone> = {
    phone: Phone,
    headset: Headphones,
    mic: Mic,
    monitor: Monitor,
    shield: ShieldCheck,
    chart: BarChart3,
    globe: Globe,
    cloud: Cloud,
    message: MessageSquare,
    whatsapp: MessageCircle,
    sparkles: Sparkles,
    bot: Bot,
    brain: Brain,
    'phone-call': PhoneCall,
    'phone-incoming': PhoneIncoming,
    messages: MessagesSquare,
    'message-circle': MessageCircle,
  };

  // Color mapping for subscription icons
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    fuchsia: 'bg-fuchsia-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    lime: 'bg-lime-500',
    teal: 'bg-teal-500',
    pink: 'bg-pink-500',
  };

  const inventoryItems = $derived([
    { label: 'Natterbox Users', value: adminData.inventory.users, icon: Users, href: '/users', color: 'text-blue-500', bgColor: 'bg-blue-500' },
    { label: 'Phone Numbers', value: adminData.inventory.phoneNumbers, icon: Phone, href: '/phone-numbers', color: 'text-green-500', bgColor: 'bg-green-500' },
    { label: 'Devices', value: adminData.inventory.devices, icon: Smartphone, href: '/devices', color: 'text-red-500', bgColor: 'bg-red-500' },
    { label: 'Groups', value: adminData.inventory.groups, icon: UsersRound, href: '/groups', color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
    { label: 'Routing Policies', value: adminData.inventory.routingPolicies, icon: Workflow, href: '/call-flows', color: 'text-pink-500', bgColor: 'bg-pink-500' },
  ]);
</script>

<svelte:head>
  <title>Admin Home | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-3">
    <span class="text-text-secondary text-sm">Admin Home</span>
    <h1 class="text-xl font-semibold">Natterbox App</h1>
  </div>

  <!-- Demo Mode Banner -->
  {#if adminData.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if adminData.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{adminData.error}</p>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Left Column -->
    <div class="space-y-6">
      <!-- System and Security Card -->
      <Card padding="none">
        <div class="p-4 border-b border-border">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings class="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wide">MONITORING</p>
              <h2 class="text-lg font-semibold">System and Security</h2>
            </div>
          </div>
        </div>

        <div class="p-4 space-y-4">
          <!-- Recording Access -->
          <a href="/recording-access" class="flex items-center justify-between hover:bg-bg-secondary p-2 rounded-lg transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Shield class="w-4 h-4 text-white" />
              </div>
              <span class="text-accent">Recording Access</span>
            </div>
            <span class="text-text-secondary">{adminData.monitoring.recordingAccessCount} profiles</span>
          </a>

          <!-- Event Logs -->
          <a href="/event-logs" class="flex items-center justify-between hover:bg-bg-secondary p-2 rounded-lg transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <FileText class="w-4 h-4 text-white" />
              </div>
              <span class="text-accent">Event Logs</span>
            </div>
            <span class="text-text-secondary">{adminData.monitoring.eventLogsToday} today</span>
          </a>

          <!-- Error Logs -->
          <a href="/error-logs" class="flex items-center justify-between hover:bg-bg-secondary p-2 rounded-lg transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <AlertCircle class="w-4 h-4 text-white" />
              </div>
              <span class="text-accent">Error Logs</span>
            </div>
            <span class="text-text-secondary">{adminData.monitoring.errorLogsToday} today</span>
          </a>

          <!-- Scheduled Jobs Header -->
          <div class="flex items-center justify-between pt-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                <RefreshCw class="w-4 h-4 text-white" />
              </div>
              <span class="text-accent">Scheduled Jobs</span>
            </div>
            <span class="text-text-secondary">{adminData.jobsRunning} jobs running</span>
          </div>

          <!-- Scheduled Jobs List -->
          <div class="space-y-2 pl-11">
            {#each adminData.scheduledJobs as job}
              <div class="flex items-center justify-between py-1">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full {job.isRunning ? 'bg-green-500' : 'bg-gray-300'}"></span>
                  {#if job.isRunning}
                    <button class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors">
                      Stop Job
                    </button>
                  {:else}
                    <button class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors">
                      Start Job
                    </button>
                  {/if}
                  <span class="{job.isRunning ? 'text-text-primary' : 'text-orange-500'} text-sm">
                    {job.name} {job.isRunning ? 'is running' : 'is not running'}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </Card>

      <!-- Summary of Assets Card -->
      <Card padding="none">
        <div class="p-4 border-b border-border">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 class="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p class="text-xs text-text-secondary uppercase tracking-wide">OVERVIEW</p>
              <h2 class="text-lg font-semibold">Summary of Assets</h2>
            </div>
          </div>
        </div>

        <div class="p-4 space-y-3">
          {#each inventoryItems as item}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 {item.bgColor} rounded-full flex items-center justify-center">
                  <svelte:component this={item.icon} class="w-4 h-4 text-white" />
                </div>
                <a href={item.href} class="text-accent hover:underline">{item.label}</a>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-text-primary font-medium">{item.value.toLocaleString()}</span>
                <a href={item.href} class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                  <Plus class="w-4 h-4 text-white" />
                </a>
              </div>
            </div>
          {/each}
        </div>
      </Card>
    </div>

    <!-- Right Column -->
    <div class="space-y-6">
      <!-- Licensing Card -->
      <Card padding="none">
        <div class="p-4 border-b border-border">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText class="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wide">LICENSING</p>
                <h2 class="text-lg font-semibold">Review your Subscriptions</h2>
              </div>
            </div>
            <Button variant="primary" size="sm">
              <RefreshCw class="w-4 h-4 mr-1" />
              Refresh Subscriptions
            </Button>
          </div>
          {#if adminData.subscriptionsUpdated}
            <p class="text-xs text-text-secondary mt-2 text-right">Updated {adminData.subscriptionsUpdated}</p>
          {/if}
        </div>

        <div class="p-4">
          <div class="grid grid-cols-2 gap-3">
            {#each adminData.subscriptions as subscription}
              {@const IconComponent = iconMap[subscription.icon] || Phone}
              <div class="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary">
                <div class="w-8 h-8 {colorMap[subscription.color] || 'bg-gray-500'} rounded-full flex items-center justify-center flex-shrink-0">
                  <svelte:component this={IconComponent} class="w-4 h-4 text-white" />
                </div>
                <div class="min-w-0">
                  <p class="text-accent text-sm truncate">{subscription.name}</p>
                  <p class="text-xs text-text-secondary">
                    Enabled: ({subscription.count.toLocaleString()})
                  </p>
                </div>
              </div>
            {/each}
          </div>

          <div class="mt-4 flex justify-end">
            <Button variant="primary" size="sm">
              <Settings class="w-4 h-4 mr-1" />
              Manage User Licenses
            </Button>
          </div>
        </div>
      </Card>

      <!-- Support Card -->
      <Card padding="none">
        <div class="p-4 border-b border-border">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Phone class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wide">SUPPORT</p>
                <h2 class="text-lg font-semibold">Help</h2>
              </div>
            </div>
            <Button variant="primary" size="sm">
              <ExternalLink class="w-4 h-4 mr-1" />
              Grant Login Access
            </Button>
          </div>
        </div>

        <div class="p-4">
          <p class="text-sm text-text-secondary mb-4">
            Your organization Id is: <span class="font-mono text-text-primary">{adminData.organizationId}</span>
          </p>

          <div class="space-y-3">
            <a 
              href="https://docs.natterbox.com" 
              target="_blank" 
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <HelpCircle class="w-5 h-5 text-blue-600" />
              </div>
              <span class="text-accent">Documentation</span>
            </a>

            <a 
              href="https://success.natterbox.com/s/contactsupport" 
              target="_blank" 
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Mail class="w-5 h-5 text-purple-600" />
              </div>
              <span class="text-accent">Contact Support</span>
            </a>
          </div>
        </div>
      </Card>
    </div>
  </div>
</div>
