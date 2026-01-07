/**
 * Centralized Type Definitions for Policy Editor
 * 
 * This file contains all shared types and interfaces used across the policy editor.
 * Import types from here instead of defining them inline.
 */

// =============================================================================
// Constants
// =============================================================================

export const POLICY_TYPE = {
  CALL: 'call',
  DIGITAL: 'digital',
  OUTBOUND: 'outbound',
} as const;

export type PolicyType = typeof POLICY_TYPE[keyof typeof POLICY_TYPE];

export const NODE_TYPE = {
  // Container nodes (burgers)
  ACTION: 'action',
  SWITCHBOARD: 'switchboard',
  INBOUND_NUMBER: 'inboundNumber',
  EXTENSION_NUMBER: 'extensionNumber',
  SIP_TRUNK: 'sipTrunk',
  INBOUND_MESSAGE: 'inboundMessage',
  INVOKABLE_DESTINATION: 'invokableDestination',
  FROM_POLICY: 'fromPolicy',
  TO_POLICY: 'toPolicy',
  FINISH: 'finish',
  OMNI_CHANNEL_FLOW: 'omniChannelFlow',
  NATTERBOX_AI: 'natterboxAI',
  
  // Child app nodes
  SPEAK: 'speak',
  CALL_QUEUE: 'callQueue',
  HUNT_GROUP: 'huntGroup',
  RULE: 'rule',
  CONNECT_CALL: 'connectCall',
  RECORD_CALL: 'recordCall',
  NOTIFY: 'notify',
  SWITCH: 'switch',
  SWITCH_ITEM: 'switchItem',
  QUERY_OBJECT: 'queryObject',
  CREATE_RECORD: 'createRecord',
  MANAGE_PROPERTIES: 'manageProperties',
  GET_INFO: 'getInfo',
  VOICEMAIL: 'voicemail',
  REQUEST_SKILL: 'requestSkill',
  SEND_MESSAGE: 'sendMessage',
  SEND_TEMPLATE: 'sendTemplate',
  DEBUG: 'debug',
  RETRY: 'retry',
  AI_AGENT: 'aiAgent',
  AI_INSTRUCTION: 'aiInstruction',
  AI_KNOWLEDGE: 'aiKnowledge',
  OMNI_CHANNEL_ROUTE: 'omniChannelRoute',
  
  // System nodes
  INIT: 'init',
  INPUT: 'input',
  OUTPUT: 'output',
  DEFAULT: 'default',
  GROUP: 'group',
} as const;

export type NodeType = typeof NODE_TYPE[keyof typeof NODE_TYPE];

// =============================================================================
// Node Configuration
// =============================================================================

/**
 * Configuration for node display
 */
export interface NodeDisplayConfig {
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: 'container' | 'action' | 'routing' | 'data' | 'communication' | 'ai' | 'system';
}

/**
 * Base node data structure (shared fields)
 */
export interface BaseNodeData {
  id: string;
  label?: string;
  description?: string;
  type: string;
  nodeType?: string;
  connectedTo?: string | null;
  connectedToItem?: string | null;
  connectedFromNode?: string | null;
  connectedFromItem?: string | null;
}

/**
 * Node position in the canvas
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Base node structure
 */
export interface BaseNode {
  id: string;
  type: string;
  position: NodePosition;
  data: BaseNodeData;
  draggable?: boolean;
  selectable?: boolean;
  deletable?: boolean;
}

// =============================================================================
// Output/SubItem Types
// =============================================================================

/**
 * Output handle for a node
 */
export interface NodeOutput {
  id: string;
  label?: string;
  type?: string;
  parentNode?: string;
  position?: NodePosition;
  data?: Record<string, unknown>;
  connectedTo?: string | null;
  connectedToItem?: string | null;
  connectedFromNode?: string | null;
  connectedFromItem?: string | null;
}

/**
 * Sub-item within a container node
 */
export interface NodeSubItem {
  id: string;
  type: string;
  label?: string;
  description?: string;
  parentNode?: string;
  order?: number;
  config?: Record<string, unknown>;
}

// =============================================================================
// Edge Types
// =============================================================================

/**
 * Edge connecting two nodes
 */
export interface PolicyEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, string | number>;
}

// =============================================================================
// Policy Types
// =============================================================================

/**
 * Full policy node with all data
 */
export interface PolicyNode extends BaseNode {
  data: PolicyNodeData;
  measured?: {
    width?: number;
    height?: number;
  };
}

/**
 * Policy node data
 */
