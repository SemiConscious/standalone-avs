<script lang="ts">
/**
 * Empty state component for when there's no data to display
 * 
 * Provides a consistent visual for empty lists, search results,
 * or other scenarios where content would normally appear.
 */
import { cn } from '$lib/utils';
import Button from './Button.svelte';
import { 
  Inbox, 
  Search, 
  FileQuestion, 
  Plus, 
  RefreshCw,
  FolderOpen,
  Users,
  FileText,
  Settings
} from 'lucide-svelte';

interface Props {
  /** Custom class names */
  class?: string;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Icon variant */
  icon?: 'inbox' | 'search' | 'question' | 'folder' | 'users' | 'file' | 'settings' | 'none';
  /** Primary action button text */
  actionText?: string;
  /** Primary action href (for link) */
  actionHref?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action text */
  secondaryText?: string;
  /** Secondary action callback */
  onSecondary?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

let {
  class: className = '',
  title = 'No items found',
  description = 'There are no items to display.',
  icon = 'inbox',
  actionText,
  actionHref,
  onAction,
  secondaryText,
  onSecondary,
  size = 'md',
}: Props = $props();

// Icon component mapping
const iconMap = {
  inbox: Inbox,
  search: Search,
  question: FileQuestion,
  folder: FolderOpen,
  users: Users,
  file: FileText,
  settings: Settings,
  none: null,
};

// Size mappings
const sizeMap = {
  sm: { icon: 'w-10 h-10', title: 'text-sm', desc: 'text-xs', padding: 'py-8' },
  md: { icon: 'w-16 h-16', title: 'text-lg', desc: 'text-sm', padding: 'py-12' },
  lg: { icon: 'w-24 h-24', title: 'text-xl', desc: 'text-base', padding: 'py-16' },
};

const currentSize = $derived(sizeMap[size]);
const IconComponent = $derived(iconMap[icon]);
</script>

<div class={cn(
  'flex flex-col items-center justify-center text-center',
  currentSize.padding,
  className
)}>
  {#if IconComponent}
    <div class={cn('text-slate-300 dark:text-slate-600 mb-4', currentSize.icon)}>
      <svelte:component this={IconComponent} class="w-full h-full" strokeWidth={1.5} />
    </div>
  {/if}
  
  <h3 class={cn('font-semibold text-slate-700 dark:text-slate-300 mb-1', currentSize.title)}>
    {title}
  </h3>
  
  {#if description}
    <p class={cn('text-slate-500 dark:text-slate-400 max-w-sm', currentSize.desc)}>
      {description}
    </p>
  {/if}
  
  {#if actionText || secondaryText}
    <div class="flex items-center gap-3 mt-4">
      {#if actionText}
        {#if actionHref}
          <Button href={actionHref} variant="primary" size={size === 'lg' ? 'md' : 'sm'}>
            <Plus class="w-4 h-4 mr-1" />
            {actionText}
          </Button>
        {:else if onAction}
          <Button onclick={onAction} variant="primary" size={size === 'lg' ? 'md' : 'sm'}>
            <Plus class="w-4 h-4 mr-1" />
            {actionText}
          </Button>
        {/if}
      {/if}
      
      {#if secondaryText && onSecondary}
        <Button onclick={onSecondary} variant="ghost" size={size === 'lg' ? 'md' : 'sm'}>
          <RefreshCw class="w-4 h-4 mr-1" />
          {secondaryText}
        </Button>
      {/if}
    </div>
  {/if}
</div>

