/**
 * Routing Policy domain types
 * Platform-agnostic - no Salesforce or other platform knowledge
 */

// =============================================================================
// Routing Policy Types
// =============================================================================

export type PolicyType = 'Call' | 'Digital' | 'Outbound' | 'IVR' | 'Queue' | 'Hunt';

export type PolicyStatus = 'Enabled' | 'Disabled' | 'Draft';

export type PolicySource = 'Inbound' | 'Outbound';

// =============================================================================
// Routing Policy Entity
// =============================================================================

/**
 * Routing Policy entity (also known as Call Flow)
 */
export interface RoutingPolicy {
  /** Unique identifier */
  id: string;
  /** External platform ID (e.g., Sapien policy ID) */
  platformId?: number;
  /** Policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Source type (Inbound/Outbound) */
  source: PolicySource;
  /** Policy type */
  type: PolicyType;
  /** Current status */
  status: PolicyStatus;
  /** Creator user ID */
  createdById: string;
  /** Creator name */
  createdByName: string;
  /** Creation date */
  createdDate: string;
  /** Last modifier user ID */
  lastModifiedById: string;
  /** Last modifier name */
  lastModifiedByName: string;
  /** Last modification date */
  lastModifiedDate: string;
  /** Phone numbers assigned to this policy */
  phoneNumbers: string[];
  /** Policy body (flow definition) - raw JSON string or parsed object */
  body?: string | object;
}

// =============================================================================
// Policy Editor Types
// =============================================================================

/**
 * Policy body containing the visual flow representation
 */
export interface PolicyBody {
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  viewport?: PolicyViewport;
}

/**
 * Node in the policy flow
 */
export interface PolicyNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: PolicyNodeData;
}

/**
 * Node data
 */
export interface PolicyNodeData {
  label: string;
  templateId?: number;
  templateClass?: string;
  [key: string]: unknown;
}

/**
 * Edge connecting nodes in the policy flow
 */
export interface PolicyEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

/**
 * Viewport state for the policy editor
 */
export interface PolicyViewport {
  x: number;
  y: number;
  zoom: number;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a new routing policy
 */
export interface CreateRoutingPolicyInput {
  name: string;
  description?: string;
  type?: PolicyType;
  source?: PolicySource;
}

/**
 * Input for updating a routing policy
 */
export interface UpdateRoutingPolicyInput {
  name?: string;
  description?: string;
  status?: PolicyStatus;
  body?: PolicyBody;
  policy?: string; // JSON string of policy configuration
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create default policy body with just a start node
 */
export function createDefaultPolicyBody(): PolicyBody {
  return {
    nodes: [
      {
        id: 'init-1',
        type: 'init',
        position: { x: 100, y: 200 },
        data: { label: 'Start', templateId: 1, templateClass: 'ModFromPolicy' }
      }
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  };
}

/**
 * Create default policy JSON
 */
export function createDefaultPolicyJson(name: string, type: PolicyType = 'Call'): string {
  return JSON.stringify({
    name,
    enabled: false,
    type,
    items: []
  });
}

/**
 * Parse policy status from string
 */
export function parsePolicyStatus(statusString: string | undefined): PolicyStatus {
  switch (statusString?.toLowerCase()) {
    case 'enabled':
      return 'Enabled';
    case 'disabled':
      return 'Disabled';
    case 'draft':
      return 'Draft';
    default:
      return 'Disabled';
  }
}
