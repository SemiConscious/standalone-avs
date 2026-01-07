/**
 * Tests for the Events API service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createEventSubscription,
  getEventSubscriptions,
  getEventSubscriptionsForPolicy,
  updateEventSubscription,
  deleteEventSubscription,
  deleteEventSubscriptionsForPolicy,
  syncEventSubscriptionsFromPolicy,
  type EventSubscription,
  type EventSubscriptionPayload,
} from '../events';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock env
vi.mock('$env/dynamic/private', () => ({
  env: {
    EVENTS_HOST: 'https://test-events.natterbox.net',
  },
}));

describe('Events Service', () => {
  const mockJwt = 'test-jwt-token';
  const mockOrgId = 12345;
  const eventsHost = 'https://test-events.natterbox.net';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createEventSubscription', () => {
    it('should create an event subscription', async () => {
      const payload: EventSubscriptionPayload = {
        name: 'Test Subscription',
        eventType: 'salesforce',
        policyId: 100,
        enabled: true,
        config: { field: 'value' },
      };

      const mockResponse: EventSubscription = {
        ...payload,
        id: 'sub-123',
        organizationId: mockOrgId,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await createEventSubscription(mockJwt, mockOrgId, payload);

      expect(mockFetch).toHaveBeenCalledWith(
        `${eventsHost}/v1/events/${mockOrgId}/subscriptions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid payload'),
      });

      await expect(
        createEventSubscription(mockJwt, mockOrgId, {
          name: 'Test',
          eventType: 'salesforce',
          policyId: 100,
          enabled: true,
        })
      ).rejects.toThrow('Failed to create event subscription: Invalid payload');
    });
  });

  describe('getEventSubscriptions', () => {
    it('should fetch all event subscriptions', async () => {
      const mockSubscriptions: EventSubscription[] = [
        {
          id: 'sub-1',
          name: 'Sub 1',
          eventType: 'salesforce',
          policyId: 100,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'sub-2',
          name: 'Sub 2',
          eventType: 'webhook',
          policyId: 200,
          enabled: false,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSubscriptions),
      });

      const result = await getEventSubscriptions(mockJwt, mockOrgId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${eventsHost}/v1/events/${mockOrgId}/subscriptions`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
          },
        }
      );

      expect(result).toEqual(mockSubscriptions);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        getEventSubscriptions(mockJwt, mockOrgId)
      ).rejects.toThrow('Failed to fetch event subscriptions: Unauthorized');
    });
  });

  describe('getEventSubscriptionsForPolicy', () => {
    it('should filter subscriptions by policy ID', async () => {
      const mockSubscriptions: EventSubscription[] = [
        {
          id: 'sub-1',
          name: 'Sub 1',
          eventType: 'salesforce',
          policyId: 100,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'sub-2',
          name: 'Sub 2',
          eventType: 'webhook',
          policyId: 200,
          enabled: false,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'sub-3',
          name: 'Sub 3',
          eventType: 'salesforce',
          policyId: 100,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSubscriptions),
      });

      const result = await getEventSubscriptionsForPolicy(mockJwt, mockOrgId, 100);

      expect(result).toHaveLength(2);
      expect(result.every(s => s.policyId === 100)).toBe(true);
    });
  });

  describe('updateEventSubscription', () => {
    it('should update an event subscription', async () => {
      const subscriptionId = 'sub-123';
      const updatePayload = { name: 'Updated Name', enabled: false };

      const mockResponse: EventSubscription = {
        id: subscriptionId,
        name: 'Updated Name',
        eventType: 'salesforce',
        policyId: 100,
        enabled: false,
        organizationId: mockOrgId,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await updateEventSubscription(mockJwt, mockOrgId, subscriptionId, updatePayload);

      expect(mockFetch).toHaveBeenCalledWith(
        `${eventsHost}/v1/events/${mockOrgId}/subscriptions/${subscriptionId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        }
      );

      expect(result.name).toBe('Updated Name');
      expect(result.enabled).toBe(false);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid update payload'),
      });

      await expect(
        updateEventSubscription(mockJwt, mockOrgId, 'sub-123', { name: 'Updated' })
      ).rejects.toThrow('Failed to update event subscription: Invalid update payload');
    });
  });

  describe('deleteEventSubscription', () => {
    it('should delete an event subscription', async () => {
      const subscriptionId = 'sub-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await deleteEventSubscription(mockJwt, mockOrgId, subscriptionId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${eventsHost}/v1/events/${mockOrgId}/subscriptions/${subscriptionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
          },
        }
      );

      expect(result).toBe(true);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Subscription not found'),
      });

      await expect(
        deleteEventSubscription(mockJwt, mockOrgId, 'non-existent')
      ).rejects.toThrow('Failed to delete event subscription: Subscription not found');
    });
  });

  describe('deleteEventSubscriptionsForPolicy', () => {
    it('should delete all subscriptions for a policy', async () => {
      const policyId = 100;
      const mockSubscriptions: EventSubscription[] = [
        {
          id: 'sub-1',
          name: 'Sub 1',
          eventType: 'salesforce',
          policyId,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'sub-2',
          name: 'Sub 2',
          eventType: 'webhook',
          policyId,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // First call to get subscriptions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSubscriptions),
      });

      // Then two delete calls
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockFetch.mockResolvedValueOnce({ ok: true });

      const deletedCount = await deleteEventSubscriptionsForPolicy(mockJwt, mockOrgId, policyId);

      expect(deletedCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should continue deleting when one delete fails', async () => {
      const policyId = 100;
      const mockSubscriptions: EventSubscription[] = [
        {
          id: 'sub-1',
          name: 'Sub 1',
          eventType: 'salesforce',
          policyId,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'sub-2',
          name: 'Sub 2',
          eventType: 'webhook',
          policyId,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // First call to get subscriptions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSubscriptions),
      });

      // First delete fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      });

      // Second delete succeeds
      mockFetch.mockResolvedValueOnce({ ok: true });

      const deletedCount = await deleteEventSubscriptionsForPolicy(mockJwt, mockOrgId, policyId);

      // Only 1 was successfully deleted
      expect(deletedCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('syncEventSubscriptionsFromPolicy', () => {
    it('should create new subscriptions for event nodes', async () => {
      const policyId = 100;
      const eventNodes = [
        {
          id: 'node-1',
          name: 'New Event',
          eventType: 'salesforce',
          enabled: true,
        },
      ];

      // First call to get existing subscriptions (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      // Second call to create new subscription
      const createdSub: EventSubscription = {
        id: 'sub-new',
        name: 'New Event',
        eventType: 'salesforce',
        policyId,
        enabled: true,
        organizationId: mockOrgId,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdSub),
      });

      const result = await syncEventSubscriptionsFromPolicy(mockJwt, mockOrgId, policyId, eventNodes);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sub-new');
    });

    it('should update existing subscriptions', async () => {
      const policyId = 100;
      const existingSubId = 'sub-existing';
      const eventNodes = [
        {
          id: 'node-1',
          name: 'Updated Event',
          eventType: 'salesforce',
          enabled: false,
          subscriptionId: existingSubId,
        },
      ];

      // Existing subscription
      const existingSub: EventSubscription = {
        id: existingSubId,
        name: 'Original Event',
        eventType: 'salesforce',
        policyId,
        enabled: true,
        organizationId: mockOrgId,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      // First call to get existing subscriptions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([existingSub]),
      });

      // Second call to update subscription
      const updatedSub: EventSubscription = {
        ...existingSub,
        name: 'Updated Event',
        enabled: false,
        updatedAt: '2026-01-02T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedSub),
      });

      const result = await syncEventSubscriptionsFromPolicy(mockJwt, mockOrgId, policyId, eventNodes);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Updated Event');
      expect(result[0].enabled).toBe(false);
    });

    it('should delete orphaned subscriptions', async () => {
      const policyId = 100;
      const eventNodes: Array<{
        id: string;
        name: string;
        eventType: string;
        enabled: boolean;
        subscriptionId?: string;
      }> = []; // No event nodes - all subscriptions are orphaned

      // Existing subscription
      const existingSub: EventSubscription = {
        id: 'sub-orphan',
        name: 'Orphan Event',
        eventType: 'salesforce',
        policyId,
        enabled: true,
        organizationId: mockOrgId,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      // First call to get existing subscriptions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([existingSub]),
      });

      // Second call to delete orphan
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await syncEventSubscriptionsFromPolicy(mockJwt, mockOrgId, policyId, eventNodes);

      expect(result).toHaveLength(0);
      // Verify delete was called
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/subscriptions/sub-orphan'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle create failure gracefully and continue', async () => {
      const policyId = 100;
      const eventNodes = [
        {
          id: 'node-1',
          name: 'Event 1',
          eventType: 'salesforce',
          enabled: true,
        },
        {
          id: 'node-2',
          name: 'Event 2',
          eventType: 'webhook',
          enabled: true,
        },
      ];

      // Get existing subscriptions (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      // First create fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      });

      // Second create succeeds
      const createdSub: EventSubscription = {
        id: 'sub-2',
        name: 'Event 2',
        eventType: 'webhook',
        policyId,
        enabled: true,
        organizationId: mockOrgId,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdSub),
      });

      // Should not throw - continues processing despite first failure
      const result = await syncEventSubscriptionsFromPolicy(mockJwt, mockOrgId, policyId, eventNodes);

      // Only the second subscription was created
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Event 2');
    });

    it('should handle delete orphan failure gracefully', async () => {
      const policyId = 100;
      const eventNodes: Array<{
        id: string;
        name: string;
        eventType: string;
        enabled: boolean;
        subscriptionId?: string;
      }> = []; // No event nodes - all subscriptions are orphaned

      // Two existing subscriptions
      const existingSubs: EventSubscription[] = [
        {
          id: 'sub-orphan-1',
          name: 'Orphan 1',
          eventType: 'salesforce',
          policyId,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'sub-orphan-2',
          name: 'Orphan 2',
          eventType: 'webhook',
          policyId,
          enabled: true,
          organizationId: mockOrgId,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      // Get existing subscriptions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(existingSubs),
      });

      // First delete fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Failed to delete'),
      });

      // Second delete succeeds
      mockFetch.mockResolvedValueOnce({ ok: true });

      // Should not throw - continues processing despite first delete failure
      const result = await syncEventSubscriptionsFromPolicy(mockJwt, mockOrgId, policyId, eventNodes);

      // Result should be empty (no event nodes)
      expect(result).toHaveLength(0);
      // Both deletes were attempted
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});

