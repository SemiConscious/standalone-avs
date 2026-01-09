<script lang="ts">
  import { Card, Badge, Button } from '$lib/components/ui';
  import {
    User,
    Phone,
    PhoneCall,
    UsersRound,
    Voicemail,
    Play,
    Shield,
    Mic,
    BarChart3,
    MessageSquare,
    AlertCircle,
    FlaskConical,
    Monitor,
    Smartphone,
  } from 'lucide-svelte';
  import type { UserProfileData } from './+page.server';

  interface Props {
    data: { data: UserProfileData };
  }

  let { data }: Props = $props();
  const profileData = $derived(data.data);

  // License feature icons matching Salesforce style (only 6 icons as shown in the screenshot)
  const licenseFeatures = [
    { key: 'cti' as const, label: 'CTI', icon: Monitor, color: 'bg-green-500' },
    { key: 'pbx' as const, label: 'PBX', icon: Phone, color: 'bg-blue-500' },
    { key: 'manager' as const, label: 'Manager', icon: UsersRound, color: 'bg-purple-500' },
    { key: 'record' as const, label: 'Record', icon: Mic, color: 'bg-red-500' },
    { key: 'pci' as const, label: 'PCI', icon: Shield, color: 'bg-orange-500' },
    { key: 'insights' as const, label: 'Insights', icon: BarChart3, color: 'bg-cyan-500' },
  ];
</script>

