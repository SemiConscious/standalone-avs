<script lang="ts">
  import { Copy, Clipboard, Trash2, Scissors, FolderPlus, Undo2, Redo2 } from 'lucide-svelte';
  import { 
    copySelection, 
    pasteFromClipboard, 
    deleteSelection,
    undo,
    redo,
    canUndo,
    canRedo,
  } from '$lib/stores/policy-editor';
  
  interface MenuItem {
    label: string;
    icon: typeof Copy;
    action: () => void;
    shortcut?: string;
    disabled?: boolean;
    divider?: boolean;
  }
  
  interface Props {
    x: number;
    y: number;
    type: 'pane' | 'node' | 'selection';
    onClose: () => void;
  }
  
  let { x, y, type, onClose }: Props = $props();
  
  function handleAction(action: () => void) {
    action();
    onClose();
  }
  
  const menuItems: MenuItem[] = $derived.by(() => {
    const items: MenuItem[] = [];
    
    if (type === 'node' || type === 'selection') {
      items.push(
        { label: 'Cut', icon: Scissors, action: () => { copySelection(); deleteSelection(); }, shortcut: '⌘X' },
        { label: 'Copy', icon: Copy, action: copySelection, shortcut: '⌘C' },
      );
    }
    
    items.push(
      { label: 'Paste', icon: Clipboard, action: () => pasteFromClipboard(), shortcut: '⌘V', divider: type !== 'pane' },
    );
    
    if (type === 'node' || type === 'selection') {
      items.push(
        { label: 'Delete', icon: Trash2, action: deleteSelection, shortcut: 'Del' },
        { label: 'Group', icon: FolderPlus, action: () => {}, divider: true },
      );
    }
    
    items.push(
      { label: 'Undo', icon: Undo2, action: undo, shortcut: '⌘Z', disabled: !$canUndo },
      { label: 'Redo', icon: Redo2, action: redo, shortcut: '⌘⇧Z', disabled: !$canRedo },
    );
    
    return items;
  });
</script>

<div
  class="fixed z-50 min-w-48 bg-surface-200-800 border border-surface-300-700 rounded-lg shadow-xl py-1"
  style="left: {x}px; top: {y}px;"
  role="menu"
>
  {#each menuItems as item, index}
    {#if item.divider && index > 0}
      <div class="border-t border-surface-300-700 my-1"></div>
    {/if}
    <button
      class="w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-surface-300-700 transition-colors
        {item.disabled ? 'opacity-50 cursor-not-allowed' : ''}"
      disabled={item.disabled}
      onclick={() => handleAction(item.action)}
      role="menuitem"
    >
      <svelte:component this={item.icon} class="w-4 h-4 text-text-secondary" />
      <span class="flex-1 text-sm text-text-primary">{item.label}</span>
      {#if item.shortcut}
        <span class="text-xs text-text-secondary font-mono">{item.shortcut}</span>
      {/if}
    </button>
  {/each}
</div>

<svelte:window onclick={onClose} oncontextmenu|preventDefault={() => {}} />

