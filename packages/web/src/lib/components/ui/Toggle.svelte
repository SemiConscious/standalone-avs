<script lang="ts">
/**
 * Modern Toggle Switch Component
 * 
 * iOS/Android-style toggle switch for boolean settings.
 * More visually appealing and touch-friendly than checkboxes.
 */
import { cn } from '$lib/utils';

interface Props {
  /** Whether the toggle is checked/on */
  checked?: boolean;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color when checked/on */
  color?: 'primary' | 'success' | 'error' | 'warning';
  /** Color when unchecked/off (optional, defaults to neutral) */
  offColor?: 'neutral' | 'error' | 'warning';
  /** Label text (optional) */
  label?: string;
  /** Label position */
  labelPosition?: 'left' | 'right';
  /** Description text below label */
  description?: string;
  /** Name attribute for form submission */
  name?: string;
  /** Value when checked (for forms) */
  value?: string;
  /** Additional classes for the container */
  class?: string;
  /** Change handler - receives the new checked value */
  onchange?: (e: Event) => void;
}

let {
  checked = $bindable(false),
  disabled = false,
  size = 'md',
  color = 'primary',
  offColor = 'neutral',
  label,
  labelPosition = 'right',
  description,
  name,
  value = 'true',
  class: className = '',
  onchange,
}: Props = $props();

// Size configurations
const sizes = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
    text: 'text-sm',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
    text: 'text-sm',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translate: 'translate-x-7',
    text: 'text-base',
  },
};

// Color configurations for on state
const onColors = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  error: 'bg-error',
  warning: 'bg-amber-500',
};

// Color configurations for off state
const offColors = {
  neutral: 'bg-surface-600',
  error: 'bg-error/50',
  warning: 'bg-amber-500/50',
};

const currentSize = $derived(sizes[size]);
const onColor = $derived(onColors[color]);
const offColorClass = $derived(offColors[offColor]);

function handleClick(e: MouseEvent) {
  if (disabled) return;
  checked = !checked;
  // Create a synthetic change event
  const event = new Event('change', { bubbles: true });
  Object.defineProperty(event, 'target', { value: { checked }, writable: false });
  onchange?.(event);
}

function handleKeyDown(e: KeyboardEvent) {
  if (disabled) return;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    checked = !checked;
    const event = new Event('change', { bubbles: true });
    Object.defineProperty(event, 'target', { value: { checked }, writable: false });
    onchange?.(event);
  }
}
</script>

<div class={cn('flex items-start gap-3', labelPosition === 'left' && 'flex-row-reverse', className)}>
  <!-- Hidden checkbox for form submission -->
  {#if name}
    <input type="hidden" {name} value={checked ? value : ''} />
  {/if}

  <!-- Toggle Track -->
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    {disabled}
    onclick={handleClick}
    onkeydown={handleKeyDown}
    class={cn(
      'relative inline-flex flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
      currentSize.track,
      checked ? onColor : offColorClass,
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <!-- Toggle Thumb -->
    <span
      class={cn(
        'pointer-events-none inline-block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
        currentSize.thumb,
        'absolute top-0.5 left-0.5',
        checked && currentSize.translate
      )}
    ></span>
  </button>

  <!-- Label & Description -->
  {#if label || description}
    <div class="flex flex-col">
      {#if label}
        <span
          class={cn(
            'font-medium text-text-primary select-none',
            currentSize.text,
            disabled && 'opacity-50'
          )}
          onclick={handleClick}
          role="presentation"
        >
          {label}
        </span>
      {/if}
      {#if description}
        <span class={cn('text-text-secondary text-xs mt-0.5', disabled && 'opacity-50')}>
          {description}
        </span>
      {/if}
    </div>
  {/if}
</div>
