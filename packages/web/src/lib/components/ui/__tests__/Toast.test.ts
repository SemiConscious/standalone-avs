/**
 * Tests for Toast Component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toast from '../Toast.svelte';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render with message', () => {
      render(Toast, { props: { message: 'Test message' } });
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should render with info type by default', () => {
      const { container } = render(Toast, { props: { message: 'Info' } });
      expect(container.querySelector('.text-accent')).toBeInTheDocument();
    });

    it('should have alert role for accessibility', () => {
      render(Toast, { props: { message: 'Alert' } });
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Types', () => {
    it('should render success type with correct styling', () => {
      const { container } = render(Toast, { props: { type: 'success', message: 'Success!' } });
      expect(container.querySelector('.text-success')).toBeInTheDocument();
    });

    it('should render error type with correct styling', () => {
      const { container } = render(Toast, { props: { type: 'error', message: 'Error!' } });
      expect(container.querySelector('.text-error')).toBeInTheDocument();
    });

    it('should render warning type with correct styling', () => {
      const { container } = render(Toast, { props: { type: 'warning', message: 'Warning!' } });
      expect(container.querySelector('.text-warning')).toBeInTheDocument();
    });

    it('should render info type with correct styling', () => {
      const { container } = render(Toast, { props: { type: 'info', message: 'Info!' } });
      expect(container.querySelector('.text-accent')).toBeInTheDocument();
    });
  });

  describe('Description', () => {
    it('should render without description by default', () => {
      const { container } = render(Toast, { props: { message: 'Title only' } });
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(1);
    });

    it('should render description when provided', () => {
      render(Toast, { props: { message: 'Title', description: 'More details here' } });
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('More details here')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('should not render close button when onClose is not provided', () => {
      render(Toast, { props: { message: 'No close' } });
      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    });

    it('should render close button when onClose is provided', () => {
      const onClose = vi.fn();
      render(Toast, { props: { message: 'Closable', onClose } });
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(Toast, { props: { message: 'Close me', onClose } });
      
      await fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after default duration', () => {
      const onClose = vi.fn();
      render(Toast, { props: { message: 'Auto close', onClose } });
      
      vi.advanceTimersByTime(5000);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should auto-dismiss after custom duration', () => {
      const onClose = vi.fn();
      render(Toast, { props: { message: 'Custom duration', onClose, duration: 3000 } });
      
      vi.advanceTimersByTime(2999);
      expect(onClose).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not auto-dismiss when duration is 0', () => {
      const onClose = vi.fn();
      render(Toast, { props: { message: 'Persistent', onClose, duration: 0 } });
      
      vi.advanceTimersByTime(10000);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not auto-dismiss when onClose is not provided', () => {
      render(Toast, { props: { message: 'No handler' } });
      
      // Should not throw error
      expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
    });
  });
});

