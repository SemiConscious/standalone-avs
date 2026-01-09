<script lang="ts">
  import { Card, Badge, Button, Tabs, Toggle, type Tab } from '$lib/components/ui';
  import {
    Users,
    Phone,
    Smartphone,
    UsersRound,
    Workflow,
    Shield,
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
    Activity,
    Loader2,
  } from 'lucide-svelte';
  import { enhance } from '$app/forms';
  import type { AdminData } from './+page.server';

  interface Props {
    data: { data: AdminData };
  }

  let { data }: Props = $props();
  const adminData = $derived(data.data);
  
  // Loading state for license refresh
  let isRefreshing = $state(false);
  
  // Grant Login Access URL
  const grantLoginAccessUrl = $derived(
    adminData.instanceUrl ? `${adminData.instanceUrl}/partnerbt/grantLoginAccess.apexp` : '#'
  );

  // Tab configuration
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'licensing', label: 'Licensing', icon: FileText },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  let activeTab = $state('overview');

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
    { label: 'Natterbox Users', value: adminData.inventory.users, icon: Users, href: '/users', bgColor: 'bg-blue-500' },
    { label: 'Phone Numbers', value: adminData.inventory.phoneNumbers, icon: Phone, href: '/phone-numbers', bgColor: 'bg-green-500' },
    { label: 'Devices', value: adminData.inventory.devices, icon: Smartphone, href: '/devices', bgColor: 'bg-red-500' },
    { label: 'Groups', value: adminData.inventory.groups, icon: UsersRound, href: '/groups', bgColor: 'bg-yellow-500' },
    { label: 'Routing Policies', value: adminData.inventory.routingPolicies, icon: Workflow, href: '/call-flows', bgColor: 'bg-pink-500' },
  ]);

  // Clean up job names (remove "Scheduled Job" suffix)
  function cleanJobName(name: string): string {
    return name.replace(/ Scheduled Job$/, '').replace(/Scheduled Job$/, '');
  }

  // Job control handlers
  let jobsLoading = $state<Set<string>>(new Set());

  async function handleJobToggle(job: typeof adminData.scheduledJobs[0], checked: boolean) {
    jobsLoading = new Set([...jobsLoading, job.id]);
    try {
      // TODO: Call API to start/stop job
      console.log(`${checked ? 'Starting' : 'Stopping'} job:`, job.name);
      // Simulate API delay
      await new Promise(r => setTimeout(r, 1000));
      // In real implementation, this would call the server and refresh data
    } finally {
      jobsLoading = new Set([...jobsLoading].filter(id => id !== job.id));
    }
  }

  // Removed - now using form action
</script>

<svelte:head>
  <title>Admin Home | Natterbox AVS</title>
</svelte:head>

