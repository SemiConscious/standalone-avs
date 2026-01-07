<script lang="ts">
  import { Card, Badge, Button } from '$lib/components/ui';
  import {
    Settings,
    Monitor,
    Shield,
    BarChart3,
    Cloud,
    MessageSquare,
    Sparkles,
    Phone,
    Cog,
    RefreshCw,
    Edit,
    Save,
    X,
    Plus,
    Trash2,
    Music,
    FlaskConical,
    AlertCircle,
    CheckCircle2,
    Volume2,
    Users,
  } from 'lucide-svelte';
  import type { AccountSettingsData } from './+page.server';

  interface Props {
    data: { data: AccountSettingsData };
  }

  let { data }: Props = $props();
  const settings = $derived(data.data);

  // Edit mode state
  let editMode = $state(false);

  // Editable form values
  let formHoldMusic = $state(settings.accountSettings.holdMusic);
  let formCountryCode = $state(settings.accountSettings.countryCode);
  let formTimeZone = $state(settings.accountSettings.timeZone);
  let formVoice = $state(settings.accountSettings.voice);
  let formPresentCallerId = $state(settings.accountSettings.presentCallerId);
  let formExternalCallerIdNumber = $state(settings.accountSettings.externalCallerIdNumber);

  function enterEditMode() {
    formHoldMusic = settings.accountSettings.holdMusic;
    formCountryCode = settings.accountSettings.countryCode;
    formTimeZone = settings.accountSettings.timeZone;
    formVoice = settings.accountSettings.voice;
    formPresentCallerId = settings.accountSettings.presentCallerId;
    formExternalCallerIdNumber = settings.accountSettings.externalCallerIdNumber;
    editMode = true;
  }

  function cancelEdit() {
    editMode = false;
  }

  async function saveSettings() {
    // TODO: Implement save to Salesforce
    console.log('Saving settings...', {
      holdMusic: formHoldMusic,
      countryCode: formCountryCode,
      timeZone: formTimeZone,
      voice: formVoice,
      presentCallerId: formPresentCallerId,
      externalCallerIdNumber: formExternalCallerIdNumber,
    });
    editMode = false;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Pagination state for tables
  let profilesPage = $state(1);
  let skillsPage = $state(1);
  let soundsPage = $state(1);
  const pageSize = 10;

  const paginatedProfiles = $derived(
    settings.availabilityProfiles.slice((profilesPage - 1) * pageSize, profilesPage * pageSize)
  );
  const totalProfilePages = $derived(Math.ceil(settings.availabilityProfiles.length / pageSize));

  const paginatedSkills = $derived(
    settings.skills.slice((skillsPage - 1) * pageSize, skillsPage * pageSize)
  );
  const totalSkillPages = $derived(Math.ceil(settings.skills.length / pageSize));

  const paginatedSounds = $derived(
    settings.sounds.slice((soundsPage - 1) * pageSize, soundsPage * pageSize)
  );
  const totalSoundPages = $derived(Math.ceil(settings.sounds.length / pageSize));
</script>

<svelte:head>
  <title>Account Settings | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if settings.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data. Changes will not be saved.</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if settings.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{settings.error}</p>
    </div>
  {/if}

  <!-- Page Header with Actions -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Account Settings</h1>
      <p class="text-text-secondary mt-1">Configure organization-wide settings</p>
    </div>
    <div class="flex items-center gap-2">
      {#if editMode}
        <Button variant="secondary" onclick={cancelEdit}>
          <X class="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button variant="primary" onclick={saveSettings}>
          <Save class="w-4 h-4 mr-1" />
          Save
        </Button>
      {:else}
        <Button variant="secondary" onclick={enterEditMode}>
          <Edit class="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button variant="secondary">
          <RefreshCw class="w-4 h-4 mr-1" />
          Refresh
        </Button>
      {/if}
    </div>
  </div>

  <!-- Main Settings Section -->
  <Card>
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-accent/10 rounded-base">
        <Settings class="w-6 h-6 text-accent" />
      </div>
      <h2 class="text-lg font-semibold">Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Hold Music -->
      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Hold Music</label>
        {#if editMode}
          <select class="input" bind:value={formHoldMusic}>
            {#each settings.presets.holdMusic as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {:else}
          <p class="text-text-primary">{settings.accountSettings.holdMusic}</p>
        {/if}
      </div>

      <!-- Country -->
      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Country</label>
        {#if editMode}
          <select class="input" bind:value={formCountryCode}>
            {#each settings.presets.countryCode as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {:else}
          <p class="text-text-primary">{settings.accountSettings.countryCodeLabel}</p>
        {/if}
      </div>

      <!-- Time Zone -->
      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Time Zone</label>
        {#if editMode}
          <select class="input" bind:value={formTimeZone}>
            {#each settings.presets.timeZone as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {:else}
          <p class="text-text-primary">{settings.accountSettings.timeZone}</p>
        {/if}
      </div>

      <!-- Voice -->
      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Voice</label>
        {#if editMode}
          <select class="input" bind:value={formVoice}>
            {#each settings.presets.voice as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        {:else}
          <p class="text-text-primary">{settings.accountSettings.voiceLabel}</p>
        {/if}
      </div>

      <!-- Present Caller ID -->
      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Present Caller Id</label>
        {#if editMode}
          <label class="flex items-center gap-2">
            <input type="checkbox" bind:checked={formPresentCallerId} class="w-4 h-4 rounded" />
            <span class="text-sm">Enabled</span>
          </label>
        {:else}
          <p class="text-text-primary flex items-center gap-2">
            {#if settings.accountSettings.presentCallerId}
              <CheckCircle2 class="w-4 h-4 text-success" />
              <span>Yes</span>
            {:else}
              <X class="w-4 h-4 text-text-secondary" />
              <span>No</span>
            {/if}
          </p>
        {/if}
      </div>

      <!-- External Caller ID Number -->
      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">External Caller Id Number</label>
        {#if editMode && formPresentCallerId}
          <input type="text" class="input" bind:value={formExternalCallerIdNumber} placeholder="Phone number" />
        {:else}
          <p class="text-text-primary">
            {settings.accountSettings.presentCallerId ? settings.accountSettings.externalCallerIdNumber || 'Not set' : 'n/a'}
          </p>
        {/if}
      </div>
    </div>
  </Card>

  <!-- UI Settings -->
  <Card>
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-accent/10 rounded-base">
        <Monitor class="w-6 h-6 text-accent" />
      </div>
      <h2 class="text-lg font-semibold">UI Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">List Page Size</label>
        <select class="input max-w-xs">
          {#each settings.presets.pageSize as option}
            <option value={option.value} selected={option.value === settings.uiSettings.pageSize}>
              {option.label}
            </option>
          {/each}
        </select>
      </div>
    </div>
  </Card>

  <!-- Record Access Settings -->
  <Card>
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-accent/10 rounded-base">
        <Shield class="w-6 h-6 text-accent" />
      </div>
      <h2 class="text-lg font-semibold">Record Access Settings</h2>
    </div>

    <label class="flex items-center gap-3">
      <input
        type="checkbox"
        checked={settings.orgSettings.accessOwnRecordings}
        class="w-4 h-4 rounded"
      />
      <span>Access Own Recordings</span>
    </label>
  </Card>

  <!-- Call Reporting Settings -->
  <Card>
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-accent/10 rounded-base">
        <BarChart3 class="w-6 h-6 text-accent" />
      </div>
      <h2 class="text-lg font-semibold">Call Reporting Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.contactLookupEnable} class="w-4 h-4 rounded" />
        <span>Enable Contact Lookup</span>
      </label>
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.accountLookupEnable} class="w-4 h-4 rounded" />
        <span>Enable Account Lookup</span>
      </label>
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.leadLookupEnable} class="w-4 h-4 rounded" />
        <span>Enable Lead Lookup</span>
      </label>
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.enableSkillsReporting} class="w-4 h-4 rounded" />
        <span>Enable Skills Reporting</span>
      </label>
    </div>
  </Card>

  <!-- Service Cloud Voice Settings -->
  <Card>
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-accent/10 rounded-base">
        <Cloud class="w-6 h-6 text-accent" />
      </div>
      <h2 class="text-lg font-semibold">Service Cloud Voice Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.scvnbaEnabled} class="w-4 h-4 rounded" />
        <span>Enable Next Best Action Integration</span>
      </label>

      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Transcription Event Batch Size</label>
        <select class="input max-w-xs">
          {#each settings.presets.batchSize as option}
            <option value={option.value} selected={option.value === String(settings.orgSettings.scvnbaTranscriptionBatchSize)}>
              {option.label}
            </option>
          {/each}
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Transcription Language</label>
        <select class="input max-w-xs">
          {#each settings.presets.transcriptionLanguage as option}
            <option value={option.value} selected={option.value === settings.orgSettings.transcriptionLanguage}>
              {option.label}
            </option>
          {/each}
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Sync Configuration</label>
        <Button variant="secondary" size="sm">Sync</Button>
      </div>

      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.scvMissedCallNotificationsEnabled} class="w-4 h-4 rounded" />
        <span>Enable Missed Call Notifications</span>
      </label>

      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Add Existing Users to CCRM</label>
        <Button variant="secondary" size="sm">Add Existing SCV Users to CCRM</Button>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-medium text-text-secondary">Add Existing Groups to CCRM</label>
        <Button variant="secondary" size="sm">Add Existing Groups to CCRM</Button>
      </div>
    </div>
  </Card>

  <!-- Messaging Settings (only if SMS or WhatsApp licensed) -->
  {#if settings.license.sms || settings.license.whatsApp}
    <Card>
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-accent/10 rounded-base">
          <MessageSquare class="w-6 h-6 text-accent" />
        </div>
        <h2 class="text-lg font-semibold">Messaging Settings</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-1">
          <label class="text-sm font-medium text-text-secondary">Temporary Consent Duration</label>
          <select class="input max-w-xs">
            {#each settings.presets.consentDuration as option}
              <option value={option.value} selected={option.value === settings.orgSettings.temporaryConsentDuration}>
                {option.label}
              </option>
            {/each}
          </select>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-text-secondary">Reporting Interval (Hours)</label>
          <p class="text-text-primary">{settings.accountSettings.reportingInterval}</p>
        </div>
      </div>
    </Card>
  {/if}

  <!-- AI Advisor Settings (only if licensed) -->
  {#if settings.license.insights}
    <Card>
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-accent/10 rounded-base">
          <Sparkles class="w-6 h-6 text-accent" />
        </div>
        <h2 class="text-lg font-semibold">AI Advisor Settings</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label class="flex items-center gap-3">
          <input type="checkbox" checked={settings.accountSettings.controlByRecordingAccess} class="w-4 h-4 rounded" />
          <span>Control by Recording Access</span>
        </label>

        <label class="flex items-center gap-3">
          <input type="checkbox" checked={settings.accountSettings.enableEndUserAccessAllInsights} class="w-4 h-4 rounded" />
          <span>End Users can access all their AI Advisor Call Logs</span>
        </label>

        <div class="space-y-1">
          <label class="text-sm font-medium text-text-secondary">Transcription Language</label>
          <select class="input max-w-xs">
            {#each settings.presets.transcriptionLanguage as option}
              <option value={option.value} selected={option.value === settings.orgSettings.insightTranscriptionLanguage}>
                {option.label}
              </option>
            {/each}
          </select>
        </div>

        <div class="space-y-1">
          <label class="text-sm font-medium text-text-secondary">Transcription Provider</label>
          <p class="text-text-primary">{settings.orgSettings.transcriptionProvider}</p>
        </div>

        <label class="flex items-center gap-3">
          <input type="checkbox" checked={settings.orgSettings.callSummarization} class="w-4 h-4 rounded" />
          <span>Enable Call Summarization</span>
        </label>
      </div>
    </Card>
  {/if}

  <!-- CTI Settings -->
  <Card>
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-accent/10 rounded-base">
        <Phone class="w-6 h-6 text-accent" />
      </div>
      <h2 class="text-lg font-semibold">CTI Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.accountSettings.newUsersTrackCTIDevice} class="w-4 h-4 rounded" />
        <span>Track CTI Device For New Users</span>
      </label>
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.showNumberLabelInMyCallerId} class="w-4 h-4 rounded" />
        <span>Show Number Label in My Caller ID</span>
      </label>
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.enableEnhancedWrapup} class="w-4 h-4 rounded" />
        <span>Enable Enhanced Wrap-Up</span>
      </label>
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.optimizedTransfer} class="w-4 h-4 rounded" />
        <span>Optimized Transfer</span>
      </label>
    </div>
  </Card>

  <!-- General Settings -->
  <Card>
    <div class="flex items-center gap-3 mb-6">
      <div class="p-2 bg-accent/10 rounded-base">
        <Cog class="w-6 h-6 text-accent" />
      </div>
      <h2 class="text-lg font-semibold">General Settings</h2>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label class="flex items-center gap-3">
        <input type="checkbox" checked={settings.orgSettings.autoDeactivateUsers} class="w-4 h-4 rounded" />
        <span>Auto Deactivate Users</span>
      </label>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-3">
          <input type="checkbox" checked={settings.accountSettings.permissionsLevelManagementViaSF} class="w-4 h-4 rounded" />
          <span>Permissions Level management via Salesforce</span>
        </label>
        {#if settings.accountSettings.permissionsLevelManagementViaSF}
          <Button variant="secondary" size="sm">Sync Permission Levels</Button>
        {/if}
      </div>
    </div>
  </Card>

  <!-- Availability Profiles Table -->
  <Card>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-accent/10 rounded-base">
          <Users class="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">Availability Profiles</h2>
          <p class="text-sm text-text-secondary">
            Showing {paginatedProfiles.length} of {settings.availabilityProfiles.length} entries
          </p>
        </div>
      </div>
      {#if settings.license.manager}
        <Button variant="primary" size="sm">
          <Plus class="w-4 h-4 mr-1" />
          Add Profile
        </Button>
      {:else}
        <Badge variant="warning">Feature not licensed</Badge>
      {/if}
    </div>

    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Record ID</th>
            <th>Name</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedProfiles as profile}
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <button class="text-accent hover:underline text-sm">Edit</button>
                  <span class="text-text-secondary">|</span>
                  <button class="text-error hover:underline text-sm">Del</button>
                </div>
              </td>
              <td>{profile.sapienId}</td>
              <td>
                <a href="#" class="text-accent hover:underline">{profile.name}</a>
              </td>
              <td>{profile.createdByName}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalProfilePages > 1}
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <p class="text-sm text-text-secondary">
          Page {profilesPage} of {totalProfilePages}
        </p>
        <div class="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={profilesPage === 1} onclick={() => profilesPage--}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={profilesPage === totalProfilePages} onclick={() => profilesPage++}>
            Next
          </Button>
        </div>
      </div>
    {/if}
  </Card>

  <!-- Skills Table -->
  <Card>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-accent/10 rounded-base">
          <BarChart3 class="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">Skills</h2>
          <p class="text-sm text-text-secondary">
            Showing {paginatedSkills.length} of {settings.skills.length} entries
          </p>
        </div>
      </div>
      <Button variant="primary" size="sm">
        <Plus class="w-4 h-4 mr-1" />
        New
      </Button>
    </div>

    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Name</th>
            <th>Proficiency</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedSkills as skill}
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <button class="text-accent hover:underline text-sm">Edit</button>
                  <span class="text-text-secondary">|</span>
                  <button class="text-error hover:underline text-sm">Del</button>
                </div>
              </td>
              <td>
                <a href="#" class="text-accent hover:underline">{skill.name}</a>
              </td>
              <td>
                <span class="flex items-center gap-2">
                  {skill.proficiency}
                  <span class="text-text-secondary">▶ {skill.weight}</span>
                </span>
              </td>
              <td class="text-text-secondary">{skill.description || '-'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalSkillPages > 1}
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <p class="text-sm text-text-secondary">
          Page {skillsPage} of {totalSkillPages}
        </p>
        <div class="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={skillsPage === 1} onclick={() => skillsPage--}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={skillsPage === totalSkillPages} onclick={() => skillsPage++}>
            Next
          </Button>
        </div>
      </div>
    {/if}
  </Card>

  <!-- Sounds Table -->
  <Card>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-accent/10 rounded-base">
          <Volume2 class="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 class="text-lg font-semibold">Sounds</h2>
          <p class="text-sm text-text-secondary">
            Showing {paginatedSounds.length} of {settings.sounds.length} entries
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="primary" size="sm">
          <Plus class="w-4 h-4 mr-1" />
          Add Sound
        </Button>
        <Button variant="secondary" size="sm">
          <RefreshCw class="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Action</th>
            <th>ID</th>
            <th>Tag</th>
            <th>Description</th>
            <th>Size</th>
            <th>Modified</th>
            <th>Created</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedSounds as sound}
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <button class="text-accent hover:underline text-sm">Edit</button>
                  <span class="text-text-secondary">|</span>
                  <button class="text-error hover:underline text-sm">Del</button>
                </div>
              </td>
              <td>{sound.sapienId}</td>
              <td>
                <a href="#" class="text-accent hover:underline">{sound.tag}</a>
              </td>
              <td class="text-text-secondary max-w-xs truncate">{sound.description || '-'}</td>
              <td>{formatFileSize(sound.size)}</td>
              <td class="text-sm">{formatDate(sound.modified)}</td>
              <td class="text-sm">{formatDate(sound.created)}</td>
              <td>{sound.createdByName}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalSoundPages > 1}
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <p class="text-sm text-text-secondary">
          Page {soundsPage} of {totalSoundPages}
        </p>
        <div class="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={soundsPage === 1} onclick={() => soundsPage--}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={soundsPage === totalSoundPages} onclick={() => soundsPage++}>
            Next
          </Button>
        </div>
      </div>
    {/if}
  </Card>
</div>
