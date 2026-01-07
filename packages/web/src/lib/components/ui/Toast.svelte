<script lang="ts">
  import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';

  interface Props {
    type?: 'success' | 'error' | 'warning' | 'info';
    message: string;
    description?: string;
    onClose?: () => void;
    duration?: number;
  }

  let { type = 'info', message, description, onClose, duration = 5000 }: Props = $props();

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const iconColors = {
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    info: 'text-accent',
  };

  const icon = icons[type];

  $effect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  });
</script>

<div
  class="flex items-start gap-3 p-4 bg-bg-primary border border-border rounded-base shadow-lg max-w-md"
  role="alert"
>
  <svelte:component this={icon} class="w-5 h-5 mt-0.5 flex-shrink-0 {iconColors[type]}" />
  
  <div class="flex-1">
    <p class="font-medium text-text-primary">{message}</p>
    {#if description}
      <p class="mt-1 text-sm text-text-secondary">{description}</p>
    {/if}
  </div>

  {#if onClose}
    <button
      class="p-1 rounded-base hover:bg-bg-secondary transition-colors"
      onclick={onClose}
      aria-label="Dismiss"
    >
      <X class="w-4 h-4 text-text-secondary" />
    </button>
  {/if}
</div>

