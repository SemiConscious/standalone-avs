<script lang="ts">
/**
 * Page-level loading component
 * 
 * Provides a consistent loading experience for entire pages,
 * including skeleton layouts for different page types.
 */
import { cn } from '$lib/utils';
import Skeleton from './Skeleton.svelte';
import LoadingState from './LoadingState.svelte';

interface Props {
  /** Custom class names */
  class?: string;
  /** Type of page layout to show skeletons for */
  layout?: 'list' | 'detail' | 'form' | 'grid' | 'custom' | 'spinner';
  /** Loading message */
  message?: string;
}

let {
  class: className = '',
  layout = 'spinner',
  message = 'Loading...',
}: Props = $props();
</script>

<div class={cn('w-full', className)}>
  {#if layout === 'spinner'}
    <div class="flex items-center justify-center py-16">
      <LoadingState variant="spinner" text={message} />
    </div>

  {:else if layout === 'list'}
    <!-- List page skeleton: Header + table rows -->
    <div class="space-y-4 p-6">
      <!-- Page header -->
      <div class="flex items-center justify-between">
        <Skeleton width="200px" height="lg" />
        <Skeleton width="120px" height="md" />
      </div>
      
      <!-- Search/filter bar -->
      <div class="flex gap-4">
        <Skeleton width="300px" height="md" />
        <Skeleton width="150px" height="md" />
      </div>
      
      <!-- Table header -->
      <div class="flex gap-4 border-b pb-2">
        {#each [1, 2, 3, 4, 5] as _}
          <Skeleton width="120px" height="sm" />
        {/each}
      </div>
      
      <!-- Table rows -->
      {#each [1, 2, 3, 4, 5, 6, 7, 8] as _}
        <div class="flex gap-4 py-2">
          {#each [1, 2, 3, 4, 5] as _}
            <Skeleton width="120px" height="sm" />
          {/each}
        </div>
      {/each}
      
      <!-- Pagination -->
      <div class="flex justify-end gap-2 pt-4">
        <Skeleton width="80px" height="sm" />
        <Skeleton width="80px" height="sm" />
        <Skeleton width="80px" height="sm" />
      </div>
    </div>

  {:else if layout === 'detail'}
    <!-- Detail page skeleton: Header + info cards -->
    <div class="space-y-6 p-6">
      <!-- Breadcrumb -->
      <div class="flex gap-2">
        <Skeleton width="60px" height="xs" />
        <Skeleton width="100px" height="xs" />
        <Skeleton width="150px" height="xs" />
      </div>
      
      <!-- Page header with actions -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Skeleton variant="avatar" width="64px" height="64px" />
          <div class="space-y-2">
            <Skeleton width="200px" height="lg" />
            <Skeleton width="150px" height="sm" />
          </div>
        </div>
        <div class="flex gap-2">
          <Skeleton width="100px" height="md" />
          <Skeleton width="100px" height="md" />
        </div>
      </div>
      
      <!-- Detail cards grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each [1, 2] as _}
          <div class="border rounded-lg p-4 space-y-4">
            <Skeleton width="120px" height="sm" />
            <div class="space-y-3">
              {#each [1, 2, 3, 4] as _}
                <div class="flex justify-between">
                  <Skeleton width="100px" height="xs" />
                  <Skeleton width="150px" height="xs" />
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Additional section -->
      <div class="border rounded-lg p-4">
        <Skeleton width="150px" height="sm" class="mb-4" />
        <div class="grid grid-cols-3 gap-4">
          {#each [1, 2, 3] as _}
            <Skeleton width="full" height="2xl" />
          {/each}
        </div>
      </div>
    </div>

  {:else if layout === 'form'}
    <!-- Form page skeleton -->
    <div class="max-w-2xl mx-auto space-y-6 p-6">
      <!-- Form header -->
      <div class="space-y-2">
        <Skeleton width="200px" height="lg" />
        <Skeleton width="300px" height="sm" />
      </div>
      
      <!-- Form fields -->
      <div class="space-y-4">
        {#each [1, 2, 3, 4, 5] as _}
          <div class="space-y-2">
            <Skeleton width="100px" height="xs" />
            <Skeleton width="full" height="md" />
          </div>
        {/each}
      </div>
      
      <!-- Form actions -->
      <div class="flex justify-end gap-2 pt-4">
        <Skeleton width="100px" height="md" />
        <Skeleton width="120px" height="md" />
      </div>
    </div>

  {:else if layout === 'grid'}
    <!-- Grid/card layout skeleton -->
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <Skeleton width="200px" height="lg" />
        <Skeleton width="120px" height="md" />
      </div>
      
      <!-- Grid of cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {#each [1, 2, 3, 4, 5, 6, 7, 8] as _}
          <div class="border rounded-lg p-4 space-y-3">
            <Skeleton width="full" height="2xl" />
            <Skeleton width="3/4" height="sm" />
            <Skeleton width="1/2" height="xs" />
          </div>
        {/each}
      </div>
    </div>

  {:else}
    <!-- Custom slot for specific layouts -->
    <slot />
  {/if}
</div>

