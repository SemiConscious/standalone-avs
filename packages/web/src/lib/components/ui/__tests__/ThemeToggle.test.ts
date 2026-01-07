/**
 * Tests for ThemeToggle Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ThemeToggle from '../ThemeToggle.svelte';

// Mock the theme store
vi.mock('$lib/stores/theme', () => ({
  theme: {
    subscribe: vi.fn((cb) => {
      cb('system');
      return () => {};
    }),
  },
  setTheme: vi.fn(),
}));

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render toggle button', () => {
      render(ThemeToggle);
      expect(screen.getByRole('button', { name: /change theme/i })).toBeInTheDocument();
    });

    it('should have aria-haspopup attribute', () => {
      render(ThemeToggle);
      expect(screen.getByRole('button', { name: /change theme/i })).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should show aria-expanded as false initially', () => {
      render(ThemeToggle);
      expect(screen.getByRole('button', { name: /change theme/i })).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Dropdown Behavior', () => {
    it('should open dropdown when clicked', async () => {
      render(ThemeToggle);
      const button = screen.getByRole('button', { name: /change theme/i });
      
      await fireEvent.click(button);
      
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should close dropdown when clicked again', async () => {
      render(ThemeToggle);
      const button = screen.getByRole('button', { name: /change theme/i });
      
      await fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      await fireEvent.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should show all theme options in dropdown', async () => {
      render(ThemeToggle);
      await fireEvent.click(screen.getByRole('button', { name: /change theme/i }));
      
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('Salesforce')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should render theme options as buttons with option role', async () => {
      render(ThemeToggle);
      await fireEvent.click(screen.getByRole('button', { name: /change theme/i }));
      
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
    });
  });

  describe('Theme Selection', () => {
    it('should call setTheme when option is clicked', async () => {
      const { setTheme } = await import('$lib/stores/theme');
      render(ThemeToggle);
      
      await fireEvent.click(screen.getByRole('button', { name: /change theme/i }));
      await fireEvent.click(screen.getByText('Light'));
      
      expect(setTheme).toHaveBeenCalledWith('light');
    });

    it('should close dropdown after selecting theme', async () => {
      render(ThemeToggle);
      
      await fireEvent.click(screen.getByRole('button', { name: /change theme/i }));
      await fireEvent.click(screen.getByText('Dark'));
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', async () => {
      const { container } = render(ThemeToggle);
      
      await fireEvent.click(screen.getByRole('button', { name: /change theme/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Click outside the component
      await fireEvent.click(document.body);
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on toggle button', () => {
      render(ThemeToggle);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Change theme');
    });

    it('should indicate selected theme with aria-selected', async () => {
      render(ThemeToggle);
      await fireEvent.click(screen.getByRole('button', { name: /change theme/i }));
      
      // System should be selected by default (from our mock)
      const systemOption = screen.getByText('System').closest('button');
      expect(systemOption).toHaveAttribute('aria-selected', 'true');
    });
  });
});

