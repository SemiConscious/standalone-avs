/**
 * Tests for Sapien API client
 * Validates JWT retrieval, policy CRUD operations, and helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment
vi.mock('$env/dynamic/private', () => ({
  env: {
    SAPIEN_HOST: 'https://api.sapien.test',
    SAPIEN_ORGANIZATION_ID: '12345',
    SALESFORCE_PACKAGE_NAMESPACE: 'nbavs',
  },
}));

// Import after mocking
import {
  getSapienJwt,
  decodeJwtPayload,
  getSapienConfig,
  isSapienDirectConfigured,
  sapienRequest,
  savePolicyToSapien,
  createPolicyInSapien,
  deletePolicyFromSapien,
  getSapienOrganizationId,
  getSapienUserId,
  getSapienUsername,
  clearSapienJwtCache,
  canGetSapienJwt,
  getActiveCalls,
  getRecordingUrl,
  SAPIEN_SCOPES,
} from '../sapien';

describe('Sapien API Client', () => {
  const mockInstanceUrl = 'https://test.salesforce.com';
  const mockAccessToken = 'sf-access-token';
  const mockSapienHost = 'https://api.sapien.test';
  const mockOrgId = 12345;
  
  // Sample JWT with Natterbox claims
  const sampleJwtPayload = {
    'https://natterbox.com/claim/orgId': '12345',
    'https://natterbox.com/claim/userId': '67890',
    'https://natterbox.com/claim/username': 'test.user@natterbox.com',
    iss: 'gatekeeper',
    scope: 'enduser:basic',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  
  // Encode the sample payload as JWT (header.payload.signature)
  const encodedPayload = Buffer.from(JSON.stringify(sampleJwtPayload)).toString('base64url');
  const sampleJwt = `eyJhbGciOiJSUzI1NiJ9.${encodedPayload}.signature`;

  beforeEach(() => {
    vi.clearAllMocks();
    clearSapienJwtCache();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSapienConfig', () => {
    it('should return host from env and org ID from JWT when cached', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: sampleJwt })),
      });

      await getSapienJwt(mockInstanceUrl, mockAccessToken);
      const config = getSapienConfig();

      expect(config.host).toBe('https://api.sapien.test');
      expect(config.organizationId).toBe(12345); // From JWT payload
    });

    it('should return org ID from env when no JWT is cached', () => {
      clearSapienJwtCache();
      const config = getSapienConfig();

      expect(config.host).toBe('https://api.sapien.test');
      expect(config.organizationId).toBe(12345); // From env SAPIEN_ORGANIZATION_ID
    });
  });

  describe('isSapienDirectConfigured', () => {
    it('should return true when host and org ID are configured', () => {
      // Env has SAPIEN_HOST and SAPIEN_ORGANIZATION_ID
      const result = isSapienDirectConfigured();
      expect(result).toBe(true);
    });
  });

  describe('decodeJwtPayload', () => {
    it('should decode a valid JWT payload', () => {
      const payload = decodeJwtPayload(sampleJwt);
      
      expect(payload['https://natterbox.com/claim/orgId']).toBe('12345');
      expect(payload['https://natterbox.com/claim/userId']).toBe('67890');
      expect(payload.scope).toBe('enduser:basic');
    });

    it('should throw error for invalid JWT format', () => {
      expect(() => decodeJwtPayload('invalid')).toThrow('Invalid JWT format');
      expect(() => decodeJwtPayload('one.two')).toThrow('Invalid JWT format');
    });

    it('should handle base64url encoding', () => {
      // Create a payload with characters that need base64url handling
      const specialPayload = { test: 'value+with/special=chars' };
      const encoded = Buffer.from(JSON.stringify(specialPayload)).toString('base64url');
      const jwt = `header.${encoded}.signature`;
      
      const decoded = decodeJwtPayload(jwt);
      expect(decoded.test).toBe('value+with/special=chars');
    });
  });

  describe('getSapienJwt', () => {
    it('should fetch JWT from Salesforce Apex REST endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: sampleJwt })),
      });

      const jwt = await getSapienJwt(mockInstanceUrl, mockAccessToken, 'enduser:basic');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockInstanceUrl}/services/apexrest/nbavs/token/enduser%3Abasic`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
      expect(jwt).toBe(sampleJwt);
    });

    it('should cache JWT and return cached value on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: sampleJwt })),
      });

      // First call - should fetch
      const jwt1 = await getSapienJwt(mockInstanceUrl, mockAccessToken, 'enduser:basic');
      // Second call - should return cached
      const jwt2 = await getSapienJwt(mockInstanceUrl, mockAccessToken, 'enduser:basic');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(jwt1).toBe(jwt2);
    });

    it('should fetch new JWT for different scope', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: sampleJwt })),
      });

      await getSapienJwt(mockInstanceUrl, mockAccessToken, 'enduser:basic');
      await getSapienJwt(mockInstanceUrl, mockAccessToken, 'routing-policies:admin');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error on auth failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        getSapienJwt(mockInstanceUrl, mockAccessToken)
      ).rejects.toThrow('Failed to get Sapien JWT');
    });

    it('should throw error on invalid JWT response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('not json'),
      });

      await expect(
        getSapienJwt(mockInstanceUrl, mockAccessToken)
      ).rejects.toThrow('Invalid JWT response');
    });

    it('should throw error when response has no jwt field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ token: 'some-value', other: 'data' })),
      });

      // The inner "No JWT in response" error is caught and re-thrown as "Invalid JWT response"
      await expect(
        getSapienJwt(mockInstanceUrl, mockAccessToken)
      ).rejects.toThrow('Invalid JWT response');
    });

    it('should use default expiration when JWT has no exp field', async () => {
      // Create a JWT without exp claim
      const payloadWithoutExp = {
        'https://natterbox.com/claim/orgId': '12345',
        'https://natterbox.com/claim/userId': '67890',
        'https://natterbox.com/claim/username': 'test.user@natterbox.com',
        iss: 'gatekeeper',
        scope: 'enduser:basic',
        iat: Math.floor(Date.now() / 1000),
        // No exp field!
      };
      const encodedNoExp = Buffer.from(JSON.stringify(payloadWithoutExp)).toString('base64url');
      const jwtWithoutExp = `eyJhbGciOiJSUzI1NiJ9.${encodedNoExp}.signature`;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: jwtWithoutExp })),
      });

      const jwt = await getSapienJwt(mockInstanceUrl, mockAccessToken, 'enduser:basic');
      expect(jwt).toBe(jwtWithoutExp);

      // Verify caching works - second call should return cached value
      const jwt2 = await getSapienJwt(mockInstanceUrl, mockAccessToken, 'enduser:basic');
      expect(jwt2).toBe(jwtWithoutExp);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSapienOrganizationId', () => {
    it('should return organization ID from cached JWT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: sampleJwt })),
      });

      await getSapienJwt(mockInstanceUrl, mockAccessToken);
      const orgId = getSapienOrganizationId();

      expect(orgId).toBe(12345);
    });

    it('should return null when no JWT is cached', () => {
      const orgId = getSapienOrganizationId();
      expect(orgId).toBeNull();
    });
  });

  describe('getSapienUserId', () => {
    it('should return user ID from cached JWT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: sampleJwt })),
      });

      await getSapienJwt(mockInstanceUrl, mockAccessToken);
      const userId = getSapienUserId();

      expect(userId).toBe(67890);
    });

    it('should return null when no JWT is cached', () => {
      const userId = getSapienUserId();
      expect(userId).toBeNull();
    });
  });

  describe('getSapienUsername', () => {
    it('should return username from cached JWT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ jwt: sampleJwt })),
      });

      await getSapienJwt(mockInstanceUrl, mockAccessToken);
      const username = getSapienUsername();

      expect(username).toBe('test.user@natterbox.com');
    });

    it('should return null when no JWT is cached', () => {
      const username = getSapienUsername();
      expect(username).toBeNull();
    });
  });

  describe('sapienRequest', () => {
    const mockJwt = 'mock-jwt-token';

    it('should make authenticated GET request', async () => {
      const mockResponse = { data: [{ id: 1 }] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await sapienRequest(mockSapienHost, mockJwt, 'GET', '/v1/test');

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockSapienHost}/v1/test`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockJwt}`,
          }),
        })
      );
      expect(result).toEqual([{ id: 1 }]); // Returns data property
    });

    it('should make authenticated POST request with body', async () => {
      const requestBody = { name: 'Test Policy' };
      const mockResponse = { data: { id: 123, name: 'Test Policy' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await sapienRequest(
        mockSapienHost,
        mockJwt,
        'POST',
        '/v1/test',
        { body: requestBody }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockSapienHost}/v1/test`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockJwt}`,
          }),
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual({ id: 123, name: 'Test Policy' });
    });

    it('should convert PATCH to POST with X-HTTP-Method-Override header', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      await sapienRequest(mockSapienHost, mockJwt, 'PATCH', '/v1/test', { body: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-HTTP-Method-Override': 'PATCH',
          }),
        })
      );
    });

    it('should throw error on request failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(
        sapienRequest(mockSapienHost, mockJwt, 'GET', '/v1/test')
      ).rejects.toThrow('Sapien API error');
    });

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await sapienRequest(mockSapienHost, mockJwt, 'DELETE', '/v1/test');
      expect(result).toEqual({});
    });
  });

  describe('savePolicyToSapien', () => {
    const mockJwt = 'mock-jwt-token';
    const policyId = 123;
    const policyJson = JSON.stringify({
      name: 'Test Policy',
      enabled: true,
      type: 'CALL',
      items: [],
    });

    it('should update existing policy', async () => {
      const mockResponse = { data: { id: policyId, name: 'Test Policy' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await savePolicyToSapien(
        mockSapienHost,
        mockJwt,
        mockOrgId,
        policyId,
        policyJson
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockSapienHost}/organisation/${mockOrgId}/dial-plan/policy-destination-number/${policyId}`,
        expect.objectContaining({
          method: 'PUT',
        })
      );
      expect(result.id).toBe(policyId);
    });
  });

  describe('createPolicyInSapien', () => {
    const mockJwt = 'mock-jwt-token';
    const policyJson = JSON.stringify({
      name: 'New Policy',
      enabled: true,
      type: 'CALL',
      items: [],
    });

    it('should create new policy and return ID', async () => {
      const newPolicyId = 456;
      const mockResponse = { data: { id: newPolicyId, name: 'New Policy' } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });

      const result = await createPolicyInSapien(
        mockSapienHost,
        mockJwt,
        mockOrgId,
        policyJson
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockSapienHost}/organisation/${mockOrgId}/dial-plan/policy-destination-number`,
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(result.id).toBe(newPolicyId);
    });
  });

  describe('deletePolicyFromSapien', () => {
    const mockJwt = 'mock-jwt-token';
    const policyId = 789;

    it('should delete policy successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      });

      const result = await deletePolicyFromSapien(
        mockSapienHost,
        mockJwt,
        mockOrgId,
        policyId
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockSapienHost}/organisation/${mockOrgId}/dial-plan/policy/${policyId}`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toBe(true);
    });
  });

  describe('canGetSapienJwt', () => {
    it('should return true when credentials are valid', () => {
      const locals = {
        accessToken: 'valid-token',
        instanceUrl: 'https://test.salesforce.com',
      } as App.Locals;

      expect(canGetSapienJwt(locals)).toBe(true);
    });

    it('should return false when accessToken is missing', () => {
      const locals = {
        instanceUrl: 'https://test.salesforce.com',
      } as App.Locals;

      expect(canGetSapienJwt(locals)).toBe(false);
    });

    it('should return false when instanceUrl is missing', () => {
      const locals = {
        accessToken: 'valid-token',
      } as App.Locals;

      expect(canGetSapienJwt(locals)).toBe(false);
    });
  });

  describe('getActiveCalls', () => {
    const mockJwt = 'mock-jwt-token';

    it('should fetch active calls from Sapien API', async () => {
      const mockCalls = [
        { id: 'call-1', status: 'active', duration: 120 },
        { id: 'call-2', status: 'ringing', duration: 0 },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: mockCalls })),
      });

      const result = await getActiveCalls(mockSapienHost, mockJwt, mockOrgId);

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockSapienHost}/organisation/${mockOrgId}/call`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockJwt}`,
          }),
        })
      );
      expect(result).toEqual(mockCalls);
    });

    it('should return empty array when no active calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: [] })),
      });

      const result = await getActiveCalls(mockSapienHost, mockJwt, mockOrgId);
      expect(result).toEqual([]);
    });
  });

  describe('getRecordingUrl', () => {
    it('should construct recording URL correctly', () => {
      const uuid = 'recording-uuid-123';
      const url = getRecordingUrl(mockSapienHost, mockOrgId, uuid);

      expect(url).toBe(`${mockSapienHost}/organisation/${mockOrgId}/recording/${uuid}`);
    });

    it('should handle different UUIDs', () => {
      const uuid1 = 'abc-123';
      const uuid2 = 'xyz-789';

      expect(getRecordingUrl(mockSapienHost, mockOrgId, uuid1))
        .toBe(`${mockSapienHost}/organisation/${mockOrgId}/recording/${uuid1}`);
      expect(getRecordingUrl(mockSapienHost, mockOrgId, uuid2))
        .toBe(`${mockSapienHost}/organisation/${mockOrgId}/recording/${uuid2}`);
    });
  });

  describe('SAPIEN_SCOPES', () => {
    it('should have expected scope constants', () => {
      expect(SAPIEN_SCOPES.ENDUSER_BASIC).toBe('enduser:basic');
      expect(SAPIEN_SCOPES.ROUTING_POLICIES_ADMIN).toBe('routing-policies:admin');
      expect(SAPIEN_SCOPES.INSIGHTS_ADMIN).toBe('insights:admin');
      expect(SAPIEN_SCOPES.OMNI_ADMIN).toBe('omni:admin');
    });
  });
});
