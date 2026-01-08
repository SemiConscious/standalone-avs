<script lang="ts" module>
  export interface AccordionItem {
    id: string;
    title: string;
    icon?: typeof import('lucide-svelte').User;
    badge?: string | number;
    disabled?: boolean;
  }
</script>

<script lang="ts">
/**
 * Accordion/Collapsible Component
 * 
 * Expandable sections for grouping related content.
 * Supports single or multiple expanded items.
 */
import { cn } from '$lib/utils';
import { ChevronDown } from 'lucide-svelte';
import { slide } from 'svelte/transition';
import type { Snippet } from 'svelte';

interface Props {
  /** Array of accordion item definitions */
  items: AccordionItem[];
  /** Currently expanded item IDs */
  expanded?: string[];
  /** Allow multiple items expanded at once */
  multiple?: boolean;
  /** Visual variant */
  variant?: 'default' | 'bordered' | 'separated';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional classes */
  class?: string;
  /** Expansion change handler */
  onExpandedChange?: (expanded: string[]) => void;
  /** Content rendered inside accordion panels */
  children?: Snippet;
}

let {
  items,
  expanded = $bindable([]),
  multiple = false,
  variant = 'default',
  size = 'md',
  class: className = '',
  onExpandedChange,
  children,
}: Props = $props();

// Size configurations
const sizes = {
  sm: { text: 'text-sm', padding: 'px-3 py-2', iconSize: 'w-4 h-4', chevron: 'w-4 h-4' },
  md: { text: 'text-base', padding: 'px-4 py-3', iconSize: 'w-5 h-5', chevron: 'w-5 h-5' },
  lg: { text: 'text-lg', padding: 'px-5 py-4', iconSize: 'w-6 h-6', chevron: 'w-5 h-5' },
};

const currentSize = $derived(sizes[size]);

function isExpanded(itemId: string): boolean {
  return expanded.includes(itemId);
}

function toggleItem(itemId: string) {
  const item = items.find(i => i.id === itemId);
  if (item?.disabled) return;
  
  if (isExpanded(itemId)) {
    expanded = expanded.filter(id => id !== itemId);
  } else {
    if (multiple) {
      expanded = [...expanded, itemId];
    } else {
      expanded = [itemId];
    }
  }
  onExpandedChange?.(expanded);
}

function handleKeyDown(e: KeyboardEvent, itemId: string) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleItem(itemId);
  }
}

// Variant styles
const variantStyles = {
  default: {
    container: 'divide-y divide-border',
    item: '',
    header: 'hover:bg-surface-800/50',
    content: 'border-t border-border/50',
  },
  bordered: {
    container: 'border border-border rounded-lg divide-y divide-border overflow-hidden',
    item: '',
    header: 'hover:bg-surface-800/50',
    content: '',
  },
  separated: {
    container: 'space-y-2',
    item: 'border border-border rounded-lg overflow-hidden',
    header: 'hover:bg-surface-800/50',
    content: 'border-t border-border',
  },
};

const currentVariant = $derived(variantStyles[variant]);
</script>

<div class={cn(currentVariant.container, className)}>
  {#each items as item}
    <div class={currentVariant.item}>
      <!-- Accordion Header -->
      <button
        type="button"
        id="accordion-header-{item.id}"
        aria-expanded={isExpanded(item.id)}
        aria-controls="accordion-panel-{item.id}"
        disabled={item.disabled}
        onclick={() => toggleItem(item.id)}
        onkeydown={(e) => handleKeyDown(e, item.id)}
        class={cn(
          'flex items-center justify-between w-full text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
          currentSize.padding,
          currentVariant.header,
          item.disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div class="flex items-center gap-3">
          {#if item.icon}
            <svelte:component this={item.icon} class={cn(currentSize.iconSize, 'text-accent')} />
          {/if}
          <span class={cn('font-medium text-text-primary', currentSize.text)}>
            {item.title}
          </span>
          {#if item.badge !== undefined}
            <span class="inline-flex items-center justify-center rounded-full text-xs font-medium min-w-[1.25rem] h-5 px-1.5 bg-surface-600 text-text-secondary">
              {item.badge}
            </span>
          {/if}
        </div>
        <ChevronDown
          class={cn(
            currentSize.chevron,
            'text-text-secondary transition-transform duration-200',
            isExpanded(item.id) && 'rotate-180'
          )}
        />
      </button>

      <!-- Accordion Content -->
      {#if isExpanded(item.id)}
        <div
          id="accordion-panel-{item.id}"
          role="region"
          aria-labelledby="accordion-header-{item.id}"
          transition:slide={{ duration: 200 }}
          class={cn(currentVariant.content)}
        >
          <div class={currentSize.padding}>
            {#if children}
              {@render children()}
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>
