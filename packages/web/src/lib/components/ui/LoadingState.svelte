<script lang="ts">
/**
 * Consistent loading state component for pages and sections
 * 
 * Provides standardized loading indicators with various styles
 * for different use cases throughout the application.
 */
import { cn } from '$lib/utils';
import Skeleton from './Skeleton.svelte';

interface Props {
  /** Custom class names */
  class?: string;
  /** Loading state variant */
  variant?: 'spinner' | 'skeleton' | 'dots' | 'progress';
  /** Size of the loading indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Loading text to display */
  text?: string;
  /** Whether to show the text */
  showText?: boolean;
  /** Number of skeleton rows for skeleton variant */
  rows?: number;
  /** Whether to center the loading indicator */
  center?: boolean;
  /** Whether this is a full page loader */
  fullPage?: boolean;
  /** Progress percentage (0-100) for progress variant */
  progress?: number;
}

let {
  class: className = '',
  variant = 'spinner',
  size = 'md',
  text = 'Loading...',
  showText = true,
  rows = 5,
  center = true,
  fullPage = false,
  progress = 0,
}: Props = $props();

// Size mappings
const sizeMap = {
  sm: { spinner: 'w-4 h-4', text: 'text-xs', gap: 'gap-1' },
  md: { spinner: 'w-8 h-8', text: 'text-sm', gap: 'gap-2' },
  lg: { spinner: 'w-12 h-12', text: 'text-base', gap: 'gap-3' },
};

const currentSize = $derived(sizeMap[size]);
</script>

{#if fullPage}
  <div class="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50">
    <div class={cn('flex flex-col items-center', currentSize.gap)}>
      {#if variant === 'spinner'}
        <div class={cn('border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin', currentSize.spinner)}></div>
      {:else if variant === 'dots'}
        <div class="flex space-x-1">
          {#each [0, 1, 2] as i}
            <div
              class={cn(
                'rounded-full bg-blue-500 animate-bounce',
                size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'
              )}
              style="animation-delay: {i * 0.1}s"
            ></div>
          {/each}
        </div>
      {/if}
      {#if showText}
        <p class={cn('text-slate-600 dark:text-slate-400', currentSize.text)}>{text}</p>
      {/if}
    </div>
  </div>
{:else}
  <div
    class={cn(
      'flex flex-col',
      currentSize.gap,
      center ? 'items-center justify-center' : '',
      className
    )}
  >
    {#if variant === 'spinner'}
      <div class={cn('border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin', currentSize.spinner)}></div>
      {#if showText}
        <p class={cn('text-slate-600 dark:text-slate-400', currentSize.text)}>{text}</p>
      {/if}

    {:else if variant === 'skeleton'}
      <div class="w-full space-y-3">
        {#each Array(rows) as _}
          <Skeleton width="full" height="sm" animation="pulse" />
        {/each}
      </div>

    {:else if variant === 'dots'}
      <div class="flex space-x-1.5">
        {#each [0, 1, 2] as i}
          <div
            class={cn(
              'rounded-full bg-blue-500 animate-bounce',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'
            )}
            style="animation-delay: {i * 0.15}s"
          ></div>
        {/each}
      </div>
      {#if showText}
        <p class={cn('text-slate-600 dark:text-slate-400 mt-2', currentSize.text)}>{text}</p>
      {/if}

    {:else if variant === 'progress'}
      <div class="w-full max-w-xs">
        <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-500 rounded-full transition-all duration-300"
            style="width: {Math.min(100, Math.max(0, progress))}%"
          ></div>
        </div>
        {#if showText}
          <p class={cn('text-slate-600 dark:text-slate-400 text-center mt-2', currentSize.text)}>
            {text} {progress.toFixed(0)}%
          </p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }
</style>

