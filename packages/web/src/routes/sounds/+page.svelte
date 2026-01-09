<script lang="ts">
  import { enhance } from '$app/forms';
  import { Card, Badge, Button, Input } from '$lib/components/ui';
  import { 
    Volume2, 
    Plus, 
    Trash2, 
    Play, 
    Pause, 
    Upload, 
    Mic, 
    Clock, 
    AlertCircle, 
    FlaskConical,
    FileAudio,
    Settings,
    X,
    Loader2,
  } from 'lucide-svelte';
  import type { SoundsPageData } from './+page.server';
  import type { ActionData } from './$types';
  
  interface Props {
    data: SoundsPageData;
    form: ActionData;
  }
  
  let { data, form }: Props = $props();
  
  // Modal state
  let showCreateModal = $state(false);
  let newName = $state('');
  let newText = $state('');
  let newVoiceId = $state('');
  let newDescription = $state('');
  let isCreating = $state(false);
  
  // Delete confirmation
  let deleteConfirmId = $state<string | null>(null);
  
  // Audio playback
  let playingId = $state<string | null>(null);
  let loadingId = $state<string | null>(null);
  let audioElement: HTMLAudioElement | null = $state(null);
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
  
  function formatDuration(seconds: number | undefined): string {
    if (!seconds) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  function formatFileSize(bytes: number | undefined): string {
    if (!bytes) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  
  function getTypeIcon(type: string) {
    switch (type) {
      case 'tts': return Mic;
      case 'upload': return Upload;
      default: return FileAudio;
    }
  }
  
  function getTypeBadgeVariant(type: string): 'accent' | 'success' | 'neutral' {
    switch (type) {
      case 'tts': return 'accent';
      case 'upload': return 'success';
      default: return 'neutral';
    }
  }
  
  function togglePlay(soundId: string, audioUrl?: string) {
    if (playingId === soundId) {
      // Stop playing
      audioElement?.pause();
      playingId = null;
      loadingId = null;
    } else {
      // Start playing (demo mode doesn't have real audio)
      if (audioUrl) {
        loadingId = soundId;
        audioElement = new Audio(audioUrl);
        audioElement.oncanplaythrough = () => {
          loadingId = null;
          playingId = soundId;
        };
        audioElement.onended = () => {
          playingId = null;
          loadingId = null;
        };
        audioElement.onerror = () => {
          loadingId = null;
          playingId = null;
        };
        audioElement.play().catch(() => {
          loadingId = null;
        });
      } else {
        // Demo mode - no real audio
        playingId = soundId;
        
        // Auto-stop after simulated duration for demo
        setTimeout(() => {
          playingId = null;
        }, 2000);
      }
    }
  }
  
  function resetForm() {
    newName = '';
    newText = '';
    newVoiceId = '';
    newDescription = '';
    showCreateModal = false;
    isCreating = false;
  }
  
  // Group voices by language
  const voicesByLanguage = $derived(() => {
    const groups: Record<string, typeof data.voices> = {};
    for (const voice of data.voices) {
      const lang = voice.language || 'Other';
      if (!groups[lang]) {
        groups[lang] = [];
      }
      groups[lang].push(voice);
    }
    return groups;
  });
</script>

<svelte:head>
  <title>Sounds | Natterbox AVS</title>
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

  <!-- Success Banner -->
  {#if form?.success}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-4 flex items-center gap-3">
      <Volume2 class="w-5 h-5 flex-shrink-0" />
      <p>Sound saved successfully</p>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Sounds</h1>
      <p class="text-text-secondary mt-1">Manage TTS prompts and audio files</p>
    </div>
    <div class="flex gap-2">
      <Button variant="secondary" onclick={() => showCreateModal = true}>
        <Mic class="w-4 h-4 mr-2" />
        Create TTS
      </Button>
      <Button variant="primary">
        <Upload class="w-4 h-4 mr-2" />
        Upload Audio
      </Button>
    </div>
  </div>

  <!-- Stats Overview -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-accent/10 rounded-base">
          <Volume2 class="w-6 h-6 text-text-primary" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.sounds.length}</p>
          <p class="text-sm text-text-secondary">Total Sounds</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-blue-500/10 rounded-base">
          <Mic class="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.sounds.filter(s => s.type === 'tts').length}</p>
          <p class="text-sm text-text-secondary">TTS Generated</p>
        </div>
      </div>
    </Card>
    <Card>
      <div class="flex items-center gap-3">
        <div class="p-3 bg-green-500/10 rounded-base">
          <Upload class="w-6 h-6 text-green-400" />
        </div>
        <div>
          <p class="text-2xl font-bold">{data.sounds.filter(s => s.type === 'upload').length}</p>
          <p class="text-sm text-text-secondary">Uploaded Files</p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Sounds List -->
  <Card>
    {#snippet header()}
      <div class="flex items-center gap-2">
        <Volume2 class="w-5 h-5 text-text-primary" />
        <h2 class="font-semibold">Sound Library</h2>
      </div>
    {/snippet}
    
    {#if data.sounds.length > 0}
      <div class="space-y-3">
        {#each data.sounds as sound}
          {@const TypeIcon = getTypeIcon(sound.type)}
          <div class="p-4 bg-bg-secondary rounded-base border border-border hover:border-accent transition-colors">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <!-- Play Button -->
                <button
                  type="button"
                  onclick={() => togglePlay(sound.id, sound.audioUrl)}
                  class="p-3 bg-accent/10 hover:bg-accent/20 rounded-full transition-colors"
                  disabled={loadingId === sound.id}
                >
                  {#if loadingId === sound.id}
                    <Loader2 class="w-5 h-5 text-text-primary animate-spin" />
                  {:else if playingId === sound.id}
                    <Pause class="w-5 h-5 text-text-primary" />
                  {:else}
                    <Play class="w-5 h-5 text-text-primary" />
                  {/if}
                </button>
                
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium">{sound.name}</span>
                    <Badge variant={getTypeBadgeVariant(sound.type)}>
                      <TypeIcon class="w-3 h-3 mr-1" />
                      {sound.type.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {#if sound.description}
                    <p class="text-sm text-text-secondary">{sound.description}</p>
                  {/if}
                  
                  {#if sound.metadata?.text}
                    <p class="text-sm text-text-secondary mt-1 italic">
                      "{sound.metadata.text}"
                    </p>
                  {/if}
                  
                  <div class="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span class="flex items-center gap-1">
                      <Clock class="w-3 h-3" />
                      {formatDuration(sound.duration)}
                    </span>
                    {#if sound.size}
                      <span>{formatFileSize(sound.size)}</span>
                    {/if}
                    {#if sound.metadata?.language}
                      <span>{sound.metadata.language}</span>
                    {/if}
                    <span>Created {formatDate(sound.createdAt)}</span>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Settings class="w-4 h-4" />
                </Button>
                
                {#if deleteConfirmId === sound.id}
                  <div class="flex items-center gap-1">
                    <form method="POST" action="?/delete" use:enhance>
                      <input type="hidden" name="soundId" value={sound.id} />
                      <Button type="submit" variant="ghost" size="sm" class="text-error">
                        Confirm
                      </Button>
                    </form>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onclick={() => deleteConfirmId = null}
                    >
                      Cancel
                    </Button>
                  </div>
                {:else}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onclick={() => deleteConfirmId = sound.id}
                  >
                    <Trash2 class="w-4 h-4 text-error" />
                  </Button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12 text-text-secondary">
        <Volume2 class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No sounds available.</p>
        <p class="text-sm mt-2">Create a TTS prompt or upload an audio file to get started.</p>
        <div class="flex justify-center gap-3 mt-4">
          <Button variant="secondary" onclick={() => showCreateModal = true}>
            <Mic class="w-4 h-4 mr-2" />
            Create TTS
          </Button>
          <Button variant="primary">
            <Upload class="w-4 h-4 mr-2" />
            Upload Audio
          </Button>
        </div>
      </div>
    {/if}
  </Card>
</div>

<!-- Create TTS Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onclick={resetForm}
      onkeydown={(e) => e.key === 'Escape' && resetForm()}
      role="button"
      tabindex="0"
    ></div>
    
    <!-- Modal -->
    <div class="relative z-10 bg-bg-secondary rounded-lg shadow-xl max-w-lg w-full mx-4 border border-border">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h2 class="text-lg font-semibold">Create TTS Sound</h2>
        <button 
          onclick={resetForm}
          class="p-1 hover:bg-bg-tertiary rounded"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
      
      <form 
        method="POST" 
        action="?/create"
        use:enhance={() => {
          isCreating = true;
          return async ({ update }) => {
            await update();
            isCreating = false;
            if (!form?.error) {
              resetForm();
            }
          };
        }}
        class="p-4 space-y-4"
      >
        <div>
          <label for="name" class="block text-sm font-medium mb-1">Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            bind:value={newName}
            class="input w-full"
            placeholder="e.g., Welcome Message"
            required
          />
        </div>
        
        <div>
          <label for="voiceId" class="block text-sm font-medium mb-1">Voice *</label>
          <select
            id="voiceId"
            name="voiceId"
            bind:value={newVoiceId}
            class="input w-full"
            required
          >
            <option value="">Select a voice...</option>
            {#each Object.entries(voicesByLanguage()) as [language, voices]}
              <optgroup label={language}>
                {#each voices as voice}
                  <option value={voice.id}>
                    {voice.name} ({voice.gender}) {voice.neural ? '🧠' : ''}
                  </option>
                {/each}
              </optgroup>
            {/each}
          </select>
        </div>
        
        <div>
          <label for="text" class="block text-sm font-medium mb-1">Text to Speak *</label>
          <textarea
            id="text"
            name="text"
            bind:value={newText}
            class="input w-full"
            rows="4"
            placeholder="Enter the text to be converted to speech..."
            required
          ></textarea>
          <p class="text-xs text-text-secondary mt-1">
            You can use variables like {`{{caller_name}}`} or {`{{position}}`}
          </p>
        </div>
        
        <div>
          <label for="description" class="block text-sm font-medium mb-1">Description</label>
          <input
            id="description"
            name="description"
            type="text"
            bind:value={newDescription}
            class="input w-full"
            placeholder="Optional description..."
          />
        </div>
        
        <div class="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onclick={resetForm}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isCreating || !newName || !newVoiceId || !newText}>
            {isCreating ? 'Creating...' : 'Create Sound'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}

