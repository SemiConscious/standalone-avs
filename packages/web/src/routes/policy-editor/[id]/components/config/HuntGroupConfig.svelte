<script lang="ts">
  import { Badge, Button } from '$lib/components/ui';
  import { Plus, Trash2, Info } from 'lucide-svelte';
  import { 
    CONNECT_TO_OPTIONS,
    CALLER_ID_OPTIONS,
    ACCEPT_KEYS,
    CHIME_FORMAT_OPTIONS,
    HUNT_GROUP_DEFAULTS,
  } from '$lib/policy-editor/defaults';

  interface Props {
    data: Record<string, unknown>;
    onUpdate: (data: Record<string, unknown>) => void;
  }

  let { data, onUpdate }: Props = $props();

  // Initialize config with defaults
  let config = $state({
    trigger: (data.trigger as string[]) || HUNT_GROUP_DEFAULTS.trigger,
    connectType: (data.connectType as string) || HUNT_GROUP_DEFAULTS.connectType,
    connectValue: (data.connectValue as string) || HUNT_GROUP_DEFAULTS.connectValue,
    targets: (data.targets as Array<{ type: string; value: string }>) || HUNT_GROUP_DEFAULTS.targets,
    ringDuration: (data.ringDuration as number) || HUNT_GROUP_DEFAULTS.ringDuration,
    callerIdPresentation: (data.callerIdPresentation as string) || HUNT_GROUP_DEFAULTS.callerIdPresentation,
    customCallerId: (data.customCallerId as string) || HUNT_GROUP_DEFAULTS.customCallerId,
    transferAfterConnect: (data.transferAfterConnect as boolean) ?? HUNT_GROUP_DEFAULTS.transferAfterConnect,
    hangupAfterBridge: (data.hangupAfterBridge as boolean) ?? HUNT_GROUP_DEFAULTS.hangupAfterBridge,
    screen: (data.screen as boolean) ?? HUNT_GROUP_DEFAULTS.screen,
    screenAnnouncement: (data.screenAnnouncement as string) || '',
    screenAcceptKey: (data.screenAcceptKey as string) || '1',
    camp: {
      enabled: (data.camp as { enabled?: boolean })?.enabled ?? false,
      chimeFormat: (data.camp as { chimeFormat?: string })?.chimeFormat || 'BEEP',
      ringDuration: (data.camp as { ringDuration?: number })?.ringDuration || 30,
    },
  });

  let activeTab = $state(0);
  const tabs = ['Connect', 'Advanced', 'Screen', 'Camp'];

  function handleChange() {
    onUpdate({
      ...data,
      ...config,
    });
  }

  function addTarget() {
    config.targets = [...config.targets, { type: 'user', value: '' }];
    handleChange();
  }

  function removeTarget(index: number) {
    config.targets = config.targets.filter((_, i) => i !== index);
    handleChange();
  }

  function updateTarget(index: number, field: 'type' | 'value', value: string) {
    config.targets[index][field] = value;
    handleChange();
  }

  const triggerOptions = [
    { value: 'ANSWERED', label: 'On Answer' },
    { value: 'NO_ANSWER', label: 'On No Answer' },
    { value: 'BUSY', label: 'On Busy' },
    { value: 'FAILED', label: 'On Failed' },
    { value: 'VOICEMAIL', label: 'On Voicemail' },
  ];
</script>

