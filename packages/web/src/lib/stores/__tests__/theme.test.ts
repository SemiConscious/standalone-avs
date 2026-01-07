/**
 * Tests for Theme Store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock $app/environment before importing the store
vi.mock('$app/environment', () => ({
  browser: true,
}));

describe('Theme Store', () => {
  let theme: typeof import('../theme').theme;
  let setTheme: typeof import('../theme').setTheme;
  let isDark: typeof import('../theme').isDark;

  beforeEach(async () => {
    // Reset localStorage
    localStorage.clear();

    // Reset document classes
    document.documentElement.className = '';

    // Reset modules to get fresh store
    vi.resetModules();

    // Re-import the store
    const themeModule = await import('../theme');
    theme = themeModule.theme;
    setTheme = themeModule.setTheme;
    isDark = themeModule.isDark;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInitialTheme', () => {
    it('should default to system when no theme is stored', async () => {
      localStorage.removeItem('theme');
      vi.resetModules();
      const { theme } = await import('../theme');
      expect(get(theme)).toBe('system');
    });

    it('should use stored theme when available', async () => {
      localStorage.setItem('theme', 'dark');
      vi.resetModules();
      const { theme } = await import('../theme');
      expect(get(theme)).toBe('dark');
    });
  });

  describe('set', () => {
    it('should update the theme', () => {
      setTheme('dark');
      expect(get(theme)).toBe('dark');
    });

    it('should store theme in localStorage', () => {
      setTheme('light');
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should apply theme-dark class when setting dark theme', () => {
      setTheme('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should apply theme-light class when setting light theme', () => {
      setTheme('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should apply theme-salesforce class when setting salesforce theme', () => {
      setTheme('salesforce');
      expect(document.documentElement.classList.contains('theme-salesforce')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should remove old theme classes when changing theme', () => {
      setTheme('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);

      setTheme('light');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });
  });

  describe('system theme', () => {
    it('should apply light theme when system prefers light', () => {
      // Mock matchMedia to return light preference
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      setTheme('system');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });

    it('should apply dark theme when system prefers dark', () => {
      // Mock matchMedia to return dark preference
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      setTheme('system');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });
  });

  describe('isDark derived store', () => {
    it('should return true when theme is dark', () => {
      setTheme('dark');
      expect(get(isDark)).toBe(true);
    });

    it('should return false when theme is light', () => {
      setTheme('light');
      expect(get(isDark)).toBe(false);
    });

    it('should return false when theme is salesforce', () => {
      setTheme('salesforce');
      expect(get(isDark)).toBe(false);
    });

    it('should return system preference when theme is system', () => {
      // Mock matchMedia for dark preference
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      setTheme('system');
      expect(get(isDark)).toBe(true);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of theme changes', () => {
      const callback = vi.fn();
      const unsubscribe = theme.subscribe(callback);

      setTheme('dark');
      expect(callback).toHaveBeenCalledWith('dark');

      unsubscribe();
    });
  });

  describe('system preference change listener', () => {
    it('should reapply theme when system preference changes and theme is system', async () => {
      let changeCallback: (() => void) | null = null;

      // Mock matchMedia to capture the event listener
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, cb) => {
          if (event === 'change') {
            changeCallback = cb;
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      // Reset and reimport to register listener with our mock
      localStorage.setItem('theme', 'system');
      vi.resetModules();
      const { theme: newTheme, setTheme: newSetTheme } = await import('../theme');

      // Verify theme is system
      expect(get(newTheme)).toBe('system');

      // Simulate system preference change - this should trigger the listener
      if (changeCallback) {
        // Update the mock to return dark preference
        window.matchMedia = vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));

        // Trigger the change callback
        changeCallback();

        // Theme should be reapplied with new system preference
        expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      }
    });

    it('should not reapply theme when system preference changes but theme is not system', async () => {
      let changeCallback: (() => void) | null = null;

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, cb) => {
          if (event === 'change') {
            changeCallback = cb;
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      // Set a specific theme (not 'system')
      localStorage.setItem('theme', 'light');
      vi.resetModules();
      await import('../theme');

      // Ensure document has light theme class
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);

      // Simulate system preference change
      if (changeCallback) {
        // Update the mock to return dark preference
        window.matchMedia = vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));

        changeCallback();

        // Theme should remain light (not change because theme is not 'system')
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
        expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      }
    });
  });
});

