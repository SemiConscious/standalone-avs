import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalesforceEventBus } from '../adapter/salesforce-event-bus';
import type { SalesforceAuthProvider } from '../auth/salesforce-auth';

// Mock auth provider
const createMockAuthProvider = (): SalesforceAuthProvider => ({
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(),
  refreshToken: vi.fn(),
  isAuthenticated: vi.fn().mockReturnValue(true),
  getCurrentUser: vi.fn(),
  getConnection: vi.fn(),
  getInstanceUrl: vi.fn(),
} as unknown as SalesforceAuthProvider);

describe('SalesforceEventBus', () => {
  let eventBus: SalesforceEventBus;
  let mockAuthProvider: SalesforceAuthProvider;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    eventBus = new SalesforceEventBus(mockAuthProvider);
  });

  describe('subscribe', () => {
    it('should return a subscription with unsubscribe function', () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test-event', handler);

      expect(subscription).toHaveProperty('unsubscribe');
      expect(subscription).toHaveProperty('isActive');
      expect(typeof subscription.unsubscribe).toBe('function');
      expect(subscription.isActive()).toBe(true);
    });

    it('should mark subscription as inactive after unsubscribe', () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test-event', handler);

      subscription.unsubscribe();

      expect(subscription.isActive()).toBe(false);
    });
  });

  describe('publish', () => {
    it('should notify subscribers with a PlatformEvent', async () => {
      const handler = vi.fn();
      eventBus.subscribe('test-event', handler);

      await eventBus.publish('test-event', { data: 'test' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test-event',
          payload: { data: 'test' },
          source: 'local',
          timestamp: expect.any(Date),
        })
      );
    });

    it('should not throw if there are no subscribers', async () => {
      await expect(eventBus.publish('unknown-event', { data: 'test' })).resolves.not.toThrow();
    });

    it('should notify multiple subscribers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);

      await eventBus.publish('test-event', { data: 'test' });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not notify unsubscribed handlers', async () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test-event', handler);

      subscription.unsubscribe();
      await eventBus.publish('test-event', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('hasSubscribers', () => {
    it('should return true when there are subscribers', () => {
      const handler = vi.fn();
      eventBus.subscribe('test-event', handler);

      expect(eventBus.hasSubscribers('test-event')).toBe(true);
    });

    it('should return false when there are no subscribers', () => {
      expect(eventBus.hasSubscribers('unknown-event')).toBe(false);
    });

    it('should return false after all subscribers unsubscribe', () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribe('test-event', handler);

      subscription.unsubscribe();

      expect(eventBus.hasSubscribers('test-event')).toBe(false);
    });
  });

  describe('unsubscribeAll', () => {
    it('should remove all subscribers for an event type', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test-event', handler1);
      eventBus.subscribe('test-event', handler2);

      eventBus.unsubscribeAll('test-event');
      await eventBus.publish('test-event', { data: 'test' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(eventBus.hasSubscribers('test-event')).toBe(false);
    });
  });

  describe('subscribeToChannel', () => {
    it('should return a subscription for channel events', () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribeToChannel('/event/TestEvent__e', handler);

      expect(subscription).toHaveProperty('unsubscribe');
      expect(subscription).toHaveProperty('isActive');
      expect(subscription.isActive()).toBe(true);
    });

    it('should mark subscription as inactive after unsubscribe', () => {
      const handler = vi.fn();
      const subscription = eventBus.subscribeToChannel('/event/TestEvent__e', handler);

      subscription.unsubscribe();

      expect(subscription.isActive()).toBe(false);
    });
  });
});
