<script lang="ts">
  import { Card, Badge, Button, Toggle, Tabs, DataTable, type Tab } from '$lib/components/ui';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
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
    FlaskConical,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Volume2,
    Users,
    Plug,
    ChevronDown,
    Zap,
    Play,
    Square,
    Trash2,
    Upload,
    File,
    Music,
    Loader2,
  } from 'lucide-svelte';
  import type { AccountSettingsData } from './+page.server';

  interface Props {
    data: { data: AccountSettingsData };
  }

  let { data }: Props = $props();
  const settings = $derived(data.data);

  // Tab configuration - separate tabs for each data table
  const tabs: Tab[] = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'telephony', label: 'Telephony', icon: Phone },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'profiles', label: 'Profiles', icon: Users, badge: settings.availabilityProfiles?.length || 0 },
    { id: 'skills', label: 'Skills', icon: Zap, badge: settings.skills?.length || 0 },
    { id: 'sounds', label: 'Sounds', icon: Volume2, badge: settings.sounds?.length || 0 },
  ];

  let activeTab = $state('general');

  // Edit mode state
  let editMode = $state(false);

  // Editable form values for Core Settings
  let formHoldMusic = $state(settings.accountSettings?.holdMusic || '');
  let formCountryCode = $state(settings.accountSettings?.countryCode || '');
  let formTimeZone = $state(settings.accountSettings?.timeZone || '');
  let formVoice = $state(settings.accountSettings?.voice || '');
  let formPresentCallerId = $state(settings.accountSettings?.presentCallerId || false);
  let formExternalCallerIdNumber = $state(settings.accountSettings?.externalCallerIdNumber || '');
  let formPageSize = $state(settings.uiSettings?.pageSize || '1000');
  
  // General Settings form values
  let formAutoDeactivateUsers = $state(settings.orgSettings?.autoDeactivateUsers || false);
  let formPermissionsManagement = $state(settings.accountSettings?.permissionsLevelManagementViaSF || false);
  
  // CTI Settings form values
  let formTrackCTI = $state(settings.accountSettings?.newUsersTrackCTIDevice || false);
  let formShowNumberLabel = $state(settings.orgSettings?.showNumberLabelInMyCallerId || false);
  let formEnhancedWrapup = $state(settings.orgSettings?.enableEnhancedWrapup || false);
  let formOptimizedTransfer = $state(settings.orgSettings?.optimizedTransfer || false);
  
  // Recording Access form values
  let formAccessOwnRecordings = $state(settings.orgSettings?.accessOwnRecordings || false);
  
  // Call Reporting form values
  let formContactLookup = $state(settings.orgSettings?.contactLookupEnable || false);
  let formAccountLookup = $state(settings.orgSettings?.accountLookupEnable || false);
  let formLeadLookup = $state(settings.orgSettings?.leadLookupEnable || false);
  let formSkillsReporting = $state(settings.orgSettings?.enableSkillsReporting || false);

  // Accordion states
  let telephonyOpen = $state<string[]>(['cti']);
  let integrationOpen = $state<string[]>(['scv']);

  // Modal states
  let showProfileModal = $state(false);
  let showSkillModal = $state(false);
  let showSoundModal = $state(false);
  let editingProfile = $state<typeof settings.availabilityProfiles[0] | null>(null);
  let editingSkill = $state<typeof settings.skills[0] | null>(null);
  let editingSound = $state<typeof settings.sounds[0] | null>(null);
  
  // Audio playback state
  let playingSound = $state<string | null>(null);
  let audioElement: HTMLAudioElement | null = null;

  // Upload sound state
  let showUploadModal = $state(false);
  let uploadTag = $state('');
  let uploadDescription = $state('');
  let uploadFile = $state<File | null>(null);
  let uploadError = $state<string | null>(null);
  let uploadProgress = $state(0);
  let isUploading = $state(false);
  let isDragging = $state(false);
  let previewAudioUrl = $state<string | null>(null);

  function enterEditMode() {
    formHoldMusic = settings.accountSettings?.holdMusic || '';
    formCountryCode = settings.accountSettings?.countryCode || '';
    formTimeZone = settings.accountSettings?.timeZone || '';
    formVoice = settings.accountSettings?.voice || '';
    formPresentCallerId = settings.accountSettings?.presentCallerId || false;
    formExternalCallerIdNumber = settings.accountSettings?.externalCallerIdNumber || '';
    formPageSize = settings.uiSettings?.pageSize || '1000';
    formAutoDeactivateUsers = settings.orgSettings?.autoDeactivateUsers || false;
    formPermissionsManagement = settings.accountSettings?.permissionsLevelManagementViaSF || false;
    formTrackCTI = settings.accountSettings?.newUsersTrackCTIDevice || false;
    formShowNumberLabel = settings.orgSettings?.showNumberLabelInMyCallerId || false;
    formEnhancedWrapup = settings.orgSettings?.enableEnhancedWrapup || false;
    formOptimizedTransfer = settings.orgSettings?.optimizedTransfer || false;
    formAccessOwnRecordings = settings.orgSettings?.accessOwnRecordings || false;
    formContactLookup = settings.orgSettings?.contactLookupEnable || false;
    formAccountLookup = settings.orgSettings?.accountLookupEnable || false;
    formLeadLookup = settings.orgSettings?.leadLookupEnable || false;
    formSkillsReporting = settings.orgSettings?.enableSkillsReporting || false;
    editMode = true;
  }

  function cancelEdit() {
    editMode = false;
  }

  async function saveSettings() {
    console.log('Saving settings...');
    editMode = false;
  }

  function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function toggleSection(section: string, list: string[], setter: (v: string[]) => void) {
    if (list.includes(section)) {
      setter(list.filter(s => s !== section));
    } else {
      setter([...list, section]);
    }
  }

  // Profile functions
  function openProfileEdit(profile: typeof settings.availabilityProfiles[0]) {
    editingProfile = { ...profile };
    showProfileModal = true;
  }

  function saveProfile() {
    console.log('Saving profile:', editingProfile);
    showProfileModal = false;
    editingProfile = null;
  }

  function deleteProfile(profile: typeof settings.availabilityProfiles[0]) {
    if (confirm(`Delete profile "${profile.name}"?`)) {
      console.log('Deleting profile:', profile);
    }
  }

  // Skill functions
  function openSkillEdit(skill: typeof settings.skills[0]) {
    editingSkill = { ...skill };
    showSkillModal = true;
  }

  function saveSkill() {
    console.log('Saving skill:', editingSkill);
    showSkillModal = false;
    editingSkill = null;
  }

  function deleteSkill(skill: typeof settings.skills[0]) {
    if (confirm(`Delete skill "${skill.name}"?`)) {
      console.log('Deleting skill:', skill);
    }
  }

  // Sound functions
  function openSoundEdit(sound: typeof settings.sounds[0]) {
    editingSound = { ...sound };
    showSoundModal = true;
  }

  function saveSound() {
    console.log('Saving sound:', editingSound);
    showSoundModal = false;
    editingSound = null;
  }

  function deleteSound(sound: typeof settings.sounds[0]) {
    if (confirm(`Delete sound "${sound.tag}"?`)) {
      console.log('Deleting sound:', sound);
    }
  }

  function playSound(sound: typeof settings.sounds[0]) {
    if (playingSound === sound.id) {
      stopSound();
      return;
    }
    
    stopSound();
    playingSound = sound.id;
    
    // Create audio element and play the sound from Sapien API using sapienId
    const soundId = sound.sapienId || sound.id;
    audioElement = new Audio(`/api/sounds/${soundId}`);
    audioElement.onended = () => {
      playingSound = null;
    };
    audioElement.onerror = () => {
      console.error('Failed to play sound');
      playingSound = null;
    };
    audioElement.play().catch(err => {
      console.error('Audio playback error:', err);
      playingSound = null;
    });
  }

  function stopSound() {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    playingSound = null;
  }

  // Upload Modal Functions
  function openUploadModal() {
    uploadTag = '';
    uploadDescription = '';
    uploadFile = null;
    uploadError = null;
    uploadProgress = 0;
    isUploading = false;
    isDragging = false;
    previewAudioUrl = null;
    showUploadModal = true;
  }

  function closeUploadModal() {
    // Clean up preview URL
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      previewAudioUrl = null;
    }
    showUploadModal = false;
  }

  function handleFileDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  function handleFileInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      handleFileSelect(input.files[0]);
    }
  }

  function handleFileSelect(file: File) {
    uploadError = null;
    
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-wav', 'audio/wave'];
    if (!allowedTypes.includes(file.type)) {
      uploadError = `Unsupported format: ${file.type || 'unknown'}. Please use MP3, WAV, or OGG files.`;
      return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      uploadError = 'File size exceeds 10MB limit.';
      return;
    }
    
    // Clean up previous preview URL
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
    }
    
    uploadFile = file;
    previewAudioUrl = URL.createObjectURL(file);
    
    // Auto-fill tag from filename if empty
    if (!uploadTag) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      uploadTag = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    }
  }

  function removeSelectedFile() {
    uploadFile = null;
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      previewAudioUrl = null;
    }
  }

  async function submitUpload() {
    if (!uploadFile) {
      uploadError = 'Please select an audio file.';
      return;
    }
    
    if (!uploadTag.trim()) {
      uploadError = 'Please enter a tag/name for the sound.';
      return;
    }
    
    uploadError = null;
    isUploading = true;
    uploadProgress = 0;
    
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('tag', uploadTag.trim());
      formData.append('description', uploadDescription.trim());
      
      // Simulate progress (actual XHR progress would need XMLHttpRequest)
      const progressInterval = setInterval(() => {
        if (uploadProgress < 90) {
          uploadProgress += 10;
        }
      }, 200);
      
      const response = await fetch('/api/sounds/upload', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      uploadProgress = 100;
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }
      
      // Success - close modal and refresh
      setTimeout(() => {
        closeUploadModal();
        window.location.reload();
      }, 500);
      
    } catch (err) {
      uploadError = err instanceof Error ? err.message : 'Failed to upload sound file.';
      uploadProgress = 0;
    } finally {
      isUploading = false;
    }
  }

  function formatUploadSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // Column definitions for DataTables
  let profileColumns = $state<Column[]>([
    { key: 'name', label: 'Name', sortable: true },
    { key: 'sapienId', label: 'Sapien ID', sortable: true },
    { key: 'createdByName', label: 'Created By', sortable: true },
    { key: 'actions', label: 'Actions', width: '120px' },
  ]);

  let skillColumns = $state<Column[]>([
    { key: 'name', label: 'Name', sortable: true },
    { key: 'proficiency', label: 'Proficiency', sortable: true },
    { key: 'weight', label: 'Weight', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'actions', label: 'Actions', width: '120px' },
  ]);

  let soundColumns = $state<Column[]>([
    { key: 'tag', label: 'Tag', sortable: true },
    { key: 'description', label: 'Description' },
    { key: 'size', label: 'Size', sortable: true },
    { key: 'modified', label: 'Modified', sortable: true },
    { key: 'createdByName', label: 'Created By', sortable: true },
    { key: 'actions', label: 'Actions', width: '140px' },
  ]);

  function handleRefresh() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Account Settings | Natterbox AVS</title>
