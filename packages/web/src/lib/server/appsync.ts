/**
 * AWS AppSync GraphQL Client for AI Features
 * 
 * This service handles GraphQL queries to the AppSync API for:
 * - AI Agents
 * - Knowledge Bases
 * 
 * The AppSync URL is retrieved from Salesforce API_v1__c.AppSyncHost__c
 * or from environment variable APPSYNC_URL.
 * 
 * Authentication uses the same Sapien JWT with appropriate scope.
 */

import { env } from '$env/dynamic/private';

// Default AppSync host (can be overridden by Salesforce config or env)
const DEFAULT_APPSYNC_URL = env.APPSYNC_URL;

/**
 * GraphQL query definitions
 */
export const GRAPHQL_QUERIES = {
  /**
   * Fetch all AI agents
   */
  AGENTS: `
    query {
      agents {
        id
        name
        description
        versions
      }
    }
  `,

  /**
   * Fetch all knowledge stores
   */
  KNOWLEDGE_STORES: `
    query {
      knowledgeStores {
        id
        name
        tags
        metadata {
          metadataParameter
          defaultValue
        }
        embeddingLanguageType
      }
    }
  `,

  /**
   * Get knowledge base status
   */
  KNOWLEDGE_BASE_STATUS: (knowledgeBaseId: string) => `
    query {
      knowledgeBaseStatus(knowledgeStoreId: "${knowledgeBaseId}") {
        status
      }
    }
  `,

  /**
   * Test a knowledge base query
   */
  KNOWLEDGE_STORES_TEST: `
    mutation knowledgeBaseToolTest($input: KnowledgeBaseToolTestInput!) {
      knowledgeBaseToolTest(input: $input) {
        content
        score
        source
        metadata
      }
    }
  `,
};

// ============================================================
// Types
// ============================================================

/**
 * AI Agent from AppSync
 */
export interface AIAgent {
  id: string;
  name: string;
  description: string;
  versions?: string[];
}

/**
 * Knowledge store metadata
 */
export interface KnowledgeStoreMetadata {
  metadataParameter: string;
  defaultValue: string | string[];
}

/**
 * Knowledge store from AppSync
 */
export interface KnowledgeStore {
  id: string;
  name: string;
  tags: string[];
  metadata: KnowledgeStoreMetadata[];
  embeddingLanguageType?: string;
}

/**
 * Knowledge base status
 */
export interface KnowledgeBaseStatus {
  status: 'READY' | 'INDEXING' | 'ERROR' | string;
}

/**
 * Knowledge test result
 */
export interface KnowledgeTestResult {
  content: string;
  score: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * GraphQL response wrapper
 */
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

// ============================================================
// Core GraphQL Functions
// ============================================================

/**
 * Execute a GraphQL query against AppSync
 * 
 * @param appSyncUrl - AppSync GraphQL endpoint URL
 * @param jwt - Authorization JWT
 * @param query - GraphQL query string
 * @param variables - Optional query variables
 * @returns GraphQL response data
 */
export async function executeGraphQL<T>(
  appSyncUrl: string,
  jwt: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const endpoint = appSyncUrl.endsWith('/graphql') 
    ? appSyncUrl 
    : `${appSyncUrl}/graphql`;

  console.log(`[AppSync] Executing GraphQL query to ${endpoint}`);

  const requestBody: { query: string; variables?: string } = { query };
  if (variables) {
    requestBody.variables = JSON.stringify(variables);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AppSync Error] ${response.status} - ${errorText}`);
    throw new Error(`AppSync request failed: ${errorText}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map(e => e.message).join('; ');
    console.error(`[AppSync GraphQL Error] ${errorMessages}`);
    throw new Error(`GraphQL error: ${errorMessages}`);
  }

  return result.data as T;
}

// ============================================================
// AI Agent Functions
// ============================================================

/**
 * Fetch all AI agents
 * 
 * @param appSyncUrl - AppSync endpoint URL
 * @param jwt - Sapien JWT with appropriate scope
 * @returns Array of AI agents
 */
export async function fetchAIAgents(
  appSyncUrl: string,
  jwt: string
): Promise<AIAgent[]> {
  console.log('[AppSync] Fetching AI agents');

  const data = await executeGraphQL<{ agents: AIAgent[] }>(
    appSyncUrl,
    jwt,
    GRAPHQL_QUERIES.AGENTS
  );

  console.log(`[AppSync] Fetched ${data.agents?.length || 0} agents`);
  return data.agents || [];
}

/**
 * Process agents data for dropdown options
 */
