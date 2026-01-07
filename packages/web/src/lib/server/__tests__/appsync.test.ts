/**
 * Tests for the AppSync GraphQL client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeGraphQL,
  fetchAIAgents,
  fetchKnowledgeStores,
  processAgentsForSelect,
  processAgentVersions,
  processKnowledgeStoresForSelect,
  getKnowledgeBaseStatus,
  testKnowledgeBase,
  GRAPHQL_QUERIES,
  type AIAgent,
  type KnowledgeStore,
} from '../appsync';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AppSync GraphQL Client', () => {
  const mockAppSyncUrl = 'https://test-appsync.amazonaws.com';
  const mockJwt = 'test-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeGraphQL', () => {
    it('should execute a GraphQL query successfully', async () => {
      const mockData = { test: 'data' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      });

      const result = await executeGraphQL<{ test: string }>(
        mockAppSyncUrl,
        mockJwt,
        'query { test }'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockAppSyncUrl}/graphql`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockJwt}`,
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result).toEqual(mockData);
    });

    it('should include variables in the request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { result: 'ok' } }),
      });

      await executeGraphQL(
        mockAppSyncUrl,
        mockJwt,
        'mutation test($input: TestInput!) { test(input: $input) }',
        { input: { foo: 'bar' } }
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.variables).toBeDefined();
    });

    it('should throw error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(
        executeGraphQL(mockAppSyncUrl, mockJwt, 'query { test }')
      ).rejects.toThrow('AppSync request failed: Unauthorized');
    });

    it('should throw error on GraphQL errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: null,
          errors: [{ message: 'Invalid query' }],
        }),
      });

      await expect(
        executeGraphQL(mockAppSyncUrl, mockJwt, 'query { test }')
      ).rejects.toThrow('GraphQL error: Invalid query');
    });
  });

  describe('fetchAIAgents', () => {
    it('should fetch and return AI agents', async () => {
      const mockAgents: AIAgent[] = [
        { id: 'agent-1', name: 'Sales Bot', description: 'Handles sales', versions: ['v1', 'v2'] },
        { id: 'agent-2', name: 'Support Bot', description: 'Tech support', versions: ['v1'] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { agents: mockAgents } }),
      });

      const result = await fetchAIAgents(mockAppSyncUrl, mockJwt);

      expect(result).toEqual(mockAgents);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if no agents', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { agents: null } }),
      });

      const result = await fetchAIAgents(mockAppSyncUrl, mockJwt);

      expect(result).toEqual([]);
    });
  });

  describe('processAgentsForSelect', () => {
    it('should process agents for dropdown display', () => {
      const agents: AIAgent[] = [
        { id: 'agent-1', name: 'Alpha Bot', description: 'First bot' },
        { id: 'agent-2', name: 'Beta Bot', description: 'Second bot' },
      ];

      const result = processAgentsForSelect(agents);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('ALPHA BOT - First bot');
      expect(result[0].value).toBe('agent-1');
      // Should be sorted alphabetically
      expect(result[0].name).toBe('ALPHA BOT - First bot');
    });

    it('should truncate long names', () => {
      const agents: AIAgent[] = [
        { 
          id: 'agent-1', 
          name: 'Bot', 
          description: 'This is a very long description that should be truncated to 60 characters total' 
        },
      ];

      const result = processAgentsForSelect(agents);

      expect(result[0].name.length).toBeLessThanOrEqual(63); // 60 + "..."
      expect(result[0].name.endsWith('...')).toBe(true);
    });
  });

  describe('processAgentVersions', () => {
    it('should return default options when no versions provided', () => {
      const result = processAgentVersions();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Working Draft', value: 'HEAD' });
      expect(result[1]).toEqual({ name: 'Last Published Version', value: 'LATEST' });
    });

    it('should include provided versions', () => {
      const result = processAgentVersions(['v1', 'v2', 'v3']);

      expect(result).toHaveLength(5); // 2 defaults + 3 versions
      expect(result).toContainEqual({ name: 'Version 1', value: 'v1' });
    });

    it('should normalize version names starting with V', () => {
      const result = processAgentVersions(['V3']);

      expect(result.find(v => v.value === 'V3')?.name).toBe('Version 3');
    });
  });

  describe('fetchKnowledgeStores', () => {
    it('should fetch and return knowledge stores', async () => {
      const mockStores: KnowledgeStore[] = [
        { 
          id: 'kb-1', 
          name: 'Product Docs', 
          tags: ['products', 'features'],
          metadata: [{ metadataParameter: 'category', defaultValue: 'docs' }],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { knowledgeStores: mockStores } }),
      });

      const result = await fetchKnowledgeStores(mockAppSyncUrl, mockJwt);

      expect(result).toEqual(mockStores);
    });
  });

  describe('processKnowledgeStoresForSelect', () => {
    it('should process stores for select options', () => {
      const stores: KnowledgeStore[] = [
        { 
          id: 'kb-1', 
          name: 'Product Docs', 
          tags: ['products', 'features'],
          metadata: [],
        },
        { 
          id: 'kb-2', 
          name: 'FAQ', 
          tags: ['faq'],
          metadata: [{ metadataParameter: 'category', defaultValue: 'support' }],
        },
      ];

      const result = processKnowledgeStoresForSelect(stores);

      // Should have empty option + 2 stores
      expect(result).toHaveLength(3);
      expect(result[0].value).toBe('');
      expect(result[0].label).toBe('Select a knowledge base...');
      expect(result[1].label).toBe('Product Docs');
      expect(result[1].tags).toHaveLength(2);
    });

    it('should filter duplicate tags', () => {
      const stores: KnowledgeStore[] = [
        { 
          id: 'kb-1', 
          name: 'Test', 
          tags: ['tag1', 'tag1', 'tag2', '', 'tag2'],
          metadata: [],
        },
      ];

      const result = processKnowledgeStoresForSelect(stores);

      expect(result[1].tags).toHaveLength(2);
      expect(result[1].tags.map(t => t.value)).toContain('tag1');
      expect(result[1].tags.map(t => t.value)).toContain('tag2');
    });
  });

  describe('getKnowledgeBaseStatus', () => {
    it('should fetch knowledge base status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          data: { knowledgeBaseStatus: { status: 'READY' } } 
        }),
      });

      const result = await getKnowledgeBaseStatus(mockAppSyncUrl, mockJwt, 'kb-1');

      expect(result).toBe('READY');
    });

    it('should return null if status not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { knowledgeBaseStatus: null } }),
      });

      const result = await getKnowledgeBaseStatus(mockAppSyncUrl, mockJwt, 'kb-1');

      expect(result).toBeNull();
    });
  });

  describe('testKnowledgeBase', () => {
    it('should test a knowledge base query', async () => {
      const mockResults = [
        { content: 'Test content', score: 0.95, source: 'doc.md' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          data: { knowledgeBaseToolTest: mockResults } 
        }),
      });

      const result = await testKnowledgeBase(
        mockAppSyncUrl,
        mockJwt,
        'kb-1',
        'test query'
      );

      expect(result).toEqual(mockResults);
    });

    it('should throw error if knowledge store ID not provided', async () => {
      await expect(
        testKnowledgeBase(mockAppSyncUrl, mockJwt, '', 'test')
      ).rejects.toThrow('Knowledge store ID is required');
    });

    it('should throw error if query not provided', async () => {
      await expect(
        testKnowledgeBase(mockAppSyncUrl, mockJwt, 'kb-1', '')
      ).rejects.toThrow('Query is required');
    });
  });

  describe('GRAPHQL_QUERIES', () => {
    it('should have AGENTS query', () => {
      expect(GRAPHQL_QUERIES.AGENTS).toContain('agents');
      expect(GRAPHQL_QUERIES.AGENTS).toContain('id');
      expect(GRAPHQL_QUERIES.AGENTS).toContain('name');
      expect(GRAPHQL_QUERIES.AGENTS).toContain('description');
    });

    it('should have KNOWLEDGE_STORES query', () => {
      expect(GRAPHQL_QUERIES.KNOWLEDGE_STORES).toContain('knowledgeStores');
      expect(GRAPHQL_QUERIES.KNOWLEDGE_STORES).toContain('id');
      expect(GRAPHQL_QUERIES.KNOWLEDGE_STORES).toContain('name');
      expect(GRAPHQL_QUERIES.KNOWLEDGE_STORES).toContain('tags');
    });

    it('should generate KNOWLEDGE_BASE_STATUS query with ID', () => {
      const query = GRAPHQL_QUERIES.KNOWLEDGE_BASE_STATUS('test-id');
      expect(query).toContain('test-id');
      expect(query).toContain('status');
    });
  });
});

