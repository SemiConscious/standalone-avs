<script lang="ts">
  import { theme, setTheme, type Theme } from '$lib/stores/theme';
  import { Sun, Moon, Monitor, Cloud, ChevronDown } from 'lucide-svelte';

  let isOpen = $state(false);

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'salesforce', label: 'Salesforce', icon: Cloud },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentIcon = $derived(themes.find((t) => t.value === $theme)?.icon ?? Monitor);

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.theme-toggle-container')) {
      isOpen = false;
    }
  }

  function selectTheme(value: Theme) {
    setTheme(value);
    isOpen = false;
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<div class="theme-toggle-container relative">
  <button
    onclick={() => (isOpen = !isOpen)}
    class="flex items-center gap-1.5 px-3 py-2 rounded-base hover:bg-bg-secondary transition-colors"
    aria-label="Change theme"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <svelte:component this={currentIcon} class="w-5 h-5" />
    <ChevronDown class="w-4 h-4 text-text-secondary" />
  </button>

  {#if isOpen}
    <div
      class="absolute right-0 mt-2 w-44 bg-bg-primary border border-border rounded-base shadow-lg py-1 z-50"
      role="listbox"
    >
      {#each themes as { value, label, icon }}
        <button
          onclick={() => selectTheme(value)}
          class="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-bg-secondary transition-colors {$theme ===
          value
            ? 'text-accent font-medium bg-bg-secondary/50'
            : 'text-text-primary'}"
          role="option"
          aria-selected={$theme === value}
        >
          <svelte:component this={icon} class="w-4 h-4" />
          {label}
        </button>
      {/each}
    </div>
  {/if}
</div>