export function processAgentsForSelect(agents: AIAgent[]): Array<{ name: string; value: string }> {
  return agents
    .map(agent => {
      const name = agent.name.toUpperCase();
      let displayName = `${name} - ${agent.description}`;
      if (displayName.length > 60) {
        displayName = displayName.slice(0, 60) + '...';
      }
      return {
        name: displayName,
        value: agent.id,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Process agent versions for dropdown options
 */
export function processAgentVersions(versions?: string[]): Array<{ name: string; value: string }> {
  const defaultOptions = [
    { name: 'Working Draft', value: 'HEAD' },
    { name: 'Last Published Version', value: 'LATEST' },
  ];

  if (!versions || !Array.isArray(versions)) return defaultOptions;

  return versions.reduce((acc, version) => {
    const normalizedName = typeof version === 'string' 
      ? (version.trim().toUpperCase().startsWith('V') 
          ? `Version ${version.trim().slice(1)}` 
          : version.trim())
      : String(version);
    acc.push({ name: normalizedName, value: version });
    return acc;
  }, [...defaultOptions]);
}

// ============================================================
// Knowledge Base Functions
// ============================================================

/**
 * Fetch all knowledge stores
 * 
 * @param appSyncUrl - AppSync endpoint URL
 * @param jwt - Sapien JWT with appropriate scope
 * @returns Array of knowledge stores
 */
export async function fetchKnowledgeStores(
  appSyncUrl: string,
  jwt: string
): Promise<KnowledgeStore[]> {
  console.log('[AppSync] Fetching knowledge stores');

  const data = await executeGraphQL<{ knowledgeStores: KnowledgeStore[] }>(
    appSyncUrl,
    jwt,
    GRAPHQL_QUERIES.KNOWLEDGE_STORES
  );

  console.log(`[AppSync] Fetched ${data.knowledgeStores?.length || 0} knowledge stores`);
  return data.knowledgeStores || [];
}

/**
 * Process knowledge stores for select options
 */
export function processKnowledgeStoresForSelect(stores: KnowledgeStore[]): Array<{
  value: string;
  label: string;
  id: string;
  tags: Array<{ label: string; value: string }>;
  metaProperties: Array<{ id: string; name: string; value: string }>;
  embeddingLanguageType?: string;
}> {
  const options = stores.map(store => {
    // Extract unique tags
    const uniqueTags = [...new Set(store.tags.filter(t => t))];
    const tags = uniqueTags.map(tag => ({ label: tag, value: tag }));

    // Extract metadata properties
    const metaProperties = store.metadata
      .filter(m => !Array.isArray(m.defaultValue))
      .map(m => ({
        id: crypto.randomUUID(),
        name: m.metadataParameter,
        value: m.defaultValue as string,
      }));

    return {
      id: store.id,
      value: store.id,
      label: store.name,
      tags,
      metaProperties,
      embeddingLanguageType: store.embeddingLanguageType,
    };
  });

  // Add empty option at the beginning
  if (options.length > 0) {
    options.unshift({
      id: '',
      value: '',
      label: 'Select a knowledge base...',
      tags: [],
      metaProperties: [],
    });
  }

  return options;
}

/**
 * Get knowledge base status
 * 
 * @param appSyncUrl - AppSync endpoint URL
 * @param jwt - Sapien JWT
 * @param knowledgeBaseId - Knowledge base ID
 * @returns Status string
 */
export async function getKnowledgeBaseStatus(
  appSyncUrl: string,
  jwt: string,
  knowledgeBaseId: string
): Promise<string | null> {
  console.log(`[AppSync] Getting status for knowledge base ${knowledgeBaseId}`);

  const data = await executeGraphQL<{ knowledgeBaseStatus: KnowledgeBaseStatus }>(
    appSyncUrl,
    jwt,
    GRAPHQL_QUERIES.KNOWLEDGE_BASE_STATUS(knowledgeBaseId)
  );

  return data.knowledgeBaseStatus?.status || null;
}

/**
 * Test a knowledge base query
 * 
 * @param appSyncUrl - AppSync endpoint URL
 * @param jwt - Sapien JWT
 * @param knowledgeStoreId - Knowledge store ID
 * @param query - Test query string
 * @param metadata - Optional metadata filter
 * @param threshold - Score threshold (0-100)
 * @returns Array of test results
 */
export async function testKnowledgeBase(
  appSyncUrl: string,
  jwt: string,
  knowledgeStoreId: string,
  query: string,
  metadata?: { tags: string[]; metadata: Record<string, string> },
  threshold: number = 70
): Promise<KnowledgeTestResult[]> {
  console.log(`[AppSync] Testing knowledge base ${knowledgeStoreId}`);

  if (!knowledgeStoreId) {
    throw new Error('Knowledge store ID is required');
  }
  if (!query) {
    throw new Error('Query is required');
  }

  const variables = {
    input: {
      knowledgeStoreId,
      query,
      metadata: metadata ? JSON.stringify(metadata) : JSON.stringify({ metadata: {}, tags: [] }),
      threshold: threshold / 100, // Convert to 0-1 range
    },
  };

  const data = await executeGraphQL<{ knowledgeBaseToolTest: KnowledgeTestResult[] }>(
    appSyncUrl,
    jwt,
    GRAPHQL_QUERIES.KNOWLEDGE_STORES_TEST,
    variables
  );

  console.log(`[AppSync] Got ${data.knowledgeBaseToolTest?.length || 0} test results`);
  return data.knowledgeBaseToolTest || [];
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get AppSync URL from environment or config
 * Falls back to Salesforce config if env not set
 */
export function getAppSyncUrl(): string | undefined {
  return DEFAULT_APPSYNC_URL;
}

/**
 * Check if AppSync is configured
 */
export function isAppSyncConfigured(): boolean {
  return !!getAppSyncUrl();
}