</svelte:head>

<div class="space-y-4">
  <!-- Demo Mode Banner -->
  {#if settings.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-3 flex items-center gap-3 text-sm">
      <FlaskConical class="w-4 h-4 flex-shrink-0" />
      <p>Demo Mode - changes will not be saved</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if settings.error && !settings.accountSettings?.holdMusic && !settings.isDemo}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-3 flex items-center gap-3 text-sm">
      <AlertCircle class="w-4 h-4 flex-shrink-0" />
      <p>{settings.error}</p>
    </div>
  {/if}

  <!-- Page Header with Actions -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-text-primary">Account Settings</h1>
      <p class="text-text-secondary text-sm mt-0.5">Configure organization-wide settings</p>
    </div>
    {#if activeTab === 'general' || activeTab === 'telephony' || activeTab === 'integrations'}
      <div class="flex items-center gap-2">
        {#if editMode}
          <Button variant="secondary" size="sm" onclick={cancelEdit}>
            <X class="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button variant="primary" size="sm" onclick={saveSettings}>
            <Save class="w-4 h-4 mr-1" />
            Save
          </Button>
        {:else}
          <Button variant="secondary" size="sm" onclick={enterEditMode}>
            <Edit class="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button variant="secondary" size="sm" onclick={handleRefresh}>
            <RefreshCw class="w-4 h-4 mr-1" />
            Refresh
          </Button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Tabs -->
  <Tabs {tabs} bind:activeTab variant="boxed" size="sm">
    {#if activeTab === 'general'}
      <div class="space-y-4">
        <!-- Core Settings Card -->
        <Card>
          {#snippet header()}
            <div class="flex items-center gap-2">
              <Settings class="w-4 h-4 text-primary-400" />
              <h3 class="font-semibold text-text-primary">Core Settings</h3>
            </div>
          {/snippet}

          <div class="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <!-- Hold Music -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-text-secondary">Hold Music</label>
              {#if editMode}
                <select class="input w-full" bind:value={formHoldMusic}>
                  {#each settings.presets?.holdMusic || [] as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <p class="text-sm text-text-primary font-medium">{settings.accountSettings?.holdMusic || '—'}</p>
              {/if}
            </div>

            <!-- Country -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-text-secondary">Country</label>
              {#if editMode}
                <select class="input w-full" bind:value={formCountryCode}>
                  {#each settings.presets?.countryCode || [] as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <p class="text-sm text-text-primary font-medium">{settings.accountSettings?.countryCodeLabel || '—'}</p>
              {/if}
            </div>

            <!-- Time Zone -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-text-secondary">Time Zone</label>
              {#if editMode}
                <select class="input w-full" bind:value={formTimeZone}>
                  {#each settings.presets?.timeZone || [] as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <p class="text-sm text-text-primary font-medium">{settings.accountSettings?.timeZone || '—'}</p>
              {/if}
            </div>

            <!-- Voice -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-text-secondary">Voice</label>
              {#if editMode}
                <select class="input w-full" bind:value={formVoice}>
                  {#each settings.presets?.voice || [] as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <p class="text-sm text-text-primary font-medium">{settings.accountSettings?.voiceLabel || '—'}</p>
              {/if}
            </div>

            <!-- Present Caller ID -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-text-secondary">Present Caller ID</label>
              {#if editMode}
                <Toggle bind:checked={formPresentCallerId} label="Enabled" size="sm" />
              {:else}
                <p class="text-sm flex items-center gap-1.5">
                  {#if settings.accountSettings?.presentCallerId}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                    <span class="text-text-primary">Enabled</span>
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                    <span class="text-text-secondary">Disabled</span>
                  {/if}
                </p>
              {/if}
            </div>

            <!-- External Caller ID -->
            <div class="space-y-1">
              <label class="text-xs font-medium text-text-secondary">External Caller ID</label>
              {#if editMode && formPresentCallerId}
                <input type="text" class="input w-full" bind:value={formExternalCallerIdNumber} placeholder="Phone number" />
              {:else}
                <p class="text-sm text-text-primary font-medium">
                  {settings.accountSettings?.presentCallerId ? (settings.accountSettings?.externalCallerIdNumber || '—') : '—'}
                </p>
              {/if}
            </div>
          </div>
        </Card>

        <!-- UI & General Settings -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            {#snippet header()}
              <div class="flex items-center gap-2">
                <Monitor class="w-4 h-4 text-primary-400" />
                <h3 class="font-semibold text-text-primary">UI Settings</h3>
              </div>
            {/snippet}

            <div class="space-y-1">
              <label class="text-xs font-medium text-text-secondary">List Page Size</label>
              {#if editMode}
                <select class="input max-w-[150px]" bind:value={formPageSize}>
                  {#each settings.presets?.pageSize || [] as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
              {:else}
                <p class="text-sm text-text-primary font-medium">{settings.uiSettings?.pageSize || '1000'}</p>
              {/if}
            </div>
          </Card>

          <Card>
            {#snippet header()}
              <div class="flex items-center gap-2">
                <Cog class="w-4 h-4 text-primary-400" />
                <h3 class="font-semibold text-text-primary">General Settings</h3>
              </div>
            {/snippet}

            <div class="space-y-3">
              {#if editMode}
                <Toggle bind:checked={formAutoDeactivateUsers} label="Auto Deactivate Users" size="sm" />
                <Toggle bind:checked={formPermissionsManagement} label="SF Permission Management" size="sm" />
              {:else}
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.autoDeactivateUsers}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Auto Deactivate Users</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if settings.accountSettings?.permissionsLevelManagementViaSF}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">SF Permission Management</span>
                </div>
              {/if}
            </div>
          </Card>
        </div>
      </div>
    {:else if activeTab === 'telephony'}
      <div class="space-y-2">
        <!-- CTI Settings -->
        <div class="border border-border rounded-lg overflow-hidden">
          <button
            class="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            onclick={() => toggleSection('cti', telephonyOpen, v => telephonyOpen = v)}
          >
            <div class="flex items-center gap-2">
              <Phone class="w-4 h-4 text-primary-400" />
              <span class="font-medium text-text-primary">CTI Settings</span>
            </div>
            <ChevronDown class="w-4 h-4 text-text-secondary transition-transform {telephonyOpen.includes('cti') ? 'rotate-180' : ''}" />
          </button>
          {#if telephonyOpen.includes('cti')}
            <div class="p-4 border-t border-border grid grid-cols-2 gap-x-6 gap-y-3">
              {#if editMode}
                <Toggle bind:checked={formTrackCTI} label="Track CTI Device for New Users" size="sm" />
                <Toggle bind:checked={formShowNumberLabel} label="Show Number Label in Caller ID" size="sm" />
                <Toggle bind:checked={formEnhancedWrapup} label="Enable Enhanced Wrap-Up" size="sm" />
                <Toggle bind:checked={formOptimizedTransfer} label="Optimized Transfer" size="sm" />
              {:else}
                <div class="flex items-center gap-2">
                  {#if settings.accountSettings?.newUsersTrackCTIDevice}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Track CTI Device for New Users</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.showNumberLabelInMyCallerId}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Show Number Label in Caller ID</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.enableEnhancedWrapup}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Enable Enhanced Wrap-Up</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.optimizedTransfer}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Optimized Transfer</span>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Recording Access -->
        <div class="border border-border rounded-lg overflow-hidden">
          <button
            class="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            onclick={() => toggleSection('recording', telephonyOpen, v => telephonyOpen = v)}
          >
            <div class="flex items-center gap-2">
              <Shield class="w-4 h-4 text-primary-400" />
              <span class="font-medium text-text-primary">Recording Access</span>
            </div>
            <ChevronDown class="w-4 h-4 text-text-secondary transition-transform {telephonyOpen.includes('recording') ? 'rotate-180' : ''}" />
          </button>
          {#if telephonyOpen.includes('recording')}
            <div class="p-4 border-t border-border">
              {#if editMode}
                <Toggle bind:checked={formAccessOwnRecordings} label="Access Own Recordings" description="Allow users to access their own call recordings" size="sm" />
              {:else}
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.accessOwnRecordings}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <div>
                    <span class="text-sm text-text-primary">Access Own Recordings</span>
                    <p class="text-xs text-text-secondary">Allow users to access their own call recordings</p>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Call Reporting -->
        <div class="border border-border rounded-lg overflow-hidden">
          <button
            class="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            onclick={() => toggleSection('reporting', telephonyOpen, v => telephonyOpen = v)}
          >
            <div class="flex items-center gap-2">
              <BarChart3 class="w-4 h-4 text-primary-400" />
              <span class="font-medium text-text-primary">Call Reporting</span>
            </div>
            <ChevronDown class="w-4 h-4 text-text-secondary transition-transform {telephonyOpen.includes('reporting') ? 'rotate-180' : ''}" />
          </button>
          {#if telephonyOpen.includes('reporting')}
            <div class="p-4 border-t border-border grid grid-cols-2 gap-x-6 gap-y-3">
              {#if editMode}
                <Toggle bind:checked={formContactLookup} label="Enable Contact Lookup" size="sm" />
                <Toggle bind:checked={formAccountLookup} label="Enable Account Lookup" size="sm" />
                <Toggle bind:checked={formLeadLookup} label="Enable Lead Lookup" size="sm" />
                <Toggle bind:checked={formSkillsReporting} label="Enable Skills Reporting" size="sm" />
              {:else}
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.contactLookupEnable}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Enable Contact Lookup</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.accountLookupEnable}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Enable Account Lookup</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.leadLookupEnable}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Enable Lead Lookup</span>
                </div>
                <div class="flex items-center gap-2">
                  {#if settings.orgSettings?.enableSkillsReporting}
                    <CheckCircle2 class="w-4 h-4 text-success" />
                  {:else}
                    <XCircle class="w-4 h-4 text-gray-500" />
                  {/if}
                  <span class="text-sm text-text-primary">Enable Skills Reporting</span>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {:else if activeTab === 'integrations'}
      <div class="space-y-2">
        <!-- Service Cloud Voice -->
        <div class="border border-border rounded-lg overflow-hidden">
          <button
            class="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
            onclick={() => toggleSection('scv', integrationOpen, v => integrationOpen = v)}
          >
            <div class="flex items-center gap-2">
              <Cloud class="w-4 h-4 text-primary-400" />
              <span class="font-medium text-text-primary">Service Cloud Voice</span>
            </div>
            <ChevronDown class="w-4 h-4 text-text-secondary transition-transform {integrationOpen.includes('scv') ? 'rotate-180' : ''}" />
          </button>
          {#if integrationOpen.includes('scv')}
            <div class="p-4 border-t border-border space-y-4">
              <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                {#if editMode}
                  <Toggle checked={settings.orgSettings?.scvnbaEnabled || false} label="Next Best Action Integration" size="sm" />
                  <Toggle checked={settings.orgSettings?.scvMissedCallNotificationsEnabled || false} label="Missed Call Notifications" size="sm" />
                {:else}
                  <div class="flex items-center gap-2">
                    {#if settings.orgSettings?.scvnbaEnabled}
                      <CheckCircle2 class="w-4 h-4 text-success" />
                    {:else}
                      <XCircle class="w-4 h-4 text-gray-500" />
                    {/if}
                    <span class="text-sm text-text-primary">Next Best Action Integration</span>
                  </div>
                  <div class="flex items-center gap-2">
                    {#if settings.orgSettings?.scvMissedCallNotificationsEnabled}
                      <CheckCircle2 class="w-4 h-4 text-success" />
                    {:else}
                      <XCircle class="w-4 h-4 text-gray-500" />
                    {/if}
                    <span class="text-sm text-text-primary">Missed Call Notifications</span>
                  </div>
                {/if}
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-text-secondary">Transcription Batch Size</label>
                  {#if editMode}
                    <select class="input w-full">
                      {#each settings.presets?.batchSize || [] as option}
                        <option value={option.value} selected={option.value === String(settings.orgSettings?.scvnbaTranscriptionBatchSize)}>
                          {option.label}
                        </option>
                      {/each}
                    </select>
                  {:else}
                    <p class="text-sm text-text-primary font-medium">{settings.orgSettings?.scvnbaTranscriptionBatchSize || '1'}</p>
                  {/if}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-text-secondary">Transcription Language</label>
                  {#if editMode}
                    <select class="input w-full">
                      {#each settings.presets?.transcriptionLanguage || [] as option}
                        <option value={option.value} selected={option.value === settings.orgSettings?.transcriptionLanguage}>
                          {option.label}
                        </option>
                      {/each}
                    </select>
                  {:else}
                    <p class="text-sm text-text-primary font-medium">{settings.orgSettings?.transcriptionLanguage || '—'}</p>
                  {/if}
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                <Button variant="secondary" size="sm">Sync Configuration</Button>
                <Button variant="secondary" size="sm">Add Existing SCV Users</Button>
                <Button variant="secondary" size="sm">Add Existing Groups</Button>
              </div>
            </div>
          {/if}
        </div>

        <!-- Messaging Settings -->
        {#if settings.license?.sms || settings.license?.whatsApp}
          <div class="border border-border rounded-lg overflow-hidden">
            <button
              class="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
              onclick={() => toggleSection('messaging', integrationOpen, v => integrationOpen = v)}
            >
              <div class="flex items-center gap-2">
                <MessageSquare class="w-4 h-4 text-primary-400" />
                <span class="font-medium text-text-primary">Messaging</span>
              </div>
              <ChevronDown class="w-4 h-4 text-text-secondary transition-transform {integrationOpen.includes('messaging') ? 'rotate-180' : ''}" />
            </button>
            {#if integrationOpen.includes('messaging')}
              <div class="p-4 border-t border-border grid grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-text-secondary">Temporary Consent Duration</label>
                  {#if editMode}
                    <select class="input w-full">
                      {#each settings.presets?.consentDuration || [] as option}
                        <option value={option.value} selected={option.value === settings.orgSettings?.temporaryConsentDuration}>
                          {option.label}
                        </option>
                      {/each}
                    </select>
                  {:else}
                    <p class="text-sm text-text-primary font-medium">{settings.orgSettings?.temporaryConsentDuration || '24'} hours</p>
                  {/if}
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-text-secondary">Reporting Interval</label>
                  <p class="text-sm text-text-primary font-medium">{settings.accountSettings?.reportingInterval || 48} hours</p>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- AI Advisor Settings -->
        {#if settings.license?.insights}
          <div class="border border-border rounded-lg overflow-hidden">
            <button
              class="w-full flex items-center justify-between p-3 bg-bg-secondary hover:bg-bg-tertiary transition-colors"
              onclick={() => toggleSection('ai', integrationOpen, v => integrationOpen = v)}
            >
              <div class="flex items-center gap-2">
                <Sparkles class="w-4 h-4 text-primary-400" />
                <span class="font-medium text-text-primary">AI Advisor</span>
              </div>
              <ChevronDown class="w-4 h-4 text-text-secondary transition-transform {integrationOpen.includes('ai') ? 'rotate-180' : ''}" />
            </button>
            {#if integrationOpen.includes('ai')}
              <div class="p-4 border-t border-border space-y-4">
                <div class="grid grid-cols-2 gap-x-6 gap-y-3">
                  {#if editMode}
                    <Toggle checked={settings.accountSettings?.controlByRecordingAccess || false} label="Control by Recording Access" size="sm" />
                    <Toggle checked={settings.accountSettings?.enableEndUserAccessAllInsights || false} label="End User AI Advisor Access" size="sm" />
                    <Toggle checked={settings.orgSettings?.callSummarization || false} label="Call Summarization" size="sm" />
                  {:else}
                    <div class="flex items-center gap-2">
                      {#if settings.accountSettings?.controlByRecordingAccess}
                        <CheckCircle2 class="w-4 h-4 text-success" />
                      {:else}
                        <XCircle class="w-4 h-4 text-gray-500" />
                      {/if}
                      <span class="text-sm text-text-primary">Control by Recording Access</span>
                    </div>
                    <div class="flex items-center gap-2">
                      {#if settings.accountSettings?.enableEndUserAccessAllInsights}
                        <CheckCircle2 class="w-4 h-4 text-success" />
                      {:else}
                        <XCircle class="w-4 h-4 text-gray-500" />
                      {/if}
                      <span class="text-sm text-text-primary">End User AI Advisor Access</span>
                    </div>
                    <div class="flex items-center gap-2">
                      {#if settings.orgSettings?.callSummarization}
                        <CheckCircle2 class="w-4 h-4 text-success" />
                      {:else}
                        <XCircle class="w-4 h-4 text-gray-500" />
                      {/if}
                      <span class="text-sm text-text-primary">Call Summarization</span>
                    </div>
                  {/if}
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-text-secondary">Transcription Language</label>
                    {#if editMode}
                      <select class="input w-full">
                        {#each settings.presets?.transcriptionLanguage || [] as option}
                          <option value={option.value} selected={option.value === settings.orgSettings?.insightTranscriptionLanguage}>
                            {option.label}
                          </option>
                        {/each}
                      </select>
                    {:else}
                      <p class="text-sm text-text-primary font-medium">{settings.orgSettings?.insightTranscriptionLanguage || '—'}</p>
                    {/if}
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-text-secondary">Transcription Provider</label>
                    <p class="text-sm text-text-primary font-medium">{settings.orgSettings?.transcriptionProvider || '—'}</p>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else if activeTab === 'profiles'}
      <!-- Availability Profiles Tab -->
      <div class="flex flex-col gap-4 h-full">
        <div class="flex items-center justify-between">
          <p class="text-sm text-text-secondary">Manage availability profiles for users</p>
          {#if settings.license?.manager}
            <Button variant="primary" size="sm" onclick={() => { editingProfile = { id: '', sapienId: 0, name: '', createdById: '', createdByName: '' }; showProfileModal = true; }}>
              <Plus class="w-3.5 h-3.5 mr-1" />
              New Profile
            </Button>
          {:else}
            <Badge variant="warning" size="sm">Manager License Required</Badge>
          {/if}
        </div>
        
        <DataTable
          data={settings.availabilityProfiles || []}
          columns={profileColumns}
          searchable
          searchPlaceholder="Search profiles..."
          paginated
          pageSize={15}
          onRefresh={handleRefresh}
          emptyMessage="No availability profiles found"
        >
          {#snippet cell(column, row)}
            {#if column.key === 'name'}
              <button onclick={() => openProfileEdit(row)} class="text-primary-400 hover:text-primary-300 hover:underline font-medium text-left">{row.name}</button>
            {:else if column.key === 'sapienId'}
              <span class="font-mono text-xs text-text-secondary">{row.sapienId}</span>
            {:else if column.key === 'createdByName'}
              <span class="text-text-primary">{row.createdByName}</span>
            {:else if column.key === 'actions'}
              <div class="flex items-center gap-1">
                <button onclick={() => openProfileEdit(row)} class="p-1.5 rounded hover:bg-bg-tertiary text-primary-400 hover:text-primary-300" title="Edit">
                  <Edit class="w-3.5 h-3.5" />
                </button>
                <button onclick={() => deleteProfile(row)} class="p-1.5 rounded hover:bg-bg-tertiary text-error hover:text-red-400" title="Delete">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            {:else}
              {row[column.key] ?? '—'}
            {/if}
          {/snippet}
        </DataTable>
      </div>
    {:else if activeTab === 'skills'}
      <!-- Skills Tab -->
      <div class="flex flex-col gap-4 h-full">
        <div class="flex items-center justify-between">
          <p class="text-sm text-text-secondary">Define skills for routing and reporting</p>
          <Button variant="primary" size="sm" onclick={() => { editingSkill = { id: '', sapienId: 0, name: '', description: '', proficiency: 'No knowledge', weight: 0 }; showSkillModal = true; }}>
            <Plus class="w-3.5 h-3.5 mr-1" />
            New Skill
          </Button>
        </div>
        
        <DataTable
          data={settings.skills || []}
          columns={skillColumns}
          searchable
          searchPlaceholder="Search skills..."
          paginated
          pageSize={15}
          onRefresh={handleRefresh}
          emptyMessage="No skills found"
        >
          {#snippet cell(column, row)}
            {#if column.key === 'name'}
              <button onclick={() => openSkillEdit(row)} class="text-primary-400 hover:text-primary-300 hover:underline font-medium text-left">{row.name}</button>
            {:else if column.key === 'proficiency'}
              <Badge variant={row.weight > 0 ? 'success' : 'neutral'} size="sm">{row.proficiency}</Badge>
            {:else if column.key === 'weight'}
              <span class="font-mono text-sm text-text-primary">{row.weight}</span>
            {:else if column.key === 'description'}
              <span class="text-text-secondary text-sm truncate max-w-xs block">{row.description || '—'}</span>
            {:else if column.key === 'actions'}
              <div class="flex items-center gap-1">
                <button onclick={() => openSkillEdit(row)} class="p-1.5 rounded hover:bg-bg-tertiary text-primary-400 hover:text-primary-300" title="Edit">
                  <Edit class="w-3.5 h-3.5" />
                </button>
                <button onclick={() => deleteSkill(row)} class="p-1.5 rounded hover:bg-bg-tertiary text-error hover:text-red-400" title="Delete">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            {:else}
              {row[column.key] ?? '—'}
            {/if}
          {/snippet}
        </DataTable>
      </div>
    {:else if activeTab === 'sounds'}
      <!-- Sounds Tab -->
      <div class="flex flex-col gap-4 h-full">
        <div class="flex items-center justify-between">
          <p class="text-sm text-text-secondary">Manage audio files for IVR and hold music</p>
          <Button variant="primary" size="sm" onclick={openUploadModal}>
            <Upload class="w-3.5 h-3.5 mr-1" />
            Upload Sound
          </Button>
        </div>
        
        <DataTable
          data={settings.sounds || []}
          columns={soundColumns}
          searchable
          searchPlaceholder="Search sounds by tag..."
          paginated
          pageSize={15}
          onRefresh={handleRefresh}
          emptyMessage="No sounds found"
        >
          {#snippet cell(column, row)}
            {#if column.key === 'tag'}
              <button onclick={() => openSoundEdit(row)} class="text-primary-400 hover:text-primary-300 hover:underline font-medium text-left">{row.tag}</button>
            {:else if column.key === 'description'}
              <span class="text-text-secondary text-sm truncate max-w-xs block">{row.description || '—'}</span>
            {:else if column.key === 'size'}
              <span class="text-sm text-text-primary">{formatFileSize(row.size)}</span>
            {:else if column.key === 'modified'}
              <span class="text-sm text-text-secondary">{formatDate(row.modified)}</span>
            {:else if column.key === 'createdByName'}
              <span class="text-sm text-text-primary">{row.createdByName}</span>
            {:else if column.key === 'actions'}
              <div class="flex items-center gap-1">
                <button onclick={() => playSound(row)} class="p-1.5 rounded hover:bg-bg-tertiary {playingSound === row.id ? 'text-success' : 'text-primary-400 hover:text-primary-300'}" title={playingSound === row.id ? 'Stop' : 'Play'}>
                  {#if playingSound === row.id}
                    <Square class="w-3.5 h-3.5" />
                  {:else}
                    <Play class="w-3.5 h-3.5" />
                  {/if}
                </button>
                <button onclick={() => openSoundEdit(row)} class="p-1.5 rounded hover:bg-bg-tertiary text-primary-400 hover:text-primary-300" title="Edit">
                  <Edit class="w-3.5 h-3.5" />
                </button>
                <button onclick={() => deleteSound(row)} class="p-1.5 rounded hover:bg-bg-tertiary text-error hover:text-red-400" title="Delete">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            {:else}
              {row[column.key] ?? '—'}
            {/if}
          {/snippet}
        </DataTable>
      </div>
    {/if}
  </Tabs>
</div>

<!-- Profile Edit Modal -->
{#if showProfileModal && editingProfile}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => showProfileModal = false}>
    <div class="bg-bg-primary border border-border rounded-lg shadow-xl w-full max-w-md" onclick={(e) => e.stopPropagation()}>
      <div class="p-4 border-b border-border flex items-center justify-between">
        <h3 class="font-semibold text-text-primary">{editingProfile.id ? 'Edit Profile' : 'New Profile'}</h3>
        <button onclick={() => showProfileModal = false} class="text-text-secondary hover:text-text-primary">
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="p-4 space-y-4">
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Name</label>
          <input type="text" class="input w-full" bind:value={editingProfile.name} placeholder="Profile name" />
        </div>
        {#if editingProfile.id}
          <div class="space-y-1">
            <label class="text-xs font-medium text-text-secondary">Sapien ID</label>
            <p class="text-sm text-text-primary font-mono">{editingProfile.sapienId}</p>
          </div>
        {/if}
      </div>
      <div class="p-4 border-t border-border flex justify-end gap-2">
        <Button variant="secondary" size="sm" onclick={() => showProfileModal = false}>Cancel</Button>
        <Button variant="primary" size="sm" onclick={saveProfile}>Save</Button>
      </div>
    </div>
  </div>
{/if}

<!-- Skill Edit Modal -->
{#if showSkillModal && editingSkill}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => showSkillModal = false}>
    <div class="bg-bg-primary border border-border rounded-lg shadow-xl w-full max-w-md" onclick={(e) => e.stopPropagation()}>
      <div class="p-4 border-b border-border flex items-center justify-between">
        <h3 class="font-semibold text-text-primary">{editingSkill.id ? 'Edit Skill' : 'New Skill'}</h3>
        <button onclick={() => showSkillModal = false} class="text-text-secondary hover:text-text-primary">
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="p-4 space-y-4">
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Name</label>
          <input type="text" class="input w-full" bind:value={editingSkill.name} placeholder="Skill name" />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Description</label>
          <textarea class="input w-full" bind:value={editingSkill.description} placeholder="Description" rows="2"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <label class="text-xs font-medium text-text-secondary">Proficiency</label>
            <select class="input w-full" bind:value={editingSkill.proficiency}>
              <option value="No knowledge">No knowledge</option>
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-medium text-text-secondary">Weight</label>
            <input type="number" class="input w-full" bind:value={editingSkill.weight} min="0" max="100" />
          </div>
        </div>
      </div>
      <div class="p-4 border-t border-border flex justify-end gap-2">
        <Button variant="secondary" size="sm" onclick={() => showSkillModal = false}>Cancel</Button>
        <Button variant="primary" size="sm" onclick={saveSkill}>Save</Button>
      </div>
    </div>
  </div>
{/if}

<!-- Sound Edit Modal (for editing existing sounds) -->
{#if showSoundModal && editingSound}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => showSoundModal = false}>
    <div class="bg-bg-primary border border-border rounded-lg shadow-xl w-full max-w-md" onclick={(e) => e.stopPropagation()}>
      <div class="p-4 border-b border-border flex items-center justify-between">
        <h3 class="font-semibold text-text-primary">Edit Sound</h3>
        <button onclick={() => showSoundModal = false} class="text-text-secondary hover:text-text-primary">
          <X class="w-5 h-5" />
        </button>
      </div>
      <div class="p-4 space-y-4">
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Tag</label>
          <input type="text" class="input w-full" bind:value={editingSound.tag} placeholder="Sound tag" />
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Description</label>
          <textarea class="input w-full" bind:value={editingSound.description} placeholder="Description" rows="2"></textarea>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Size</label>
          <p class="text-sm text-text-primary">{formatFileSize(editingSound.size)}</p>
        </div>
      </div>
      <div class="p-4 border-t border-border flex justify-end gap-2">
        <Button variant="secondary" size="sm" onclick={() => showSoundModal = false}>Cancel</Button>
        <Button variant="primary" size="sm" onclick={saveSound}>Save</Button>
      </div>
    </div>
  </div>
{/if}

<!-- Upload Sound Modal -->
{#if showUploadModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeUploadModal}>
    <div class="bg-bg-primary border border-border rounded-lg shadow-xl w-full max-w-lg" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="p-4 border-b border-border flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Upload class="w-5 h-5 text-primary-400" />
          <h3 class="font-semibold text-text-primary">Upload Sound File</h3>
        </div>
        <button onclick={closeUploadModal} class="text-text-secondary hover:text-text-primary" disabled={isUploading}>
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <!-- Content -->
      <div class="p-4 space-y-4">
        <!-- Error Alert -->
        {#if uploadError}
          <div class="bg-error/10 border border-error/20 text-error rounded-base p-3 flex items-center gap-2 text-sm">
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        {/if}

        <!-- Drop Zone -->
        {#if !uploadFile}
          <div 
            class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {isDragging ? 'border-primary-400 bg-primary-400/5' : 'border-border hover:border-primary-400/50'}"
            ondragover={(e) => { e.preventDefault(); isDragging = true; }}
            ondragleave={() => isDragging = false}
            ondrop={handleFileDrop}
          >
            <div class="flex flex-col items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center">
                <Music class="w-6 h-6 text-text-secondary" />
              </div>
              <div>
                <p class="text-text-primary font-medium">Drag & drop your audio file here</p>
                <p class="text-text-secondary text-sm mt-1">or click to browse</p>
              </div>
              <label class="cursor-pointer">
                <input 
                  type="file" 
                  class="hidden" 
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3,.mp3,.wav,.ogg"
                  onchange={handleFileInput}
                />
                <span class="inline-flex items-center gap-1.5 px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-base text-sm font-medium text-text-primary transition-colors">
                  <File class="w-4 h-4" />
                  Browse Files
                </span>
              </label>
              <p class="text-text-tertiary text-xs">Supported formats: MP3, WAV, OGG (max 10MB)</p>
            </div>
          </div>
        {:else}
          <!-- Selected File Preview -->
          <div class="border border-border rounded-lg p-4 bg-bg-secondary">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary-400/10 flex items-center justify-center flex-shrink-0">
                <Music class="w-5 h-5 text-primary-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-text-primary font-medium truncate">{uploadFile.name}</p>
                <p class="text-text-secondary text-sm">{formatUploadSize(uploadFile.size)} • {uploadFile.type || 'audio'}</p>
              </div>
              <button 
                onclick={removeSelectedFile} 
                class="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-error"
                disabled={isUploading}
              >
                <X class="w-4 h-4" />
              </button>
            </div>
            
            <!-- Audio Preview -->
            {#if previewAudioUrl}
              <div class="mt-3 pt-3 border-t border-border">
                <audio controls class="w-full h-8" src={previewAudioUrl}>
                  <track kind="captions" />
                </audio>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Tag Input -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Tag / Name <span class="text-error">*</span></label>
          <input 
            type="text" 
            class="input w-full" 
            bind:value={uploadTag} 
            placeholder="e.g., WelcomeMessage, HoldMusic"
            disabled={isUploading}
            maxlength="50"
          />
          <p class="text-text-tertiary text-xs">A unique identifier for this sound (letters, numbers, underscores)</p>
        </div>

        <!-- Description Input -->
        <div class="space-y-1">
          <label class="text-xs font-medium text-text-secondary">Description</label>
          <textarea 
            class="input w-full" 
            bind:value={uploadDescription} 
            placeholder="Optional description of the sound file"
            rows="2"
            disabled={isUploading}
          ></textarea>
        </div>

        <!-- Upload Progress -->
        {#if isUploading}
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-text-secondary">Uploading...</span>
              <span class="text-primary-400 font-medium">{uploadProgress}%</span>
            </div>
            <div class="h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div 
                class="h-full bg-primary-400 transition-all duration-300"
                style="width: {uploadProgress}%"
              ></div>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-border flex justify-end gap-2">
        <Button variant="secondary" size="sm" onclick={closeUploadModal} disabled={isUploading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          size="sm" 
          onclick={submitUpload}
          disabled={isUploading || !uploadFile || !uploadTag.trim()}
        >
          {#if isUploading}
            <Loader2 class="w-4 h-4 mr-1.5 animate-spin" />
            Uploading...
          {:else}
            <Upload class="w-4 h-4 mr-1.5" />
            Upload Sound
          {/if}
        </Button>
      </div>
    </div>
  </div>
{/if}
