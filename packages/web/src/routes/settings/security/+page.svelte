<script lang="ts">
  import { Card, Button, Badge } from '$lib/components/ui';
  import { Shield, Key, Smartphone, Clock, Save } from 'lucide-svelte';

  let twoFactorEnabled = $state(false);
  let sessionTimeout = $state('30');
  let ipRestrictions = $state(false);

  const sessions = [
    {
      id: '1',
      device: 'Chrome on MacOS',
      location: 'San Francisco, CA',
      lastActive: 'Current session',
      current: true,
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'San Francisco, CA',
      lastActive: '2 hours ago',
      current: false,
    },
    {
      id: '3',
      device: 'Firefox on Windows',
      location: 'New York, NY',
      lastActive: '1 day ago',
      current: false,
    },
  ];
</script>

<svelte:head>
  <title>Security Settings | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6 max-w-3xl">
  <!-- Page Header -->
  <div>
    <h1 class="text-2xl font-bold">Security Settings</h1>
    <p class="text-text-secondary mt-1">Manage security and authentication options</p>
  </div>

  <!-- Two-Factor Authentication -->
  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        <Smartphone class="w-5 h-5 text-text-primary" />
        <h2 class="font-semibold">Two-Factor Authentication</h2>
      </div>
    {/snippet}

    <div class="flex items-center justify-between">
      <div>
        <p class="text-text-primary">Enable 2FA</p>
        <p class="text-sm text-text-secondary">
          Add an extra layer of security to your account
        </p>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" bind:checked={twoFactorEnabled} class="sr-only peer" />
        <div
          class="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"
        ></div>
      </label>
    </div>

    {#if twoFactorEnabled}
      <div class="mt-4 p-4 bg-bg-secondary rounded-base">
        <p class="text-sm text-text-secondary">
          Two-factor authentication is enabled. You'll be asked to enter a code from your
          authenticator app when signing in.
        </p>
      </div>
    {/if}
  </Card>

  <!-- Session Settings -->
  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        <Clock class="w-5 h-5 text-text-primary" />
        <h2 class="font-semibold">Session Settings</h2>
      </div>
    {/snippet}

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-primary mb-1.5">Session Timeout</label>
        <select
          bind:value={sessionTimeout}
          class="w-full px-3 py-2 bg-bg-primary border border-border rounded-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="480">8 hours</option>
        </select>
        <p class="mt-1 text-sm text-text-secondary">
          Automatically sign out after inactivity
        </p>
      </div>

      <label class="flex items-center justify-between cursor-pointer">
        <div>
          <p class="font-medium">IP Address Restrictions</p>
          <p class="text-sm text-text-secondary">Only allow access from specific IP addresses</p>
        </div>
        <input
          type="checkbox"
          bind:checked={ipRestrictions}
          class="w-5 h-5 rounded border-border text-text-primary focus:ring-accent"
        />
      </label>
    </div>
  </Card>

  <!-- Active Sessions -->
  <Card>
    {#snippet header()}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Key class="w-5 h-5 text-text-primary" />
          <h2 class="font-semibold">Active Sessions</h2>
        </div>
        <Button variant="ghost" size="sm" class="text-error">
          Sign out all devices
        </Button>
      </div>
    {/snippet}

    <div class="space-y-3">
      {#each sessions as session}
        <div class="flex items-center justify-between p-3 bg-bg-secondary rounded-base">
          <div>
            <p class="font-medium flex items-center gap-2">
              {session.device}
              {#if session.current}
                <Badge variant="success" size="sm">Current</Badge>
              {/if}
            </p>
            <p class="text-sm text-text-secondary">
              {session.location} • {session.lastActive}
            </p>
          </div>
          {#if !session.current}
            <Button variant="ghost" size="sm" class="text-error">
              Revoke
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  </Card>

  <!-- Save Button -->
  <div class="flex justify-end">
    <Button variant="primary">
      <Save class="w-4 h-4 mr-2" />
      Save Changes
    </Button>
  </div>
</div>

