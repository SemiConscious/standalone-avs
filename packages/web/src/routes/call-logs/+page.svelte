<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/components/ui';
  import DataTable from '$lib/components/ui/DataTable.svelte';
  import type { Column } from '$lib/components/ui/DataTable.svelte';
  import {
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
    Volume2,
    X,
  } from 'lucide-svelte';
  import type { CallLogsPageData } from './+page.server';

  interface Props {
    data: CallLogsPageData;
  }

  let { data }: Props = $props();

  let selectedUserId = $state('');
  let fromDate = $state(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  let toDate = $state(new Date().toISOString().split('T')[0]);
  let directionFilter = $state('');
  let searchQuery = $state('');

  // Audio player state
  let currentlyPlayingId = $state<string | null>(null);
  let audioElement = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);
  let playbackError = $state<string | null>(null);

  // Column definitions
  let columns = $state<Column[]>([
    { key: 'direction', label: 'Direction', width: '80px' },
    { key: 'dateTime', label: 'Date/Time', sortable: true },
    { key: 'fromNumber', label: 'From', sortable: true },
    { key: 'toNumber', label: 'To', sortable: true },
    { key: 'duration', label: 'Duration', sortable: true },
    { key: 'user', label: 'User' },
    { key: 'recording', label: 'Recording' },
    { key: 'actions', label: 'Actions', width: '100px' },
  ]);

  // Filter logs based on direction
  const filteredLogs = $derived(() => {
    return data.callLogs.filter((log) => {
      const matchesDirection = !directionFilter || log.direction === directionFilter;
      return matchesDirection;
    });
  });

  // Transform call logs for the data table
  const tableData = $derived(
    filteredLogs().map((log) => ({
      ...log,
      id: log.id,
    }))
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
        return 'text-primary-400';
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
    const link = document.createElement('a');
    link.href = `/api/recordings/${recordingId}?action=stream`;
    link.download = `recording-${recordingId}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleColumnsChange(updatedColumns: Column[]) {
    columns = updatedColumns;
  }

  function handleRefresh() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Call Logs and Recordings | Natterbox AVS</title>
</svelte:head>

<div class="flex flex-col gap-6 h-full min-h-0">
  <!-- Status Banners -->
  {#if data.isDemo}
    <div
      class="bg-warning/10 border border-warning/20 text-warning rounded-lg p-4 flex items-center gap-3 flex-shrink-0"
    >
      <FlaskConical class="w-5 h-5 flex-shrink-0" />
      <p class="text-sm">Demo Mode - showing sample data. Recording playback is disabled.</p>
    </div>
  {:else if !data.canPlayRecordings && !data.error}
    <div
      class="bg-info/10 border border-info/20 text-info rounded-lg p-4 flex items-center gap-3 flex-shrink-0"
    >
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <div class="text-sm">
        <p class="font-medium">Recording playback not available</p>
        <p class="text-xs opacity-75 mt-1">SAPIEN_HOST environment variable is required for playback and download.</p>
      </div>
    </div>
  {/if}

  <!-- Error Banner -->
  {#if data.error}
    <div
      class="bg-error/10 border border-error/20 text-error rounded-lg p-4 flex items-center gap-3 flex-shrink-0"
    >
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <p>{data.error}</p>
    </div>
  {/if}

  <!-- Playback Error Banner -->
  {#if playbackError}
    <div
      class="bg-error/10 border border-error/20 text-error rounded-lg p-4 flex items-center justify-between flex-shrink-0"
    >
      <div class="flex items-center gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        <p class="text-sm">{playbackError}</p>
      </div>
      <button onclick={() => (playbackError = null)} class="p-1 hover:bg-error/20 rounded">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Now Playing Banner -->
  {#if currentlyPlayingId}
    <div
      class="bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-lg p-4 flex items-center justify-between flex-shrink-0"
    >
      <div class="flex items-center gap-3">
        <Volume2 class="w-5 h-5 flex-shrink-0 animate-pulse" />
        <p class="text-sm">Playing recording: {currentlyPlayingId}</p>
      </div>
      <button onclick={stopPlayback} class="p-1 hover:bg-primary-500/20 rounded">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  <!-- Page Header -->
  <div class="flex-shrink-0">
    <h1 class="text-2xl font-bold text-text-primary">Call Logs and Recordings</h1>
    <p class="text-text-secondary mt-1">
      Search and playback call recordings
      {#if data.totalCount > 0}
        <span class="text-text-primary font-medium">({data.totalCount} results)</span>
      {/if}
    </p>
  </div>

  <!-- Search Filters -->
  <Card class="flex-shrink-0">
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
          <Search class="w-4 h-4" />
          Search
        </Button>
      </div>
    </div>
  </Card>

  <!-- Direction Filter -->
  <div class="flex gap-2 flex-shrink-0">
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
      <PhoneIncoming class="w-4 h-4" />
      Inbound
    </Button>
    <Button
      variant={directionFilter === 'Outbound' ? 'primary' : 'secondary'}
      size="sm"
      onclick={() => (directionFilter = 'Outbound')}
    >
      <PhoneOutgoing class="w-4 h-4" />
      Outbound
    </Button>
    <Button
      variant={directionFilter === 'Internal' ? 'primary' : 'secondary'}
      size="sm"
      onclick={() => (directionFilter = 'Internal')}
    >
      <Phone class="w-4 h-4" />
      Internal
    </Button>
  </div>

  <!-- Data Table -->
  <div class="flex-1 min-h-0">
    <DataTable
      data={tableData}
      {columns}
      paginated
      pageSize={15}
      columnSelector
      onColumnsChange={handleColumnsChange}
      onRefresh={handleRefresh}
      emptyMessage="No call logs found. Try adjusting your search criteria."
    >
      {#snippet cell(column, row)}
        {#if column.key === 'direction'}
          {@const DirectionIcon = getDirectionIcon(String(row.direction))}
          <svelte:component
            this={DirectionIcon}
            class="w-5 h-5 {getDirectionColor(String(row.direction))}"
          />
        {:else if column.key === 'dateTime'}
          <span class="text-sm">{formatDateTime(String(row.dateTime))}</span>
        {:else if column.key === 'fromNumber'}
          <div>
            <span class="font-mono text-sm">{row.fromNumber}</span>
            {#if row.fromUserName}
              <p class="text-xs text-text-secondary">{row.fromUserName}</p>
            {/if}
          </div>
        {:else if column.key === 'toNumber'}
          <div>
            <span class="font-mono text-sm">{row.toNumber}</span>
            {#if row.toUserName}
              <p class="text-xs text-text-secondary">{row.toUserName}</p>
            {/if}
          </div>
        {:else if column.key === 'duration'}
          <span class="font-mono">{formatDuration(Number(row.duration))}</span>
          {#if Number(row.ringingTime) > 0}
            <p class="text-xs text-text-secondary">Ring: {row.ringingTime}s</p>
          {/if}
        {:else if column.key === 'user'}
          {#if row.fromUserName || row.toUserName}
            <span class="flex items-center gap-1 text-sm">
              <User class="w-3 h-3 text-text-secondary" />
              {row.direction === 'Outbound' ? row.fromUserName : row.toUserName}
            </span>
          {:else}
            <span class="text-text-secondary">—</span>
          {/if}
        {:else if column.key === 'recording'}
          {#if row.hasRecording}
            <Badge variant="success">Available</Badge>
          {:else}
            <Badge variant="neutral">No Recording</Badge>
          {/if}
        {:else if column.key === 'actions'}
          <div class="flex items-center justify-end gap-1">
            {#if row.hasRecording && row.recordingId}
              <Button
                variant="ghost"
                size="sm"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  handlePlayRecording(String(row.recordingId));
                }}
                disabled={!data.canPlayRecordings}
                title={data.canPlayRecordings ? 'Play recording' : 'Recording playback not available'}
              >
                {#if currentlyPlayingId === row.recordingId && isPlaying}
                  <Pause class="w-4 h-4 text-primary-400" />
                {:else}
                  <Play class="w-4 h-4" />
                {/if}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onclick={(e: MouseEvent) => {
                  e.stopPropagation();
                  handleDownloadRecording(String(row.recordingId));
                }}
                disabled={!data.canPlayRecordings}
                title={data.canPlayRecordings ? 'Download recording' : 'Recording download not available'}
              >
                <Download class="w-4 h-4" />
              </Button>
            {:else}
              <span class="text-text-secondary">—</span>
            {/if}
          </div>
        {:else}
          {row[column.key] ?? '—'}
        {/if}
      {/snippet}
    </DataTable>
  </div>
</div>
