/**
 * Tests for Toast Store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { toasts } from '../toast';

describe('Toast Store', () => {
  beforeEach(() => {
    // Clear toasts before each test
    toasts.clear();
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllTimers();
  });

  describe('add', () => {
    it('should add a toast to the store', () => {
      toasts.add({ type: 'info', message: 'Test message' });
      const current = get(toasts);
      expect(current).toHaveLength(1);
      expect(current[0].message).toBe('Test message');
      expect(current[0].type).toBe('info');
    });

    it('should generate unique IDs for toasts', () => {
      toasts.add({ type: 'info', message: 'Toast 1' });
      toasts.add({ type: 'info', message: 'Toast 2' });
      const current = get(toasts);
      expect(current[0].id).not.toBe(current[1].id);
    });

    it('should include description when provided', () => {
      toasts.add({ type: 'info', message: 'Test', description: 'Description' });
      const current = get(toasts);
      expect(current[0].description).toBe('Description');
    });

    it('should return the toast ID', () => {
      const id = toasts.add({ type: 'info', message: 'Test' });
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should auto-remove toast after default duration', async () => {
      vi.useFakeTimers();
      toasts.add({ type: 'info', message: 'Test' });
      expect(get(toasts)).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(get(toasts)).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should auto-remove toast after custom duration', async () => {
      vi.useFakeTimers();
      toasts.add({ type: 'info', message: 'Test', duration: 2000 });
      expect(get(toasts)).toHaveLength(1);

      vi.advanceTimersByTime(2000);
      expect(get(toasts)).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should not auto-remove toast when duration is 0', async () => {
      vi.useFakeTimers();
      toasts.add({ type: 'info', message: 'Test', duration: 0 });
      expect(get(toasts)).toHaveLength(1);

      vi.advanceTimersByTime(10000);
      expect(get(toasts)).toHaveLength(1);
      vi.useRealTimers();
    });
  });

  describe('remove', () => {
    it('should remove a specific toast by ID', () => {
      const id1 = toasts.add({ type: 'info', message: 'Toast 1', duration: 0 });
      toasts.add({ type: 'info', message: 'Toast 2', duration: 0 });
      expect(get(toasts)).toHaveLength(2);

      toasts.remove(id1);
      const current = get(toasts);
      expect(current).toHaveLength(1);
      expect(current[0].message).toBe('Toast 2');
    });

    it('should not throw when removing non-existent ID', () => {
      toasts.add({ type: 'info', message: 'Toast', duration: 0 });
      expect(() => toasts.remove('non-existent-id')).not.toThrow();
      expect(get(toasts)).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should remove all toasts', () => {
      toasts.add({ type: 'info', message: 'Toast 1', duration: 0 });
      toasts.add({ type: 'info', message: 'Toast 2', duration: 0 });
      toasts.add({ type: 'info', message: 'Toast 3', duration: 0 });
      expect(get(toasts)).toHaveLength(3);

      toasts.clear();
      expect(get(toasts)).toHaveLength(0);
    });

    it('should work on empty store', () => {
      expect(() => toasts.clear()).not.toThrow();
      expect(get(toasts)).toHaveLength(0);
    });
  });

  describe('success', () => {
    it('should add a success toast', () => {
      toasts.success('Success message');
      const current = get(toasts);
      expect(current[0].type).toBe('success');
      expect(current[0].message).toBe('Success message');
    });

    it('should add a success toast with description', () => {
      toasts.success('Success', 'Description');
      const current = get(toasts);
      expect(current[0].description).toBe('Description');
    });
  });

  describe('error', () => {
    it('should add an error toast', () => {
      toasts.error('Error message');
      const current = get(toasts);
      expect(current[0].type).toBe('error');
      expect(current[0].message).toBe('Error message');
    });

    it('should add an error toast with description', () => {
      toasts.error('Error', 'Description');
      const current = get(toasts);
      expect(current[0].description).toBe('Description');
    });
  });

  describe('warning', () => {
    it('should add a warning toast', () => {
      toasts.warning('Warning message');
      const current = get(toasts);
      expect(current[0].type).toBe('warning');
      expect(current[0].message).toBe('Warning message');
    });

    it('should add a warning toast with description', () => {
      toasts.warning('Warning', 'Description');
      const current = get(toasts);
      expect(current[0].description).toBe('Description');
    });
  });

  describe('info', () => {
    it('should add an info toast', () => {
      toasts.info('Info message');
      const current = get(toasts);
      expect(current[0].type).toBe('info');
      expect(current[0].message).toBe('Info message');
    });

    it('should add an info toast with description', () => {
      toasts.info('Info', 'Description');
      const current = get(toasts);
      expect(current[0].description).toBe('Description');
    });
  });

  describe('subscribe', () => {
    it('should allow subscribing to toast changes', () => {
      const callback = vi.fn();
      const unsubscribe = toasts.subscribe(callback);

      toasts.add({ type: 'info', message: 'Test', duration: 0 });
      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should call subscriber with initial value', () => {
      const callback = vi.fn();
      toasts.subscribe(callback);
      expect(callback).toHaveBeenCalledWith([]);
    });
  });
});

