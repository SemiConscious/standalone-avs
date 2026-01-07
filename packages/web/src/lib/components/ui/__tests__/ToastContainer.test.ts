/**
 * Tests for ToastContainer Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ToastContainer from '../ToastContainer.svelte';
import { toasts } from '$lib/stores/toast';

describe('ToastContainer Component', () => {
  beforeEach(() => {
    // Clear toasts before each test
    toasts.clear();
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    });
  });

  describe('Rendering', () => {
    it('should render container with aria-label', () => {
      const { container } = render(ToastContainer);
      const toastContainer = container.querySelector('[aria-label="Notifications"]');
      expect(toastContainer).toBeInTheDocument();
    });

    it('should have aria-live polite attribute for accessibility', () => {
      const { container } = render(ToastContainer);
      const toastContainer = container.querySelector('[aria-live="polite"]');
      expect(toastContainer).toBeInTheDocument();
      expect(toastContainer).toHaveAttribute('aria-live', 'polite');
    });

    it('should be positioned fixed in bottom right', () => {
      const { container } = render(ToastContainer);
      const toastContainer = container.querySelector('[aria-live="polite"]');
      expect(toastContainer).toHaveClass('fixed');
      expect(toastContainer).toHaveClass('bottom-4');
      expect(toastContainer).toHaveClass('right-4');
    });
  });

  describe('Empty State', () => {
    it('should render empty when no toasts', () => {
      render(ToastContainer);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Displaying Toasts', () => {
    it('should display toast when added to store', async () => {
      render(ToastContainer);
      toasts.add({ type: 'info', message: 'Test toast', duration: 0 });
      
      // Wait for reactivity
      await vi.waitFor(() => {
        expect(screen.getByText('Test toast')).toBeInTheDocument();
      });
    });

    it('should display multiple toasts', async () => {
      render(ToastContainer);
      toasts.add({ type: 'info', message: 'Toast 1', duration: 0 });
      toasts.add({ type: 'success', message: 'Toast 2', duration: 0 });
      
      await vi.waitFor(() => {
        expect(screen.getByText('Toast 1')).toBeInTheDocument();
        expect(screen.getByText('Toast 2')).toBeInTheDocument();
      });
    });

    it('should display toast with description', async () => {
      render(ToastContainer);
      toasts.add({ 
        type: 'info', 
        message: 'Title', 
        description: 'Description text',
        duration: 0 
      });
      
      await vi.waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Description text')).toBeInTheDocument();
      });
    });
  });

  describe('Toast Types', () => {
    it('should display success toast', async () => {
      render(ToastContainer);
      toasts.success('Success message');
      
      await vi.waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });
    });

    it('should display error toast', async () => {
      render(ToastContainer);
      toasts.error('Error message');
      
      await vi.waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });

    it('should display warning toast', async () => {
      render(ToastContainer);
      toasts.warning('Warning message');
      
      await vi.waitFor(() => {
        expect(screen.getByText('Warning message')).toBeInTheDocument();
      });
    });

    it('should display info toast', async () => {
      render(ToastContainer);
      toasts.info('Info message');
      
      await vi.waitFor(() => {
        expect(screen.getByText('Info message')).toBeInTheDocument();
      });
    });
  });

  describe('Removing Toasts', () => {
    it('should remove toast when removed from store', async () => {
      render(ToastContainer);
      const id = toasts.add({ type: 'info', message: 'Test toast', duration: 0 });
      
      await vi.waitFor(() => {
        expect(screen.getByText('Test toast')).toBeInTheDocument();
      });

      toasts.remove(id);

      await vi.waitFor(() => {
        expect(screen.queryByText('Test toast')).not.toBeInTheDocument();
      });
    });

    it('should clear all toasts when store is cleared', async () => {
      render(ToastContainer);
      toasts.add({ type: 'info', message: 'Toast 1', duration: 0 });
      toasts.add({ type: 'info', message: 'Toast 2', duration: 0 });
      
      await vi.waitFor(() => {
        expect(screen.getByText('Toast 1')).toBeInTheDocument();
        expect(screen.getByText('Toast 2')).toBeInTheDocument();
      });

      toasts.clear();

      await vi.waitFor(() => {
        expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Animation', () => {
    it('should have animation classes on toast wrapper', async () => {
      const { container } = render(ToastContainer);
      toasts.add({ type: 'info', message: 'Test toast', duration: 0 });
      
      await vi.waitFor(() => {
        const toastWrapper = container.querySelector('.animate-in');
        expect(toastWrapper).toBeInTheDocument();
      });
    });
  });
});

