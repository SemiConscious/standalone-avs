<script lang="ts">
  import { Card, Button, Badge, Toggle } from '$lib/components/ui';
  import { Sliders, Bot, FlaskConical, AlertCircle, Save, CheckCircle, Pencil, X, CheckCircle2, XCircle } from 'lucide-svelte';
  import type { InsightsSettings } from './+page.server';

  interface Props {
    data: {
      settings: InsightsSettings;
      languages: { value: string; label: string }[];
      isDemo: boolean;
      error?: string;
    };
  }

  let { data }: Props = $props();

  // Edit mode state
  let isEditing = $state(false);

  // Form state (initialized from data)
  let language = $state(data.settings.language);
  let summarizationEnabled = $state(data.settings.summarizationEnabled);
  let accessByRecordingAccess = $state(data.settings.accessByRecordingAccess);
  let endUserAccess = $state(data.settings.endUserAccess);

  // UI state
  let saving = $state(false);
  let saveMessage = $state<string | null>(null);

  function getLanguageLabel(value: string): string {
    const lang = data.languages.find((l) => l.value === value);
    return lang?.label ?? value;
  }

  function startEditing() {
    // Reset form values to current settings
    language = data.settings.language;
    summarizationEnabled = data.settings.summarizationEnabled;
    accessByRecordingAccess = data.settings.accessByRecordingAccess;
    endUserAccess = data.settings.endUserAccess;
    isEditing = true;
    saveMessage = null;
  }

  function cancelEditing() {
    isEditing = false;
    // Reset form values
    language = data.settings.language;
    summarizationEnabled = data.settings.summarizationEnabled;
    accessByRecordingAccess = data.settings.accessByRecordingAccess;
    endUserAccess = data.settings.endUserAccess;
  }

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
        isEditing = false;
        // Update the displayed settings
        data.settings.language = language;
        data.settings.summarizationEnabled = summarizationEnabled;
        data.settings.accessByRecordingAccess = accessByRecordingAccess;
        data.settings.endUserAccess = endUserAccess;
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
  <title>Insights Settings | Natterbox AVS</title>
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
    <div
      class="rounded-base p-4 flex items-center gap-3 {saveMessage.includes('success')
        ? 'bg-success/10 border border-success/20 text-success'
        : 'bg-error/10 border border-error/20 text-error'}"
    >
      {#if saveMessage.includes('success')}
        <CheckCircle class="w-5 h-5 flex-shrink-0" />
      {:else}
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
      {/if}
      <p class="text-sm">{saveMessage}</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">Insights Settings</h1>
      <p class="text-text-secondary mt-1">Configure AI-powered call analysis and transcription settings</p>
    </div>
    <div class="flex items-center gap-2">
      {#if isEditing}
        <Button variant="ghost" onclick={cancelEditing} disabled={saving}>
          <X class="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button variant="primary" onclick={handleSave} disabled={saving || data.isDemo}>
          <Save class="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      {:else}
        <Button variant="secondary" onclick={startEditing} disabled={data.isDemo}>
          <Pencil class="w-4 h-4 mr-2" />
          Edit
        </Button>
      {/if}
    </div>
  </div>

  <!-- Configuration Sections -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Transcription Settings Card -->
    <Card>
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-accent/10 rounded-base">
          <Bot class="w-6 h-6 text-text-primary" />
        </div>
        <h2 class="text-lg font-semibold text-text-primary">Transcription Settings</h2>
      </div>
      <div class="space-y-4">
        <!-- Language -->
        <div>
          {#if isEditing}
            <label for="language-select" class="text-sm font-medium text-text-secondary">Transcription Language</label>
            <select id="language-select" class="input mt-1" bind:value={language}>
              {#each data.languages as lang}
                <option value={lang.value}>{lang.label}</option>
              {/each}
            </select>
          {:else}
            <p class="text-sm font-medium text-text-secondary">Transcription Language</p>
            <p class="text-text-primary mt-1 font-medium">{getLanguageLabel(data.settings.language)}</p>
          {/if}
        </div>

        <!-- Provider (read-only) -->
        <div>
          <p class="text-sm font-medium text-text-secondary">Transcription Provider</p>
          <p class="text-text-primary mt-1 font-medium">{data.settings.provider}</p>
        </div>

        <!-- Call Summarization -->
        {#if isEditing}
          <div class="flex items-center justify-between py-2">
            <div>
              <p class="text-sm font-medium text-text-primary">Call Summarization</p>
              <p class="text-xs text-text-secondary">Automatically generate call summaries</p>
            </div>
            <Toggle bind:checked={summarizationEnabled} color="success" size="sm" />
          </div>
        {:else}
          <div class="flex items-center gap-2">
            {#if data.settings.summarizationEnabled}
              <CheckCircle2 class="w-4 h-4 text-success" />
            {:else}
              <XCircle class="w-4 h-4 text-gray-500" />
            {/if}
            <div>
              <span class="text-sm text-text-primary">Call Summarization</span>
              <p class="text-xs text-text-secondary">Automatically generate call summaries</p>
            </div>
          </div>
        {/if}

        <!-- Insights Status -->
        <div class="pt-2 border-t border-border">
          <div class="flex items-center gap-2">
            <span class="text-sm text-text-secondary">Insights Status:</span>
            {#if data.settings.enabled}
              <Badge variant="success">Enabled</Badge>
            {:else}
              <Badge variant="neutral">Disabled</Badge>
            {/if}
          </div>
        </div>
      </div>
    </Card>

    <!-- Access Control Card -->
    <Card>
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 bg-accent/10 rounded-base">
          <Sliders class="w-6 h-6 text-text-primary" />
        </div>
        <h2 class="text-lg font-semibold text-text-primary">Access Control</h2>
      </div>
      <div class="space-y-4">
        <!-- Control by Recording Access -->
        {#if isEditing}
          <div class="flex items-center justify-between py-2">
            <div>
              <p class="text-sm font-medium text-text-primary">Control by Recording Access</p>
              <p class="text-xs text-text-secondary">Use recording access rules to control Insights access</p>
            </div>
            <Toggle bind:checked={accessByRecordingAccess} color="success" size="sm" />
          </div>
        {:else}
          <div class="flex items-center gap-2">
            {#if data.settings.accessByRecordingAccess}
              <CheckCircle2 class="w-4 h-4 text-success" />
            {:else}
              <XCircle class="w-4 h-4 text-gray-500" />
            {/if}
            <div>
              <span class="text-sm text-text-primary">Control by Recording Access</span>
              <p class="text-xs text-text-secondary">Use recording access rules to control Insights access</p>
            </div>
          </div>
        {/if}

        <!-- End User Access -->
        {#if isEditing}
          <div class="flex items-center justify-between py-2">
            <div>
              <p class="text-sm font-medium text-text-primary">End User Insights Access</p>
              <p class="text-xs text-text-secondary">Allow users to view insights from their own calls</p>
            </div>
            <Toggle bind:checked={endUserAccess} color="success" size="sm" />
          </div>
        {:else}
          <div class="flex items-center gap-2">
            {#if data.settings.endUserAccess}
              <CheckCircle2 class="w-4 h-4 text-success" />
            {:else}
              <XCircle class="w-4 h-4 text-gray-500" />
            {/if}
            <div>
              <span class="text-sm text-text-primary">End User Insights Access</span>
              <p class="text-xs text-text-secondary">Allow users to view insights from their own calls</p>
            </div>
          </div>
        {/if}
      </div>
    </Card>
  </div>
</div>
