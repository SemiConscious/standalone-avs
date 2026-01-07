<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import {
    FileText,
    Search,
    Play,
    Pause,
    Download,
    FlaskConical,
    AlertCircle,
    PhoneIncoming,
    PhoneOutgoing,
    Phone,
    User,
    Clock,
    Volume2,
    X,
    Zap,
  } from 'lucide-svelte';
  import type { CallLogsPageData } from './+page.server';

  interface Props {
    data: CallLogsPageData;
  }

  let { data }: Props = $props();

  let searchQuery = $state('');
  let selectedUserId = $state('');
  let fromDate = $state(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  let toDate = $state(new Date().toISOString().split('T')[0]);
  let directionFilter = $state('');

  // Audio player state
  let currentlyPlayingId = $state<string | null>(null);
  let audioElement = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);
  let playbackError = $state<string | null>(null);

  const filteredLogs = $derived(
    data.callLogs.filter((log) => {
      const matchesSearch =
        log.fromNumber.includes(searchQuery) ||
        log.toNumber.includes(searchQuery) ||
        log.fromUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.toUserName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDirection = !directionFilter || log.direction === directionFilter;

      return matchesSearch && matchesDirection;
    })
  );

  function formatDuration(seconds: number): string {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDateTime(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  }

  function getDirectionIcon(direction: string) {
    switch (direction) {
      case 'Inbound':
        return PhoneIncoming;
      case 'Outbound':
        return PhoneOutgoing;
      default:
        return Phone;
    }
  }

  function getDirectionColor(direction: string): string {
    switch (direction) {
      case 'Inbound':
        return 'text-success';
      case 'Outbound':
        return 'text-accent';
      default:
        return 'text-purple-500';
    }
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (selectedUserId) params.set('userId', selectedUserId);
    if (searchQuery) params.set('phoneNumber', searchQuery);
    
    window.location.href = `/call-logs?${params.toString()}`;
  }

  function handlePlayRecording(recordingId: string) {
    playbackError = null;
    
    // If already playing this recording, toggle pause/play
    if (currentlyPlayingId === recordingId && audioElement) {
      if (isPlaying) {
        audioElement.pause();
        isPlaying = false;
      } else {
        audioElement.play();
        isPlaying = true;
      }
      return;
    }

    // Stop current playback if any
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }

    // Start new playback
    currentlyPlayingId = recordingId;
    const audio = new Audio(`/api/recordings/${recordingId}?action=stream`);
    audioElement = audio;
    
    audio.onplay = () => {
      isPlaying = true;
    };
    
    audio.onpause = () => {
      isPlaying = false;
    };
    
    audio.onended = () => {
      isPlaying = false;
      currentlyPlayingId = null;
      audioElement = null;
    };
    
    audio.onerror = () => {
      playbackError = 'Failed to play recording. Check Sapien API configuration.';
      isPlaying = false;
      currentlyPlayingId = null;
      audioElement = null;
    };

    audio.play().catch((err) => {
      console.error('Playback error:', err);
      playbackError = 'Failed to play recording.';
      currentlyPlayingId = null;
      audioElement = null;
    });
  }

  function stopPlayback() {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    isPlaying = false;
    currentlyPlayingId = null;
  }

  function handleDownloadRecording(recordingId: string) {
    // Trigger download by opening in new tab
    const link = document.createElement('a');
    link.href = `/api/recordings/${recordingId}?action=stream`;
    link.download = `recording-${recordingId}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<svelte:head>
  <title>Call Logs and Recordings | Natterbox AVS</title>
</svelte:head>

<div class="space-y-6">
  <!-- Demo Mode Banner -->
  {#if data.isDemo}
    <div class="bg-warning/10 border border-warning/20 text-warning rounded-base p-4 flex items-center gap-3">
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data. Recording playback is disabled.</p>
    </div>
  {:else if data.canPlayRecordings}
    <div class="bg-success/10 border border-success/20 text-success rounded-base p-4 flex items-center gap-3">
      <Zap class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Connected to Sapien API - recording playback is available.</p>
    </div>
  {:else if !data.error}
    <div class="bg-accent/10 border border-accent/20 text-accent rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Recording playback requires SAPIEN_HOST environment variable to be configured.</p>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Playback Error Banner -->
  {#if playbackError}
    <div class="bg-error/10 border border-error/20 text-error rounded-base p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <p class="text-sm">{playbackError}</p>
      </div>
      <button onclick={() => playbackError = null} class="p-1 hover:bg-error/20 rounded">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Now Playing Banner -->
  {#if currentlyPlayingId}
    <div class="bg-accent/10 border border-accent/20 text-accent rounded-base p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Volume2 class="w-5 h-5 flex-shrink-0 animate-pulse" />
        <p class="text-sm">Playing recording: {currentlyPlayingId}</p>
      </div>
      <button onclick={stopPlayback} class="p-1 hover:bg-accent/20 rounded">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Page Header -->
  <div>
    <h1 class="text-2xl font-bold">Call Logs and Recordings</h1>
    <p class="text-text-secondary mt-1">
      Search and playback call recordings
      {#if data.totalCount > 0}
        <span class="text-text-primary font-medium">({data.totalCount} results)</span>
      {/if}
    </p>
  </div>

  <!-- Search Filters -->
  <Card>
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label class="text-sm font-medium text-text-secondary">From Date</label>
        <input type="date" class="input mt-1" bind:value={fromDate} />
      </div>
      <div>
        <label class="text-sm font-medium text-text-secondary">To Date</label>
        <input type="date" class="input mt-1" bind:value={toDate} />
      </div>
      <div>
        <label class="text-sm font-medium text-text-secondary">Phone Number</label>
        <Input type="text" placeholder="Any number" class="mt-1" bind:value={searchQuery} />
      </div>
      <div>
        <label class="text-sm font-medium text-text-secondary">User</label>
        <select class="input mt-1" bind:value={selectedUserId}>
          <option value="">All Users</option>
          {#each data.users as user}
            <option value={user.id}>{user.name}</option>
          {/each}
        </select>
      </div>
      <div class="flex items-end">
        <Button variant="primary" class="w-full" onclick={handleSearch}>
          <Search class="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  </Card>

  <!-- Direction Filter -->
  <div class="flex gap-2">
    <Button
      variant={directionFilter === '' ? 'primary' : 'secondary'}
      size="sm"
      onclick={() => (directionFilter = '')}
    >
      All
    </Button>
    <Button
      variant={directionFilter === 'Inbound' ? 'primary' : 'secondary'}
      size="sm"
      onclick={() => (directionFilter = 'Inbound')}
    >
      <PhoneIncoming class="w-4 h-4 mr-1" />
      Inbound
    </Button>
    <Button
      variant={directionFilter === 'Outbound' ? 'primary' : 'secondary'}
      size="sm"
      onclick={() => (directionFilter = 'Outbound')}
    >
      <PhoneOutgoing class="w-4 h-4 mr-1" />
      Outbound
    </Button>
    <Button
      variant={directionFilter === 'Internal' ? 'primary' : 'secondary'}
      size="sm"
      onclick={() => (directionFilter = 'Internal')}
    >
      <Phone class="w-4 h-4 mr-1" />
      Internal
    </Button>
  </div>

  <!-- Call Logs Table -->
  <Card padding="none">
    <div class="overflow-x-auto">
      <table class="table">
        <thead>
          <tr>
            <th>Direction</th>
            <th>Date/Time</th>
            <th>From</th>
            <th>To</th>
            <th>Duration</th>
            <th>User</th>
            <th>Recording</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredLogs as log}
            <tr>
              <td>
                <svelte:component
                  this={getDirectionIcon(log.direction)}
                  class="w-5 h-5 {getDirectionColor(log.direction)}"
                />
              </td>
              <td>
                <span class="text-sm">{formatDateTime(log.dateTime)}</span>
              </td>
              <td>
                <div>
                  <span class="font-mono text-sm">{log.fromNumber}</span>
                  {#if log.fromUserName}
                    <p class="text-xs text-text-secondary">{log.fromUserName}</p>
                  {/if}
                </div>
              </td>
              <td>
                <div>
                  <span class="font-mono text-sm">{log.toNumber}</span>
                  {#if log.toUserName}
                    <p class="text-xs text-text-secondary">{log.toUserName}</p>
                  {/if}
                </div>
              </td>
              <td>
                <span class="font-mono">{formatDuration(log.duration)}</span>
                {#if log.ringingTime > 0}
                  <p class="text-xs text-text-secondary">Ring: {log.ringingTime}s</p>
                {/if}
              </td>
              <td>
                {#if log.fromUserName || log.toUserName}
                  <span class="flex items-center gap-1 text-sm">
                    <User class="w-3 h-3 text-text-secondary" />
                    {log.direction === 'Outbound' ? log.fromUserName : log.toUserName}
                  </span>
                {:else}
                  <span class="text-text-secondary">—</span>
                {/if}
              </td>
              <td>
                {#if log.hasRecording}
                  <Badge variant="success">Available</Badge>
                {:else}
                  <Badge variant="neutral">No Recording</Badge>
                {/if}
              </td>
              <td>
                <div class="flex items-center justify-end gap-1">
                  {#if log.hasRecording && log.recordingId}
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => handlePlayRecording(log.recordingId!)}
                      disabled={!data.canPlayRecordings}
                      title={data.canPlayRecordings ? 'Play recording' : 'Recording playback not available'}
                    >
                      {#if currentlyPlayingId === log.recordingId && isPlaying}
                        <Pause class="w-4 h-4 text-accent" />
                      {:else}
                        <Play class="w-4 h-4" />
                      {/if}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={() => handleDownloadRecording(log.recordingId!)}
                      disabled={!data.canPlayRecordings}
                      title={data.canPlayRecordings ? 'Download recording' : 'Recording download not available'}
                    >
                      <Download class="w-4 h-4" />
                    </Button>
                  {:else}
                    <span class="text-text-secondary">—</span>
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="8" class="text-center py-8 text-text-secondary">
                {#if data.callLogs.length === 0}
                  No call logs found. Try adjusting your search criteria.
                {:else}
                  No call logs match your filter.
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="border-t border-border px-4 py-3 flex items-center justify-between">
      <p class="text-sm text-text-secondary">
        Showing {filteredLogs.length} of {data.totalCount} call logs
      </p>
      <div class="flex gap-2">
        <Button variant="secondary" size="sm" disabled>Previous</Button>
        <Button variant="secondary" size="sm" disabled>Next</Button>
      </div>
    </div>
  </Card>
</div>