export interface PolicyNodeData extends BaseNodeData {
  outputs?: NodeOutput[];
  subItems?: NodeSubItem[];
  config?: Record<string, unknown>;
  isContainer?: boolean;
  isSystemNode?: boolean;
  
  // Container-specific fields
  interactive?: boolean;
  terminating?: boolean;
  
  // Salesforce fields
  sfId?: string;
  templateId?: string;
}

/**
 * Complete policy structure
 */
export interface Policy {
  id: string;
  name: string;
  description?: string;
  type: PolicyType;
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  config?: PolicyConfig;
}

/**
 * Policy configuration settings
 */
export interface PolicyConfig {
  avsNamespace?: string;
  sessionId?: string;
  organizationId?: string;
  userId?: string;
  instanceUrl?: string;
}

// =============================================================================
// Legacy Types (for data transformation)
// =============================================================================

/**
 * Legacy node format from Salesforce
 */
export interface LegacyNode {
  Id: string;
  nbavs__Template__c?: string;
  Name?: string;
  nbavs__Description__c?: string;
  nbavs__Type__c?: string;
  nbavs__Position_X__c?: number;
  nbavs__Position_Y__c?: number;
  nbavs__Is_Start__c?: boolean;
  nbavs__Params__c?: string;
  nbavs__Connected_To__c?: string;
  nbavs__Connected_To_Item__c?: string;
  nbavs__Children__r?: LegacyNode[];
  [key: string]: unknown;
}

/**
 * Legacy connection format
 */
export interface LegacyConnection {
  id: string;
  fromNode: string;
  fromItem?: string;
  toNode: string;
  toItem?: string;
}

/**
 * Legacy policy format from Salesforce
 */
export interface LegacyPolicy {
  Id: string;
  Name: string;
  nbavs__Description__c?: string;
  nbavs__Type__c?: string;
  nbavs__Body__r?: {
    records: LegacyNode[];
  };
  [key: string]: unknown;
}

// =============================================================================
// Payload Types (for saving)
// =============================================================================

/**
 * Node format for save payload
 */
export interface PayloadNode {
  id: string;
  type: string;
  name?: string;
  description?: string;
  positionX: number;
  positionY: number;
  isStart: boolean;
  params?: string;
  connectedTo?: string;
  connectedToItem?: string;
  templateId?: string;
  sfId?: string;
  outputs?: PayloadOutput[];
}

/**
 * Output format for save payload
 */
export interface PayloadOutput {
  id: string;
  type: string;
  label?: string;
  parentNode: string;
  order?: number;
  params?: string;
  connectedTo?: string;
  connectedToItem?: string;
  sfId?: string;
}

/**
 * Connection format for save payload
 */
export interface PayloadConnection {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

/**
 * Complete save payload
 */
export interface SavePayload {
  policy: {
    id: string;
    name: string;
    description?: string;
    type: PolicyType;
  };
  nodes: PayloadNode[];
  connections: PayloadConnection[];
  deletedNodeIds: string[];
  deletedOutputIds: string[];
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Salesforce configuration
 */
export interface SalesforceConfig {
  avsNamespace: string;
  sessionId: string;
  organizationId: string;
  userId: string;
  instanceUrl: string;
}

/**
 * License data for the organization
 */
export interface LicenseData {
  hasAILicense?: boolean;
  hasSCVLicense?: boolean;
  hasMessagingLicense?: boolean;
  hasWhatsAppLicense?: boolean;
  hasRecordingLicense?: boolean;
  hasPCILicense?: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

/**
 * Node selection event
 */
export interface NodeSelectionEvent {
  nodeId: string;
  node?: PolicyNode;
  shiftKey?: boolean;
  ctrlKey?: boolean;
}

/**
 * Node double-click event
 */
export interface NodeDoubleClickEvent {
  nodeId: string;
  node: PolicyNode;
  childId?: string;
  childData?: NodeOutput | NodeSubItem;
}

/**
 * Edge connection event
 */
export interface EdgeConnectionEvent {
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

/**
 * Node drop event
 */
export interface NodeDropEvent {
  type: string;
  position: NodePosition;
  targetNodeId?: string;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Partial update for a node
 */
export type NodeUpdate = Partial<PolicyNodeData> & { id: string };

/**
 * Result of node removal operation
 */
export interface RemoveNodesResult {
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  deletedNodeIds: string[];
  deletedOutputIds: string[];
}

/**
 * Clone operation configuration
 */
export interface CloneConfig {
  sourcePolicyId: string;
  targetName: string;
  targetDescription?: string;
  includeConnections: boolean;
}

