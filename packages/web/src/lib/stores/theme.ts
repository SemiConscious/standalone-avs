import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'salesforce' | 'system';

const THEME_CLASSES = {
  light: 'theme-light',
  dark: 'theme-dark',
  salesforce: 'theme-salesforce',
} as const;

function getInitialTheme(): Theme {
  if (!browser) return 'system';
  return (localStorage.getItem('theme') as Theme) || 'system';
}

function createThemeStore() {
  const { subscribe, set } = writable<Theme>(getInitialTheme());

  // Initialize theme on load
  if (browser) {
    applyTheme(getInitialTheme());

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = localStorage.getItem('theme') as Theme;
      if (current === 'system') {
        applyTheme('system');
      }
    });
  }

  return {
    subscribe,
    set: (value: Theme) => {
      if (browser) localStorage.setItem('theme', value);
      set(value);
      applyTheme(value);
    },
  };
}

function applyTheme(theme: Theme) {
  if (!browser) return;

  const root = document.documentElement;

  // Remove all theme classes
  Object.values(THEME_CLASSES).forEach((cls) => root.classList.remove(cls));
  root.classList.remove('dark');

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    root.classList.toggle('dark', prefersDark);
  } else if (theme === 'dark') {
    root.classList.add('theme-dark', 'dark');
  } else if (theme === 'salesforce') {
    root.classList.add('theme-salesforce');
    // Salesforce theme is light-based, no 'dark' class
  } else {
    root.classList.add('theme-light');
  }
}

export const theme = createThemeStore();
export const setTheme = theme.set;

// Derived store for checking if current theme is dark
export const isDark = derived(theme, ($theme) => {
  if (!browser) return false;
  if ($theme === 'dark') return true;
  if ($theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
});

