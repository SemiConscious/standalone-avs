<script lang="ts" module>
  export interface Tab {
    id: string;
    label: string;
    icon?: typeof import('lucide-svelte').User;
    badge?: string | number;
    disabled?: boolean;
  }
</script>

<script lang="ts">
/**
 * Tabs Component
 * 
 * Provides a tabbed interface for organizing content into sections.
 * Supports icons, badges, and keyboard navigation.
 */
import { cn } from '$lib/utils';
import type { Snippet } from 'svelte';

interface Props {
  /** Array of tab definitions */
  tabs: Tab[];
  /** Currently active tab ID */
  activeTab?: string;
  /** Tab style variant */
  variant?: 'underline' | 'pills' | 'boxed';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether tabs should fill available width */
  fullWidth?: boolean;
  /** Additional classes */
  class?: string;
  /** Tab change handler */
  onTabChange?: (tabId: string) => void;
  /** Tab panel content - rendered as children */
  children?: Snippet;
}

let {
  tabs,
  activeTab = $bindable(tabs[0]?.id || ''),
  variant = 'underline',
  size = 'md',
  fullWidth = false,
  class: className = '',
  onTabChange,
  children,
}: Props = $props();

// Size configurations
const sizes = {
  sm: { text: 'text-xs', padding: 'px-3 py-1.5', iconSize: 'w-3.5 h-3.5', gap: 'gap-1.5' },
  md: { text: 'text-sm', padding: 'px-4 py-2', iconSize: 'w-4 h-4', gap: 'gap-2' },
  lg: { text: 'text-base', padding: 'px-5 py-2.5', iconSize: 'w-5 h-5', gap: 'gap-2' },
};

const currentSize = $derived(sizes[size]);

function selectTab(tabId: string) {
  const tab = tabs.find(t => t.id === tabId);
  if (tab?.disabled) return;
  activeTab = tabId;
  onTabChange?.(tabId);
}

function handleKeyDown(e: KeyboardEvent, index: number) {
  const enabledTabs = tabs.filter(t => !t.disabled);
  const currentEnabledIndex = enabledTabs.findIndex(t => t.id === tabs[index].id);
  
  let newIndex = currentEnabledIndex;
  
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    newIndex = currentEnabledIndex > 0 ? currentEnabledIndex - 1 : enabledTabs.length - 1;
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    newIndex = currentEnabledIndex < enabledTabs.length - 1 ? currentEnabledIndex + 1 : 0;
  } else if (e.key === 'Home') {
    e.preventDefault();
    newIndex = 0;
  } else if (e.key === 'End') {
    e.preventDefault();
    newIndex = enabledTabs.length - 1;
  }
  
  if (newIndex !== currentEnabledIndex) {
    selectTab(enabledTabs[newIndex].id);
  }
}

// Variant styles
const variantStyles = {
  underline: {
    container: 'border-b border-border',
    tab: 'border-b-2 border-transparent -mb-px',
    active: 'border-primary-500 text-primary-500',
    inactive: 'text-text-secondary hover:text-text-primary hover:border-surface-500',
  },
  pills: {
    container: 'gap-1',
    tab: 'rounded-lg',
    active: 'bg-primary-500 text-white',
    inactive: 'text-text-secondary hover:bg-surface-700 hover:text-text-primary',
  },
  boxed: {
    container: 'bg-surface-800 p-1 rounded-lg gap-1',
    tab: 'rounded-md',
    active: 'bg-surface-600 text-text-primary shadow-sm',
    inactive: 'text-text-secondary hover:text-text-primary',
  },
};

const currentVariant = $derived(variantStyles[variant]);
</script>

<div class={cn('w-full', className)}>
  <!-- Tab List -->
  <div
    role="tablist"
    class={cn(
      'flex',
      currentVariant.container,
      fullWidth && 'w-full'
    )}
  >
    {#each tabs as tab, index}
      <button
        type="button"
        role="tab"
        id="tab-{tab.id}"
        aria-selected={activeTab === tab.id}
        aria-controls="panel-{tab.id}"
        tabindex={activeTab === tab.id ? 0 : -1}
        disabled={tab.disabled}
        onclick={() => selectTab(tab.id)}
        onkeydown={(e) => handleKeyDown(e, index)}
        class={cn(
          'flex items-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
          currentSize.text,
          currentSize.padding,
          currentSize.gap,
          currentVariant.tab,
          activeTab === tab.id ? currentVariant.active : currentVariant.inactive,
          tab.disabled && 'opacity-50 cursor-not-allowed',
          fullWidth && 'flex-1 justify-center'
        )}
      >
        {#if tab.icon}
          <svelte:component this={tab.icon} class={currentSize.iconSize} />
        {/if}
        <span>{tab.label}</span>
        {#if tab.badge !== undefined}
          <span
            class={cn(
              'inline-flex items-center justify-center rounded-full text-xs font-medium min-w-[1.25rem] h-5 px-1.5',
              activeTab === tab.id
                ? variant === 'pills' ? 'bg-white/20 text-white' : 'bg-primary-500/20 text-primary-500'
                : 'bg-surface-600 text-text-secondary'
            )}
          >
            {tab.badge}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Tab Panels - rendered by children -->
  <div class="mt-4">
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>
