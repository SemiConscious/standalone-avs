<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from 'lucide-svelte';
  import { Button } from './index';

  interface Props {
    open: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    onClose: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { open, title, size = 'md', onClose, children, footer }: Props = $props();

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onclick={handleBackdropClick}
      onkeydown={(e) => e.key === 'Enter' && onClose()}
      role="button"
      tabindex="-1"
      aria-label="Close modal"
    ></div>

    <!-- Modal content -->
    <div
      class="relative w-full {sizeClasses[size]} bg-bg-primary border border-border rounded-base shadow-xl"
    >
      <!-- Header -->
      {#if title}
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="modal-title" class="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onclick={onClose}>
            <X class="w-5 h-5" />
          </Button>
        </div>
      {:else}
        <button
          class="absolute top-4 right-4 p-1 rounded-base hover:bg-bg-secondary transition-colors"
          onclick={onClose}
          aria-label="Close"
        >
          <X class="w-5 h-5" />
        </button>
      {/if}

      <!-- Body -->
      <div class="px-6 py-4">
        {@render children()}
      </div>

      <!-- Footer -->
      {#if footer}
        <div class="px-6 py-4 border-t border-border bg-bg-secondary/50 rounded-b-base">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}