<div class="space-y-4">
  <!-- Trigger Selection -->
  <div>
    <label class="block text-sm font-medium mb-2">Trigger</label>
    <div class="flex flex-wrap gap-2">
      {#each triggerOptions as option}
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.trigger.includes(option.value)}
            onchange={(e) => {
              if (e.currentTarget.checked) {
                config.trigger = [...config.trigger, option.value];
              } else {
                config.trigger = config.trigger.filter(t => t !== option.value);
              }
              handleChange();
            }}
            class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent"
          />
          <span class="text-sm">{option.label}</span>
        </label>
      {/each}
    </div>
  </div>

  <!-- Tab Navigation -->
  <div class="border-b border-border">
    <div class="flex gap-1">
      {#each tabs as tab, index}
        <button
          type="button"
          onclick={() => activeTab = index}
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === index
            ? 'border-accent text-text-primary'
            : 'border-transparent text-text-secondary hover:text-text-primary'}"
        >
          {tab}
        </button>
      {/each}
    </div>
  </div>

  <!-- Tab Content -->
  <div class="pt-2">
    {#if activeTab === 0}
      <!-- Connect Tab -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Hunt Group Targets</label>
          <div class="space-y-2">
            {#each config.targets as target, index}
              <div class="flex gap-2 items-center">
                <select
                  value={target.type}
                  onchange={(e) => updateTarget(index, 'type', e.currentTarget.value)}
                  class="input w-32"
                >
                  {#each CONNECT_TO_OPTIONS as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
                <input
                  type="text"
                  value={target.value}
                  oninput={(e) => updateTarget(index, 'value', e.currentTarget.value)}
                  placeholder="Enter value..."
                  class="input flex-1"
                />
                <button
                  type="button"
                  onclick={() => removeTarget(index)}
                  class="p-2 text-red-400 hover:bg-red-500/10 rounded"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            {/each}
          </div>
          <Button variant="ghost" size="sm" onclick={addTarget} class="mt-2">
            <Plus class="w-4 h-4 mr-1" />
            Add Target
          </Button>
        </div>

        <div>
          <label for="ringDuration" class="block text-sm font-medium mb-1">Ring Duration (seconds)</label>
          <input
            id="ringDuration"
            type="number"
            bind:value={config.ringDuration}
            onchange={handleChange}
            min="5"
            max="120"
            class="input w-full"
          />
          <p class="text-xs text-text-secondary mt-1">How long to ring each target</p>
        </div>
      </div>

    {:else if activeTab === 1}
      <!-- Advanced Tab -->
      <div class="space-y-4">
        <div>
          <label for="callerIdPresentation" class="block text-sm font-medium mb-1">
            Caller ID Presentation
          </label>
          <select
            id="callerIdPresentation"
            bind:value={config.callerIdPresentation}
            onchange={handleChange}
            class="input w-full"
          >
            {#each CALLER_ID_OPTIONS as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        {#if config.callerIdPresentation === 'CUSTOM'}
          <div>
            <label for="customCallerId" class="block text-sm font-medium mb-1">Custom Caller ID</label>
            <input
              id="customCallerId"
              type="text"
              bind:value={config.customCallerId}
              oninput={handleChange}
              placeholder="+44..."
              class="input w-full font-mono"
            />
          </div>
        {/if}

        <div class="space-y-2">
          <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base">
            <div>
              <p class="text-sm font-medium">Transfer After Connect</p>
              <p class="text-xs text-text-secondary">Transfer call once connected</p>
            </div>
            <input
              type="checkbox"
              bind:checked={config.transferAfterConnect}
              onchange={() => {
                if (config.transferAfterConnect && config.hangupAfterBridge) {
                  config.hangupAfterBridge = false;
                }
                handleChange();
              }}
              class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent"
            />
          </label>

          <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base">
            <div>
              <p class="text-sm font-medium">Hangup After Bridge</p>
              <p class="text-xs text-text-secondary">End call when bridge disconnects</p>
            </div>
            <input
              type="checkbox"
              bind:checked={config.hangupAfterBridge}
              onchange={handleChange}
              disabled={config.transferAfterConnect}
              class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent disabled:opacity-50"
            />
          </label>
        </div>
      </div>

    {:else if activeTab === 2}
      <!-- Screen Tab -->
      <div class="space-y-4">
        <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base">
          <div>
            <p class="text-sm font-medium">Enable Call Screening</p>
            <p class="text-xs text-text-secondary">Play announcement and require key press to accept</p>
          </div>
          <input
            type="checkbox"
            bind:checked={config.screen}
            onchange={handleChange}
            class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent"
          />
        </label>

        {#if config.screen}
          <div>
            <label for="screenAnnouncement" class="block text-sm font-medium mb-1">Announcement</label>
            <textarea
              id="screenAnnouncement"
              bind:value={config.screenAnnouncement}
              oninput={handleChange}
              placeholder="You have an incoming call. Press 1 to accept."
              class="input w-full"
              rows="2"
            ></textarea>
          </div>

          <div>
            <label for="screenAcceptKey" class="block text-sm font-medium mb-1">Accept Key</label>
            <select
              id="screenAcceptKey"
              bind:value={config.screenAcceptKey}
              onchange={handleChange}
              class="input w-full"
            >
              {#each ACCEPT_KEYS as key}
                <option value={key}>{key}</option>
              {/each}
            </select>
          </div>
        {/if}
      </div>

    {:else if activeTab === 3}
      <!-- Camp Tab -->
      <div class="space-y-4">
        <label class="flex items-center justify-between cursor-pointer p-3 bg-bg-secondary rounded-base">
          <div>
            <p class="text-sm font-medium">Enable Call Camping</p>
            <p class="text-xs text-text-secondary">Camp on busy extensions and retry when available</p>
          </div>
          <input
            type="checkbox"
            bind:checked={config.camp.enabled}
            onchange={handleChange}
            class="w-4 h-4 rounded border-border text-text-primary focus:ring-accent"
          />
        </label>

        {#if config.camp.enabled}
          <div>
            <label for="campChimeFormat" class="block text-sm font-medium mb-1">Chime Format</label>
            <select
              id="campChimeFormat"
              bind:value={config.camp.chimeFormat}
              onchange={handleChange}
              class="input w-full"
            >
              {#each CHIME_FORMAT_OPTIONS as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="campRingDuration" class="block text-sm font-medium mb-1">Ring Duration (seconds)</label>
            <input
              id="campRingDuration"
              type="number"
              bind:value={config.camp.ringDuration}
              onchange={handleChange}
              min="5"
              max="120"
              class="input w-full"
            />
          </div>
        {/if}

        <div class="p-3 bg-info/10 border border-info/20 rounded-base flex items-start gap-2">
          <Info class="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
          <p class="text-xs text-info">
            Call camping keeps trying busy targets until they become available,
            playing the configured chime between attempts.
          </p>
        </div>
      </div>
    {/if}
  </div>
</div>

