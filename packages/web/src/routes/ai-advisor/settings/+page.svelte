<script lang="ts">
  import { Card, Button, Badge } from '$lib/components/ui';
  import { Sliders, Bot, FlaskConical, AlertCircle, Save, CheckCircle } from 'lucide-svelte';
  import type { AIAdvisorSettings } from './+page.server';

  interface Props {
    data: {
      settings: AIAdvisorSettings;
      languages: { value: string; label: string }[];
      isDemo: boolean;
      error?: string;
    };
  }

  let { data }: Props = $props();

  let language = $state(data.settings.language);
  let summarizationEnabled = $state(data.settings.summarizationEnabled);
  let accessByRecordingAccess = $state(data.settings.accessByRecordingAccess);
  let endUserAccess = $state(data.settings.endUserAccess);

  let saving = $state(false);
  let saveMessage = $state<string | null>(null);

  async function handleSave() {
    saving = true;
    saveMessage = null;

    try {
      const formData = new FormData();
      formData.append('language', language);
      if (summarizationEnabled) formData.append('summarizationEnabled', 'on');
      if (accessByRecordingAccess) formData.append('accessByRecordingAccess', 'on');
      if (endUserAccess) formData.append('endUserAccess', 'on');

      const response = await fetch('?/save', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        saveMessage = 'Settings saved successfully';
      } else {
        saveMessage = 'Failed to save settings';
      }
    } catch (error) {
      saveMessage = 'Failed to save settings';
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>AI Advisor Settings | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - changes will not be saved</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Save Message -->
  {#if saveMessage}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-4 flex items-center gap-3">
      <CheckCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">{saveMessage}</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">AI Advisor Settings</h1>
      <p class="text-text-secondary mt-1">Configure AI-powered call analysis and transcription settings</p>
    </div>
    <Button variant="primary" onclick={handleSave} disabled={saving || data.isDemo}>
      <Save class="w-4 h-4 mr-2" />
      {saving ? 'Saving...' : 'Save Changes'}
    </Button>
  </div>

  <!-- Configuration Sections -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-accent/10 rounded-base">
          <Bot class="w-6 h-6 text-accent" />
        </div>
        <h2 class="text-lg font-semibold">Transcription Settings</h2>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-text-secondary">Transcription Language</label>
          <select class="input mt-1" bind:value={language} disabled={data.isDemo}>
            {#each data.languages as lang}
              <option value={lang.value}>{lang.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-text-secondary">Transcription Provider</label>
          <p class="text-text-primary mt-1 font-medium">{data.settings.provider}</p>
        </div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4 rounded border-border"
            bind:checked={summarizationEnabled}
            disabled={data.isDemo}
          />
          <span>Enable Call Summarization</span>
        </label>
        <div class="pt-2 border-t border-border">
          <div class="flex items-center gap-2">
            <span class="text-sm text-text-secondary">AI Advisor Status:</span>
            {#if data.settings.enabled}
              <Badge variant="success">Enabled</Badge>
            {:else}
              <Badge variant="neutral">Disabled</Badge>
            {/if}
          </div>
        </div>
      </div>
    </Card>

    <Card>
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-accent/10 rounded-base">
          <Sliders class="w-6 h-6 text-accent" />
        </div>
        <h2 class="text-lg font-semibold">Access Control</h2>
      </div>
      <div class="space-y-4">
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4 rounded border-border"
            bind:checked={accessByRecordingAccess}
            disabled={data.isDemo}
          />
          <div>
            <span>Control by Recording Access</span>
            <p class="text-xs text-text-secondary">Use recording access rules to control AI Advisor access</p>
          </div>
        </label>
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            class="w-4 h-4 rounded border-border"
            bind:checked={endUserAccess}
            disabled={data.isDemo}
          />
          <div>
            <span>End Users can access all their AI Advisor Call Logs</span>
            <p class="text-xs text-text-secondary">Allow users to view insights from their own calls</p>
          </div>
        </label>
      </div>
    </Card>
  </div>
</div>
