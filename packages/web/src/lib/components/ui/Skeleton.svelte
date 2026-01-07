<script lang="ts">
/**
 * Skeleton loading placeholder component
 * 
 * Provides visual feedback while content is loading.
 * Supports various shapes and sizes for different content types.
 */
import { cn } from '$lib/utils';

interface Props {
  /** Custom class names */
  class?: string;
  /** Width (CSS value or preset: 'full', 'half', 'quarter') */
  width?: string;
  /** Height (CSS value or preset: 'sm', 'md', 'lg', 'xl') */
  height?: string;
  /** Shape variant */
  variant?: 'rectangle' | 'circle' | 'text' | 'card' | 'avatar';
  /** Animation style */
  animation?: 'pulse' | 'shimmer' | 'none';
  /** Number of text lines for 'text' variant */
  lines?: number;
}

let {
  class: className = '',
  width = 'full',
  height = 'md',
  variant = 'rectangle',
  animation = 'pulse',
  lines = 3,
}: Props = $props();

// Map preset widths to CSS values
const widthMap: Record<string, string> = {
  full: 'w-full',
  half: 'w-1/2',
  quarter: 'w-1/4',
  auto: 'w-auto',
};

// Map preset heights to CSS values
const heightMap: Record<string, string> = {
  xs: 'h-4',
  sm: 'h-6',
  md: 'h-10',
  lg: 'h-16',
  xl: 'h-24',
  '2xl': 'h-32',
};

// Get width class or use custom value
const widthClass = $derived(widthMap[width] || `w-[${width}]`);

// Get height class or use custom value
const heightClass = $derived(heightMap[height] || `h-[${height}]`);

// Animation classes
const animationClass = $derived(
  animation === 'pulse' ? 'animate-pulse' :
  animation === 'shimmer' ? 'animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]' :
  ''
);

// Base styles
const baseClass = 'bg-slate-200 dark:bg-slate-700';

// Variant-specific classes
const variantClass = $derived(
  variant === 'circle' ? 'rounded-full aspect-square' :
  variant === 'avatar' ? 'rounded-full w-10 h-10' :
  variant === 'card' ? 'rounded-xl' :
  'rounded-md'
);
</script>

{#if variant === 'text'}
  <div class={cn('space-y-2', className)}>
    {#each Array(lines) as _, i}
      <div
        class={cn(
          baseClass,
          animationClass,
          'rounded h-4',
          i === lines - 1 ? 'w-3/4' : 'w-full'
        )}
      ></div>
    {/each}
  </div>
{:else if variant === 'card'}
  <div class={cn(baseClass, animationClass, variantClass, 'p-4 space-y-4', widthClass, className)}>
    <div class={cn(baseClass, 'rounded h-4 w-3/4')}></div>
    <div class={cn(baseClass, 'rounded h-4 w-1/2')}></div>
    <div class={cn(baseClass, 'rounded h-24 w-full')}></div>
  </div>
{:else}
  <div
    class={cn(
      baseClass,
      animationClass,
      variantClass,
      widthClass,
      heightClass,
      className
    )}
  ></div>
{/if}

<style>
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .animate-shimmer {
    animation: shimmer 2s infinite linear;
  }
</style>

