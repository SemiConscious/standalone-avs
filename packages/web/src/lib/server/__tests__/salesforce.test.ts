/**
 * Tests for Salesforce API client
 * Validates CRUD operations against Salesforce REST API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment
vi.mock('$env/dynamic/private', () => ({
  env: {
    SALESFORCE_CLIENT_ID: 'test-client-id',
    SALESFORCE_CLIENT_SECRET: 'test-client-secret',
  },
}));

// Import after mocking
import {
  querySalesforce,
  updateSalesforce,
  createSalesforce,
  deleteSalesforce,
  hasValidCredentials,
} from '../salesforce';

describe('Salesforce API Client', () => {
  const mockInstanceUrl = 'https://test.salesforce.com';
  const mockAccessToken = 'mock-access-token';

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('querySalesforce', () => {
    it('should execute SOQL query successfully', async () => {
      const mockResponse = {
        totalSize: 2,
        done: true,
        records: [
          { Id: '001', Name: 'Policy 1' },
          { Id: '002', Name: 'Policy 2' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const soql = "SELECT Id, Name FROM nbavs__CallFlow__c";
      const result = await querySalesforce(mockInstanceUrl, mockAccessToken, soql);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/services/data/v62.0/query?q='),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
      expect(result.records).toHaveLength(2);
      expect(result.totalSize).toBe(2);
    });

    it('should URL encode SOQL query', async () => {
      const mockResponse = { totalSize: 0, done: true, records: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const soql = "SELECT Id FROM Account WHERE Name = 'Test Account'";
      await querySalesforce(mockInstanceUrl, mockAccessToken, soql);

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain(encodeURIComponent(soql));
    });

    it('should throw error on failed query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('INVALID_QUERY: syntax error'),
      });

      const soql = "SELECT * FROM Invalid";
      await expect(querySalesforce(mockInstanceUrl, mockAccessToken, soql))
        .rejects.toThrow('Salesforce query failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const soql = "SELECT Id FROM Account";
      await expect(querySalesforce(mockInstanceUrl, mockAccessToken, soql))
        .rejects.toThrow('Network error');
    });
  });

  describe('updateSalesforce', () => {
    it('should update record successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
      });

      const objectName = 'nbavs__CallFlow__c';
      const recordId = '001ABC123';
      const data = { Name: 'Updated Policy', nbavs__Description__c: 'Test' };

      await updateSalesforce(mockInstanceUrl, mockAccessToken, objectName, recordId, data);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockInstanceUrl}/services/data/v62.0/sobjects/${objectName}/${recordId}`,
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify(data),
        })
      );
    });

    it('should throw error on update failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('FIELD_CUSTOM_VALIDATION_EXCEPTION'),
      });

      await expect(
        updateSalesforce(mockInstanceUrl, mockAccessToken, 'Account', '001', { Name: '' })
      ).rejects.toThrow('Salesforce update failed');
    });
  });

  describe('createSalesforce', () => {
    it('should create record and return ID', async () => {
      const mockResponse = { id: '001NEW123', success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const objectName = 'nbavs__CallFlow__c';
      const data = { Name: 'New Policy', Type__c: 'CALL' };

      const result = await createSalesforce(mockInstanceUrl, mockAccessToken, objectName, data);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockInstanceUrl}/services/data/v62.0/sobjects/${objectName}`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockAccessToken}`,
          },
          body: JSON.stringify(data),
        })
      );
      expect(result.id).toBe('001NEW123');
    });

    it('should throw error on create failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('REQUIRED_FIELD_MISSING: Name'),
      });

      await expect(
        createSalesforce(mockInstanceUrl, mockAccessToken, 'Account', {})
      ).rejects.toThrow('Salesforce create failed');
    });
  });

  describe('deleteSalesforce', () => {
    it('should delete record successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const objectName = 'nbavs__CallFlow__c';
      const recordId = '001DEL123';

      await deleteSalesforce(mockInstanceUrl, mockAccessToken, objectName, recordId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockInstanceUrl}/services/data/v62.0/sobjects/${objectName}/${recordId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
      );
    });

    it('should throw error on delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('ENTITY_IS_DELETED'),
      });

      await expect(
        deleteSalesforce(mockInstanceUrl, mockAccessToken, 'Account', 'invalid-id')
      ).rejects.toThrow('Salesforce delete failed');
    });

    it('should handle record not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('NOT_FOUND'),
      });

      await expect(
        deleteSalesforce(mockInstanceUrl, mockAccessToken, 'Account', 'nonexistent')
      ).rejects.toThrow('Salesforce delete failed');
    });
  });

  describe('hasValidCredentials', () => {
    it('should return true when credentials are valid', () => {
      const locals = {
        accessToken: 'valid-token',
        instanceUrl: 'https://test.salesforce.com',
      };

      expect(hasValidCredentials(locals)).toBe(true);
    });

    it('should return false when accessToken is missing', () => {
      const locals = {
        instanceUrl: 'https://test.salesforce.com',
      };

      expect(hasValidCredentials(locals)).toBe(false);
    });

    it('should return false when instanceUrl is missing', () => {
      const locals = {
        accessToken: 'valid-token',
      };

      expect(hasValidCredentials(locals)).toBe(false);
    });

    it('should return false when both are missing', () => {
      const locals = {};
      expect(hasValidCredentials(locals)).toBe(false);
    });

    it('should return false for empty strings', () => {
      const locals = {
        accessToken: '',
        instanceUrl: '',
      };

      expect(hasValidCredentials(locals)).toBe(false);
    });
  });
});