<svelte:head>
  <title>User Home | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center gap-3">
    <span class="text-text-secondary text-sm">User Home</span>
    <h1 class="text-xl font-semibold text-text-primary">Natterbox App</h1>
  </div>

  <!-- Demo Mode Banner -->
  {#if profileData.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if profileData.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-lg p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{profileData.error}</p>
    </div>
  {/if}

  {#if profileData.user}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column (2/3 width) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- MY DETAILS Card -->
        <Card padding="none">
          <div class="p-4 border-b border-border">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                  <User class="w-5 h-5 text-text-primary" />
                </div>
                <div>
                  <p class="text-xs text-text-secondary uppercase tracking-wide">MY DETAILS</p>
                  <h2 class="text-lg font-semibold text-text-primary">{profileData.user.name}</h2>
                </div>
              </div>
              
              <!-- License icons -->
              <div class="flex items-center gap-1">
                {#each licenseFeatures as { key, label, icon, color }}
                  {@const enabled = profileData.user.licenses[key]}
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center {enabled ? color : 'bg-gray-300'}"
                    title="{label} - {enabled ? 'enabled' : 'disabled'}"
                  >
                    <svelte:component this={icon} class="w-4 h-4 text-white" />
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div class="p-4">
            <div class="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <span class="text-text-primary font-medium">Mobile Number</span>
              </div>
              <div class="text-text-primary">{profileData.user.mobilePhone || '—'}</div>

              <div>
                <span class="text-text-primary font-medium">Extension Number</span>
              </div>
              <div class="text-text-primary">{profileData.user.extension || '—'}</div>

              <div>
                <span class="text-text-primary font-medium">Home Country</span>
              </div>
              <div class="text-text-primary">{profileData.user.homeCountry || '—'}</div>

              <div>
                <span class="text-text-primary font-medium">Default Voice</span>
              </div>
              <div class="text-text-primary">{profileData.user.defaultVoice || '—'}</div>

              <div>
                <span class="text-text-primary font-medium">My DDI(s)</span>
              </div>
              <div class="text-text-primary">{profileData.ddis.join(' ') || '—'}</div>
            </div>
          </div>
        </Card>

        <!-- MY DEVICES Card -->
        <Card padding="none">
          <div class="p-4 border-b border-border">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Smartphone class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wide">MY DEVICES</p>
              </div>
            </div>
          </div>

          <div class="p-4">
            <p class="text-sm text-text-secondary mb-3">My active inbound numbers</p>
            {#if profileData.activeInboundNumbers.length > 0}
              <div class="space-y-1">
                {#each profileData.activeInboundNumbers as item}
                  <div class="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={item.enabled} disabled class="rounded border-border" />
                    <span class="text-text-primary">{item.number}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-text-secondary text-sm">No active inbound numbers</p>
            {/if}
          </div>
        </Card>

        <!-- MY RECENT CALLS Card -->
        <Card padding="none">
          <div class="p-4 border-b border-border">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <PhoneCall class="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wide">MY RECENT CALLS</p>
                {#if profileData.lastCallDate}
                  <p class="text-text-primary font-medium">Last Call was {profileData.lastCallDate}</p>
                {/if}
              </div>
            </div>
          </div>

          <div class="p-4">
            {#if profileData.recentCalls.length > 0}
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-text-secondary border-b border-border">
                      <th class="pb-2 font-medium">DATE / TIME</th>
                      <th class="pb-2 font-medium">FROM (NUMBER)</th>
                      <th class="pb-2 font-medium">TO (NUMBER)</th>
                      <th class="pb-2 font-medium">DURATION</th>
                      <th class="pb-2 font-medium">DIRECTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each profileData.recentCalls as call}
                      <tr class="border-b border-border/50">
                        <td class="py-2 text-text-primary">{call.dateTime}</td>
                        <td class="py-2 text-text-primary">{call.fromNumber}</td>
                        <td class="py-2 text-text-primary">{call.toNumber}</td>
                        <td class="py-2 text-text-primary">{call.duration}</td>
                        <td class="py-2 text-text-primary">{call.direction}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {:else}
              <p class="text-text-secondary text-center py-4">No recent calls</p>
            {/if}
          </div>
        </Card>
      </div>

      <!-- Right Column (1/3 width) -->
      <div class="space-y-6">
        <!-- MY GROUPS Card -->
        <Card padding="none">
          <div class="p-4 border-b border-border">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <UsersRound class="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wide">MY GROUPS</p>
              </div>
            </div>
          </div>

          <div class="p-4">
            {#if profileData.groups.length > 0}
              <div class="space-y-2">
                {#each profileData.groups as group}
                  <div class="text-sm">
                    <span class="text-text-primary">{group.name}</span>
                    {#if group.isPrimary}
                      <Badge variant="accent" size="sm" class="ml-2">Primary</Badge>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-text-secondary text-sm">No group memberships</p>
            {/if}
          </div>
        </Card>

        <!-- MY VOICE MAILS Card -->
        <Card padding="none">
          <div class="p-4 border-b border-border">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Voicemail class="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p class="text-xs text-text-secondary uppercase tracking-wide">MY VOICE MAILS</p>
              </div>
            </div>
          </div>

          <div class="p-4">
            {#if profileData.voicemails.length > 0}
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-text-secondary border-b border-border">
                      <th class="pb-2 font-medium">ACTION(PLAY)</th>
                      <th class="pb-2 font-medium">DATE / TIME</th>
                      <th class="pb-2 font-medium">DIALLED NUMBER</th>
                      <th class="pb-2 font-medium">DURATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each profileData.voicemails as vm}
                      <tr class="border-b border-border/50">
                        <td class="py-2">
                          {#if vm.canPlay}
                            <button class="text-text-primary hover:text-text-primary-hover">
                              <Play class="w-4 h-4" />
                            </button>
                          {:else}
                            <span class="text-text-secondary">—</span>
                          {/if}
                        </td>
                        <td class="py-2 text-text-primary">{vm.dateTime}</td>
                        <td class="py-2 text-text-primary">{vm.dialledNumber}</td>
                        <td class="py-2 text-text-primary">{vm.duration}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {:else}
              <p class="text-text-secondary text-sm text-center py-4">No voicemails</p>
            {/if}
          </div>
        </Card>
      </div>
    </div>
  {:else}
    <Card class="text-center py-12">
      <User class="w-12 h-12 text-text-secondary mx-auto mb-4" />
      <h2 class="text-lg font-semibold">AVS Profile Not Found</h2>
      <p class="text-text-secondary mt-2">
        Your Salesforce user is not linked to an AVS user profile.
        Please contact your administrator.
      </p>
    </Card>
  {/if}
</div>