<div class="space-y-3">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <p class="text-text-secondary text-xs uppercase tracking-wide">Admin Home</p>
      <h1 class="text-lg font-semibold text-text-primary">Natterbox App</h1>
    </div>
  </div>

  <!-- Demo Mode Banner -->
  {#if adminData.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-2 flex items-center gap-2 text-sm">
      <FlaskConical class="w-4 h-4 flex-shrink-0" />
      <span>Demo Mode - showing sample data</span>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if adminData.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-lg p-2 flex items-center gap-2 text-sm">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <span>{adminData.error}</span>
    </div>
  {/if}

  <!-- Tabs -->
  <Tabs {tabs} bind:activeTab variant="boxed" size="sm">
    {#if activeTab === 'overview'}
      <!-- Overview Tab -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <!-- Summary of Assets -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <BarChart3 class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-sm text-text-primary">Assets</h3>
            </div>
          {/snippet}

          <div class="space-y-3">
            {#each inventoryItems as item}
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 {item.bgColor} rounded flex items-center justify-center flex-shrink-0">
                    <svelte:component this={item.icon} class="w-3 h-3 text-white" />
                  </div>
                  <a href={item.href} class="text-text-primary hover:text-primary-300 hover:underline text-sm">{item.label}</a>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-text-primary font-medium text-sm">{(item.value ?? 0).toLocaleString()}</span>
                  <a 
                    href="{item.href}/new" 
                    class="w-5 h-5 bg-success rounded flex items-center justify-center hover:bg-green-600 transition-colors"
                    title="Add new"
                  >
                    <Plus class="w-3 h-3 text-white" />
                  </a>
                </div>
              </div>
            {/each}
          </div>
        </Card>

        <!-- System Monitoring -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Activity class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-sm text-text-primary">Monitoring</h3>
            </div>
          {/snippet}

          <div class="space-y-3">
            <a href="/recording-access" class="flex items-center justify-between hover:bg-bg-tertiary rounded-lg transition-colors">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                  <Shield class="w-3 h-3 text-white" />
                </div>
                <span class="text-text-primary hover:text-primary-300 text-sm">Recording Access</span>
              </div>
              <span class="text-text-secondary text-sm">{adminData.monitoring.recordingAccessCount}</span>
            </a>

            <a href="/event-logs" class="flex items-center justify-between hover:bg-bg-tertiary rounded-lg transition-colors">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                  <FileText class="w-3 h-3 text-white" />
                </div>
                <span class="text-text-primary hover:text-primary-300 text-sm">Event Logs</span>
              </div>
              <span class="text-text-secondary text-sm">{adminData.monitoring.eventLogsToday} today</span>
            </a>

            <a href="/error-logs" class="flex items-center justify-between hover:bg-bg-tertiary rounded-lg transition-colors">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                  <AlertCircle class="w-3 h-3 text-white" />
                </div>
                <span class="text-text-primary hover:text-primary-300 text-sm">Error Logs</span>
              </div>
              <span class="{adminData.monitoring.errorLogsToday > 0 ? 'text-error' : 'text-success'} text-sm">
                {adminData.monitoring.errorLogsToday} today
              </span>
            </a>
          </div>
        </Card>

        <!-- Scheduled Jobs -->
        <Card>
          {#snippet header()}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <RefreshCw class="w-4 h-4 text-text-primary" />
                <h3 class="font-semibold text-sm text-text-primary">Jobs</h3>
              </div>
              <Badge variant="success" size="sm">{adminData.jobsRunning} running</Badge>
            </div>
          {/snippet}

          <div class="space-y-3">
            {#each adminData.scheduledJobs as job}
              {@const shouldBeRunning = job.canStart && job.canStop}
              {@const hasError = !job.isRunning && shouldBeRunning}
              <div class="flex items-center justify-between">
                <span class="text-sm truncate pr-2 {job.isRunning ? 'text-text-primary' : hasError ? 'text-error' : 'text-text-secondary'}">
                  {cleanJobName(job.name)}
                </span>
                <Toggle
                  checked={job.isRunning}
                  disabled={jobsLoading.has(job.id)}
                  size="sm"
                  color={job.isRunning ? 'success' : 'primary'}
                  offColor={hasError ? 'error' : 'neutral'}
                  onchange={(e: Event) => handleJobToggle(job, (e.target as { checked: boolean }).checked)}
                />
              </div>
            {/each}
          </div>
        </Card>
      </div>
    {:else if activeTab === 'licensing'}
      <!-- Licensing Tab -->
      <Card>
        {#snippet header()}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <FileText class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-sm text-text-primary">Subscriptions</h3>
            </div>
            <div class="flex items-center gap-2">
              {#if adminData.subscriptionsUpdated}
                <span class="text-xs text-text-secondary">Updated {adminData.subscriptionsUpdated}</span>
              {/if}
              <form 
                method="POST" 
                action="?/refreshLicense" 
                use:enhance={() => {
                  isRefreshing = true;
                  return async ({ update }) => {
                    await update();
                    isRefreshing = false;
                  };
                }}
              >
                <Button variant="primary" size="sm" type="submit" disabled={isRefreshing}>
                  {#if isRefreshing}
                    <Loader2 class="w-3 h-3 mr-1 animate-spin" />
                    Refreshing...
                  {:else}
                    <RefreshCw class="w-3 h-3 mr-1" />
                    Refresh
                  {/if}
                </Button>
              </form>
            </div>
          </div>
        {/snippet}

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {#each adminData.subscriptions as subscription}
            {@const IconComponent = iconMap[subscription.icon] || Phone}
            <div class="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary">
              <div class="w-7 h-7 {colorMap[subscription.color] || 'bg-gray-500'} rounded-full flex items-center justify-center flex-shrink-0">
                <svelte:component this={IconComponent} class="w-3.5 h-3.5 text-white" />
              </div>
              <div class="min-w-0">
                <p class="text-text-primary text-sm font-medium truncate">{subscription.name}</p>
                <p class="text-xs text-text-secondary">
                  {subscription.count.toLocaleString()} enabled
                </p>
              </div>
            </div>
          {/each}
        </div>

        <div class="mt-3 pt-3 border-t border-border flex justify-end">
          <Button variant="primary" size="sm" href="/users">
            <Settings class="w-3 h-3 mr-1" />
            Manage User Licenses
          </Button>
        </div>
      </Card>
    {:else if activeTab === 'support'}
      <!-- Support Tab -->
      <Card>
        {#snippet header()}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <HelpCircle class="w-4 h-4 text-text-primary" />
              <h3 class="font-semibold text-sm text-text-primary">Help & Support</h3>
            </div>
            <a 
              href={grantLoginAccessUrl} 
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-lg transition-all"
            >
              <ExternalLink class="w-3 h-3" />
              Grant Login Access
            </a>
          </div>
        {/snippet}

        <div class="space-y-4">
          <div class="p-3 bg-bg-secondary rounded-lg">
            <p class="text-sm text-text-primary">
              <span class="text-text-secondary">Salesforce Organization ID:</span>
              <code class="font-mono text-text-primary bg-bg-tertiary px-2 py-1 rounded text-xs ml-2">
                {adminData.organizationId}
              </code>
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a 
              href="https://docs.natterbox.com" 
              target="_blank" 
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <HelpCircle class="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p class="text-text-primary font-medium text-sm">Documentation</p>
                <p class="text-xs text-text-secondary">Browse the knowledge base</p>
              </div>
            </a>

            <a 
              href="https://success.natterbox.com/s/contactsupport" 
              target="_blank" 
              rel="noopener noreferrer"
              class="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            >
              <div class="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Mail class="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p class="text-text-primary font-medium text-sm">Contact Support</p>
                <p class="text-xs text-text-secondary">Get help from our team</p>
              </div>
            </a>
          </div>
        </div>
      </Card>
    {/if}
  </Tabs>
</div>
