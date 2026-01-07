/**
 * Tests for the OmniChannel service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDigitalChannelGroups,
  getSharedInboxes,
  getAllSharedInboxes,
  getMessageTemplates,
  getMessageTemplate,
  getOmniChannelQueues,
  getOmniChannelFlows,
  getSalesforceQueues,
  getCallCenterRoutingEntries,
  buildDigitalChannelTableRow,
  buildDigitalChannelTableRows,
  markUsedDigitalChannels,
  type DigitalChannelGroup,
  type SharedInbox,
  type MessageTemplate,
} from '../omnichannel';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock env
vi.mock('$env/dynamic/private', () => ({
  env: {
    OMNI_REST_HOST: 'https://test-omni.natterbox.net',
    OMNI_TEMPLATES_HOST: 'https://test-templates.natterbox.net',
    SALESFORCE_PACKAGE_NAMESPACE: 'nbavs',
  },
}));

// Mock querySalesforce
vi.mock('../salesforce', () => ({
  querySalesforce: vi.fn(),
}));

describe('OmniChannel Service', () => {
  const mockJwt = 'test-jwt-token';
  const mockOrgId = 12345;
  const omniHost = 'https://test-omni.natterbox.net';
  const templatesHost = 'https://test-templates.natterbox.net';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDigitalChannelGroups', () => {
    it('should fetch digital channel groups', async () => {
      const mockChannels: DigitalChannelGroup[] = [
        {
          id: 'ch-1',
          name: 'Main WhatsApp',
          type: 'SHARED',
          channelType: 'WHATSAPP',
          address: '+1 555 0100',
          organizationId: mockOrgId,
        },
        {
          id: 'ch-2',
          name: 'Support SMS',
          type: 'SHARED',
          channelType: 'SMS',
          address: '+1 555 0200',
          organizationId: mockOrgId,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChannels),
      });

      const result = await getDigitalChannelGroups(mockJwt, mockOrgId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${omniHost}/v1/omni/${mockOrgId}/digital-channel-groups?verbose=yes`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
          },
        }
      );

      expect(result).toEqual(mockChannels);
    });

    it('should filter by type when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getDigitalChannelGroups(mockJwt, mockOrgId, 'SHARED');

      expect(mockFetch).toHaveBeenCalledWith(
        `${omniHost}/v1/omni/${mockOrgId}/digital-channel-groups?type=SHARED&verbose=yes`,
        expect.any(Object)
      );
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        getDigitalChannelGroups(mockJwt, mockOrgId)
      ).rejects.toThrow('Failed to fetch digital channel groups: Unauthorized');
    });
  });

  describe('getSharedInboxes', () => {
    it('should fetch shared inboxes', async () => {
      const mockResponse = {
        folders: [
          { id: 'f1', name: 'Sales', organizationId: mockOrgId },
          { id: 'f2', name: 'Support', organizationId: mockOrgId },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await getSharedInboxes(mockJwt, mockOrgId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${omniHost}/v1/omni/${mockOrgId}/folders`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
          },
        }
      );

      expect(result.folders).toHaveLength(2);
    });

    it('should include nextKey parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ folders: [] }),
      });

      await getSharedInboxes(mockJwt, mockOrgId, 'next-page-key');

      expect(mockFetch).toHaveBeenCalledWith(
        `${omniHost}/v1/omni/${mockOrgId}/folders?nextKey=next-page-key`,
        expect.any(Object)
      );
    });
  });

  describe('getAllSharedInboxes', () => {
    it('should fetch all pages of shared inboxes', async () => {
      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          folders: [{ id: 'f1', name: 'Sales', organizationId: mockOrgId }],
          nextKey: 'page-2',
        }),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          folders: [{ id: 'f2', name: 'Support', organizationId: mockOrgId }],
        }),
      });

      const result = await getAllSharedInboxes(mockJwt, mockOrgId);

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMessageTemplates', () => {
    it('should fetch message templates', async () => {
      const mockTemplates: MessageTemplate[] = [
        {
          id: 't1',
          name: 'Welcome',
          content: 'Hello {{name}}',
          channelType: 'WHATSAPP',
          status: 'APPROVED',
          organizationId: mockOrgId,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTemplates),
      });

      const result = await getMessageTemplates(mockJwt, mockOrgId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${templatesHost}/v1/templates/${mockOrgId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
          },
        }
      );

      expect(result).toEqual(mockTemplates);
    });

    it('should filter by channel type when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getMessageTemplates(mockJwt, mockOrgId, 'WHATSAPP');

      expect(mockFetch).toHaveBeenCalledWith(
        `${templatesHost}/v1/templates/${mockOrgId}?channelType=WHATSAPP`,
        expect.any(Object)
      );
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      });

      await expect(
        getMessageTemplates(mockJwt, mockOrgId)
      ).rejects.toThrow('Failed to fetch message templates: Server error');
    });
  });

  describe('getMessageTemplate', () => {
    it('should fetch a specific message template', async () => {
      const mockTemplate: MessageTemplate = {
        id: 't1',
        name: 'Welcome',
        content: 'Hello {{name}}',
        channelType: 'WHATSAPP',
        status: 'APPROVED',
        organizationId: mockOrgId,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTemplate),
      });

      const result = await getMessageTemplate(mockJwt, mockOrgId, 't1');

      expect(mockFetch).toHaveBeenCalledWith(
        `${templatesHost}/v1/templates/${mockOrgId}/t1`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockJwt}`,
          },
        }
      );

      expect(result).toEqual(mockTemplate);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Template not found'),
      });

      await expect(
        getMessageTemplate(mockJwt, mockOrgId, 'invalid-id')
      ).rejects.toThrow('Failed to fetch message template: Template not found');
    });
  });

  describe('Helper functions', () => {
    describe('buildDigitalChannelTableRow', () => {
      it('should build table row from channel', () => {
        const channel: DigitalChannelGroup = {
          id: 'ch-1',
          name: 'Main WhatsApp',
          type: 'SHARED',
          channelType: 'WHATSAPP',
          address: '+1 555 0100',
          test: true,
          disabled: false,
          organizationId: mockOrgId,
        };

        const row = buildDigitalChannelTableRow(channel);

        expect(row).toEqual(['Main WhatsApp', '+1 555 0100', 'WHATSAPP', true, false]);
      });

      it('should handle missing optional fields', () => {
        const channel: DigitalChannelGroup = {
          id: 'ch-1',
          name: 'Main WhatsApp',
          type: 'SHARED',
          channelType: 'WHATSAPP',
          address: '+1 555 0100',
          organizationId: mockOrgId,
        };

        const row = buildDigitalChannelTableRow(channel);

        expect(row).toEqual(['Main WhatsApp', '+1 555 0100', 'WHATSAPP', false, false]);
      });
    });

    describe('buildDigitalChannelTableRows', () => {
      it('should build table rows from multiple channels', () => {
        const channels: DigitalChannelGroup[] = [
          {
            id: 'ch-1',
            name: 'WhatsApp',
            type: 'SHARED',
            channelType: 'WHATSAPP',
            address: '+1 555 0100',
            organizationId: mockOrgId,
          },
          {
            id: 'ch-2',
            name: 'SMS',
            type: 'SHARED',
            channelType: 'SMS',
            address: '+1 555 0200',
            organizationId: mockOrgId,
          },
        ];

        const rows = buildDigitalChannelTableRows(channels);

        expect(rows).toHaveLength(2);
        expect(rows[0][0]).toBe('WhatsApp');
        expect(rows[1][0]).toBe('SMS');
      });
    });

    describe('markUsedDigitalChannels', () => {
      it('should mark channels as disabled if in used set', () => {
        const channels: DigitalChannelGroup[] = [
          { id: 'ch-1', name: 'WhatsApp', type: 'SHARED', channelType: 'WHATSAPP', address: '+1', organizationId: mockOrgId },
          { id: 'ch-2', name: 'SMS', type: 'SHARED', channelType: 'SMS', address: '+2', organizationId: mockOrgId },
          { id: 'ch-3', name: 'Email', type: 'SHARED', channelType: 'EMAIL', address: 'test@example.com', organizationId: mockOrgId },
        ];

        const usedIds = new Set(['ch-1', 'ch-3']);

        const result = markUsedDigitalChannels(channels, usedIds);

        expect(result[0].disabled).toBe(true);  // ch-1 is used
        expect(result[1].disabled).toBe(false); // ch-2 is not used
        expect(result[2].disabled).toBe(true);  // ch-3 is used
      });
    });
  });

  describe('Salesforce OmniChannel Functions', () => {
    const mockInstanceUrl = 'https://test.salesforce.com';
    const mockAccessToken = 'sf-access-token';

    describe('getOmniChannelQueues', () => {
      it('should fetch OmniChannel queues from Salesforce', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockResolvedValueOnce({
          records: [
            { Id: 'q1', Name: 'Sales Queue', DeveloperName: 'Sales_Queue', IsActive: true },
            { Id: 'q2', Name: 'Support Queue', DeveloperName: 'Support_Queue', IsActive: true },
          ],
          done: true,
          totalSize: 2,
        });

        const result = await getOmniChannelQueues(mockInstanceUrl, mockAccessToken);

        expect(mockQuery).toHaveBeenCalledWith(
          mockInstanceUrl,
          mockAccessToken,
          expect.stringContaining('QueueRoutingConfig')
        );
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Sales Queue');
        expect(result[1].developerName).toBe('Support_Queue');
      });

      it('should return empty array on error', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockRejectedValueOnce(new Error('Query failed'));

        const result = await getOmniChannelQueues(mockInstanceUrl, mockAccessToken);

        expect(result).toEqual([]);
      });
    });

    describe('getOmniChannelFlows', () => {
      it('should fetch OmniChannel flows from Salesforce', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockResolvedValueOnce({
          records: [
            { Id: 'f1', MasterLabel: 'Sales Flow', DeveloperName: 'Sales_Flow', Description: 'Sales routing', IsActive: true },
          ],
          done: true,
          totalSize: 1,
        });

        const result = await getOmniChannelFlows(mockInstanceUrl, mockAccessToken);

        expect(mockQuery).toHaveBeenCalledWith(
          mockInstanceUrl,
          mockAccessToken,
          expect.stringContaining('Flow')
        );
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Sales Flow');
        expect(result[0].description).toBe('Sales routing');
      });

      it('should return empty array on error', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockRejectedValueOnce(new Error('Query failed'));

        const result = await getOmniChannelFlows(mockInstanceUrl, mockAccessToken);

        expect(result).toEqual([]);
      });
    });

    describe('getSalesforceQueues', () => {
      it('should fetch Salesforce queues (Group records)', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockResolvedValueOnce({
          records: [
            { Id: 'g1', Name: 'Sales Queue', DeveloperName: 'Sales_Queue' },
            { Id: 'g2', Name: 'Support Queue', DeveloperName: 'Support_Queue' },
          ],
          done: true,
          totalSize: 2,
        });

        const result = await getSalesforceQueues(mockInstanceUrl, mockAccessToken);

        expect(mockQuery).toHaveBeenCalledWith(
          mockInstanceUrl,
          mockAccessToken,
          expect.stringContaining('Group')
        );
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Sales Queue');
      });

      it('should return empty array on error', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockRejectedValueOnce(new Error('Query failed'));

        const result = await getSalesforceQueues(mockInstanceUrl, mockAccessToken);

        expect(result).toEqual([]);
      });
    });

    describe('getCallCenterRoutingEntries', () => {
      it('should fetch call center routing entries', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockResolvedValueOnce({
          records: [
            { Id: 'r1', Name: 'Entry 1', CallCenterId: 'cc1', ServiceResourceId: 'sr1' },
            { Id: 'r2', Name: 'Entry 2', CallCenterId: 'cc2' },
          ],
          done: true,
          totalSize: 2,
        });

        const result = await getCallCenterRoutingEntries(mockInstanceUrl, mockAccessToken);

        expect(mockQuery).toHaveBeenCalledWith(
          mockInstanceUrl,
          mockAccessToken,
          expect.stringContaining('CallCenterRoutingMap')
        );
        expect(result).toHaveLength(2);
        expect(result[0].callCenterId).toBe('cc1');
        expect(result[0].serviceResourceId).toBe('sr1');
        expect(result[1].serviceResourceId).toBeUndefined();
      });

      it('should return empty array on error', async () => {
        const { querySalesforce } = await import('../salesforce');
        const mockQuery = vi.mocked(querySalesforce);
        
        mockQuery.mockRejectedValueOnce(new Error('Query failed'));

        const result = await getCallCenterRoutingEntries(mockInstanceUrl, mockAccessToken);

        expect(result).toEqual([]);
      });
    });
  });
});

