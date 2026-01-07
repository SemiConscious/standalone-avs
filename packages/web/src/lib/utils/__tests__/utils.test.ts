import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatPhoneNumber,
  debounce,
  truncate,
  getInitials,
} from '../index';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('should format a Date object with default options', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDate(date);
      // Check that it includes key parts (locale-independent check)
      expect(result).toMatch(/\d+/); // Should have numbers
      expect(result).toMatch(/Jan|2024/); // Should have month or year
    });

    it('should format a date string', () => {
      const result = formatDate('2024-01-15T12:00:00Z');
      expect(result).toMatch(/\d+/);
    });

    it('should respect custom options', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDate(date, { year: 'numeric', month: 'long', day: 'numeric' });
      expect(result).toMatch(/January|2024|15/);
    });
  });

  describe('formatDateTime', () => {
    it('should format a Date object with default options', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDateTime(date);
      // Check that it includes key parts (locale-independent check)
      expect(result).toMatch(/\d+/); // Should have numbers
    });

    it('should format a date string', () => {
      const result = formatDateTime('2024-01-15T12:00:00Z');
      expect(result).toMatch(/\d+/);
    });

    it('should respect custom options', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDateTime(date, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
      expect(result).toMatch(/\d+/);
    });
  });

  describe('cn', () => {
    it('should concatenate class names', () => {
      expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
    });

    it('should filter out falsy values', () => {
      expect(cn('foo', false, 'bar', null, undefined, 'baz')).toBe('foo bar baz');
    });

    it('should return empty string for no classes', () => {
      expect(cn(false, null, undefined)).toBe('');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit US numbers', () => {
      expect(formatPhoneNumber('4155551234')).toBe('(415) 555-1234');
    });

    it('should format 11-digit US numbers with country code', () => {
      expect(formatPhoneNumber('14155551234')).toBe('+1 (415) 555-1234');
    });

    it('should strip non-digit characters', () => {
      expect(formatPhoneNumber('(415) 555-1234')).toBe('(415) 555-1234');
    });

    it('should return original for unrecognized formats', () => {
      expect(formatPhoneNumber('+44123456789')).toBe('+44123456789');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncate('Hello World', 8, '…')).toBe('Hello W…');
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Smith')).toBe('JS');
    });

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should limit to maxLength', () => {
      expect(getInitials('John Michael Smith', 2)).toBe('JM');
    });

    it('should handle multiple names', () => {
      expect(getInitials('John Michael Smith', 3)).toBe('JMS');
    });

    it('should uppercase initials', () => {
      expect(getInitials('john smith')).toBe('JS');
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to debounced function', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced('arg1', 'arg2');

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format recent time as "just now"', () => {
      const date = new Date('2024-01-15T11:59:30Z');
      expect(formatRelativeTime(date)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const date = new Date('2024-01-15T11:55:00Z');
      expect(formatRelativeTime(date)).toBe('5 minutes ago');
    });

    it('should format hours ago', () => {
      const date = new Date('2024-01-15T10:00:00Z');
      expect(formatRelativeTime(date)).toBe('2 hours ago');
    });

    it('should format days ago', () => {
      const date = new Date('2024-01-13T12:00:00Z');
      expect(formatRelativeTime(date)).toBe('2 days ago');
    });

    it('should handle singular forms', () => {
      const oneMinuteAgo = new Date('2024-01-15T11:59:00Z');
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');

      const oneHourAgo = new Date('2024-01-15T11:00:00Z');
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');

      const oneDayAgo = new Date('2024-01-14T12:00:00Z');
      expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
    });
  });
});

