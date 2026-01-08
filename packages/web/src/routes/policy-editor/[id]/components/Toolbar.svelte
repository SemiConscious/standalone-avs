<script lang="ts">
  import { 
    ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, 
    MousePointer2, Hand, Grid3x3, Download, Upload,
    Copy, Trash2
  } from 'lucide-svelte';
  
  interface Props {
    zoom: number;
    canUndo: boolean;
    canRedo: boolean;
    interactionMode: 'select' | 'pan';
    showGrid: boolean;
    hasSelection: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomReset: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onSetMode: (mode: 'select' | 'pan') => void;
    onToggleGrid: () => void;
    onExport: () => void;
    onImport: () => void;
    onCopy: () => void;
    onDelete: () => void;
  }
  
  let { 
    zoom, canUndo, canRedo, interactionMode, showGrid, hasSelection,
    onZoomIn, onZoomOut, onZoomReset, onUndo, onRedo, 
    onSetMode, onToggleGrid, onExport, onImport, onCopy, onDelete
  }: Props = $props();
  
  const zoomPercent = $derived(Math.round(zoom * 100));
</script>

<div class="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface-200-800 border border-surface-300-700 rounded-lg shadow-lg p-1 z-10">
  <!-- Interaction mode -->
  <div class="flex items-center border-r border-surface-300-700 pr-1 mr-1">
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors {interactionMode === 'select' ? 'bg-primary-500/20 text-primary-500' : 'text-on-surface-token/70'}"
      onclick={() => onSetMode('select')}
      title="Select mode (V)"
    >
      <MousePointer2 class="w-4 h-4" />
    </button>
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors {interactionMode === 'pan' ? 'bg-primary-500/20 text-primary-500' : 'text-on-surface-token/70'}"
      onclick={() => onSetMode('pan')}
      title="Pan mode (H)"
    >
      <Hand class="w-4 h-4" />
    </button>
  </div>
  
  <!-- Undo/Redo -->
  <div class="flex items-center border-r border-surface-300-700 pr-1 mr-1">
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-token/70"
      onclick={onUndo}
      disabled={!canUndo}
      title="Undo (Ctrl+Z)"
    >
      <Undo2 class="w-4 h-4" />
    </button>
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-token/70"
      onclick={onRedo}
      disabled={!canRedo}
      title="Redo (Ctrl+Y)"
    >
      <Redo2 class="w-4 h-4" />
    </button>
  </div>
  
  <!-- Selection actions -->
  <div class="flex items-center border-r border-surface-300-700 pr-1 mr-1">
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-token/70"
      onclick={onCopy}
      disabled={!hasSelection}
      title="Copy selection (Ctrl+C)"
    >
      <Copy class="w-4 h-4" />
    </button>
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-token/70 hover:text-error-500"
      onclick={onDelete}
      disabled={!hasSelection}
      title="Delete selection (Delete)"
    >
      <Trash2 class="w-4 h-4" />
    </button>
  </div>
  
  <!-- Zoom controls -->
  <div class="flex items-center border-r border-surface-300-700 pr-1 mr-1">
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors text-on-surface-token/70"
      onclick={onZoomOut}
      title="Zoom out (-)"
    >
      <ZoomOut class="w-4 h-4" />
    </button>
    <button 
      class="px-2 py-1 min-w-14 text-xs font-mono text-on-surface-token/70 hover:bg-surface-300-700 rounded transition-colors"
      onclick={onZoomReset}
      title="Reset zoom (0)"
    >
      {zoomPercent}%
    </button>
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors text-on-surface-token/70"
      onclick={onZoomIn}
      title="Zoom in (+)"
    >
      <ZoomIn class="w-4 h-4" />
    </button>
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors text-on-surface-token/70"
      onclick={onZoomReset}
      title="Fit to screen"
    >
      <Maximize2 class="w-4 h-4" />
    </button>
  </div>
  
  <!-- Grid toggle -->
  <div class="flex items-center border-r border-surface-300-700 pr-1 mr-1">
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors {showGrid ? 'bg-primary-500/20 text-primary-500' : 'text-on-surface-token/70'}"
      onclick={onToggleGrid}
      title="Toggle grid (G)"
    >
      <Grid3x3 class="w-4 h-4" />
    </button>
  </div>
  
  <!-- Import/Export -->
  <div class="flex items-center">
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors text-on-surface-token/70"
      onclick={onImport}
      title="Import policy"
    >
      <Upload class="w-4 h-4" />
    </button>
    <button 
      class="p-2 rounded hover:bg-surface-300-700 transition-colors text-on-surface-token/70"
      onclick={onExport}
      title="Export policy"
    >
      <Download class="w-4 h-4" />
    </button>
  </div>
</div>

