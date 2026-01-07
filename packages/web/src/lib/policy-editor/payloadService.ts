/**
 * Payload Service for the policy editor.
 * Ported from natterbox-routing-policies/src/services/payload.service.js
 * 
 * This module provides utilities for building save payloads by transforming
 * the editor format back to the legacy Natterbox format.
 */

import { v4 as uuidv4 } from 'uuid';
import { cloneDeep, omit, isNull } from 'lodash-es';
import { NODE_ID } from './nodeClassName';

// Constants for omitting fields when building payloads
export const OMIT_FIELDS = {
  CONNECT_AND_SCREEN_IDS: [
    'screenId',
    'connectId',
    'screenParentId',
    'connectParentId',
  ],
  LIBRARY: [
    'position',
    'sourcePosition',
    'targetPosition',
    'className',
    'style',
    'label',
    'draggable',
    'dragging',
    'extent',
    'selectable',
    'selected',
    'measured',
  ],
};

// Types
export interface PayloadNode {
  id: string;
  templateId?: number;
  parentId?: string;
  parentNode?: string;
  type?: string;
  x?: number;
  y?: number;
  position?: { x: number; y: number };
  data?: {
    type?: string;
    name?: string;
    templateClass?: string;
    outputs?: PayloadOutput[];
    subItems?: PayloadSubItem[];
    connectedTo?: string;
    connectedFromItem?: string;
    connectedFromNode?: string;
    output?: { id: string };
    input?: { id: string };
    [key: string]: unknown;
  };
  outputs?: PayloadOutput[];
  subItems?: PayloadSubItem[];
  title?: string;
  name?: string;
  variables?: Record<string, unknown>;
  config?: {
    devOrgId?: string | null;
    connectorId?: string | null;
    screenHook?: string | null;
    [key: string]: unknown;
  };
  output?: { id: string };
  headOfGroup?: boolean;
  [key: string]: unknown;
}

export interface PayloadOutput {
  id: string;
  type?: string;
  title?: string;
  name?: string;
  parentId?: string;
  parentNode?: string;
  connectedTo?: string;
  config?: {
    devOrgId?: string | null;
    connectorId?: string | null;
    [key: string]: unknown;
  };
  variables?: {
    script?: string;
    [key: string]: unknown;
  };
  data?: {
    name?: string;
    connectedTo?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PayloadSubItem {
  id: string;
  templateId?: number;
  parentNode?: string;
  variables?: {
    publicNumber?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PayloadEdge {
  id: string;
  source: string;
  target: string;
}

export interface PayloadConnection {
  source: {
    nodeID: string;
    id: string;
  };
  dest: {
    nodeID: string;
    id: string;
  };
}

export interface SalesforceConfig {
  Id?: string;
  DevOrgId__c?: string;
  ConnectorId__c?: string;
  NotifyEmailAddress__c?: string;
}

export interface LicenseData {
  [key: string]: unknown;
}

// Node IDs that are accepted in the payload
const ACCEPTED_PAYLOAD_APP_IDS = [
  NODE_ID.ACTION,
  NODE_ID.FINISH,
  NODE_ID.TO_POLICY,
  NODE_ID.DA_ACTION,
  NODE_ID.SWITCH_BOARD,
  NODE_ID.FROM_SIP_TRUNK,
  NODE_ID.INBOUND_NUMBER,
  NODE_ID.INBOUND_MESSAGE,
  NODE_ID.EXTENSION_NUMBER,
  NODE_ID.INVOKABLE_DESTINATION,
  NODE_ID.DIGITAL_CONNECT,
  NODE_ID.DIGITAL_ACTION,
  NODE_ID.DATA_ANALYTICS_FINISH,
  NODE_ID.OMNI_CHANNEL_FLOW,
  NODE_ID.NATTERBOX_AI,
  NODE_ID.CALL_NATTERBOX_AI,
  NODE_ID.ANALYTICS_NATTERBOX_AI,
  NODE_ID.AI_TEST_NODE,
  NODE_ID.AI_SUPPORT_CHAT,
];

/**
 * Process a single item, handling special templateId cases
 */
function processItem<T extends { templateId?: number; variables?: { nextId?: string; [key: string]: unknown } }>(item: T): T {
  const result = cloneDeep(item);

  // For templateId 124, omit variables.nextId
  if (item.templateId === 124) {
    return omit(result, 'variables.nextId') as T;
  }

  return result;
}

/**
 * Process a payload item, handling special cases
 */
function processPayloadItem<T extends { templateId?: number; subItems?: Array<{ parentNode?: string; [key: string]: unknown }>; [key: string]: unknown }>(
  item: T,
  nextId?: string
): T {
  // Digital Connect (140) and templateId 1 don't need processing
  if (!nextId || [NODE_ID.DIGITAL_CONNECT, 1].includes(item.templateId ?? 0)) {
    if (!Array.isArray(item?.subItems)) {
      return item;
    }
    const updatedSubItems = item.subItems.map((subItem) =>
      omit(subItem, 'parentNode')
    );
    return { ...item, subItems: updatedSubItems };
  }

  return processItem(item);
}

/**
 * Process multiple payload items
 */
export function processPayloadItems<T extends { id?: string; templateId?: number; subItems?: Array<{ parentNode?: string }>; [key: string]: unknown }>(
  items: T[]
): T[] {
  return cloneDeep(items).map((item, index) => {
    const nextId = items[index + 1]?.id;
    return processPayloadItem(item, nextId);
  });
}

/**
 * Filter nodes to only include those valid for the payload
 */
export function filterPayloadNodes(nodes: PayloadNode[]): PayloadNode[] {
  return nodes.filter((node) => {
    const isSystemType = node?.data?.type === 'SYSTEM';
    const isAcceptedApp = ACCEPTED_PAYLOAD_APP_IDS.includes(node.templateId ?? 0);

    return isSystemType || isAcceptedApp;
  });
}

/**
 * Update output config with Salesforce config if values are null
 */
export function updateOutputConfigIfExists(
  outputConfig: { devOrgId?: string | null; connectorId?: string | null } | undefined,
  config: SalesforceConfig
): void {
  if (!outputConfig) return;
  
  if (isNull(outputConfig?.devOrgId) || isNull(outputConfig?.connectorId)) {
    outputConfig.devOrgId = config.DevOrgId__c;
    outputConfig.connectorId = config.ConnectorId__c;
  }
}

/**
 * Update output variables with generated script if applicable
 * Note: generateScriptByConfigCustom is not ported yet - this is a placeholder
 */
export function updateOutputVariablesIfExists(
  output: PayloadOutput,
  skipDisplayErrors?: boolean,
  licenseData?: LicenseData
): void {
  const excludedAppsForScriptUpdate = ['Rule'];

  if (
    output?.variables?.hasOwnProperty('script') &&
    !excludedAppsForScriptUpdate.includes(output.title ?? '')
  ) {
    // TODO: generateScriptByConfigCustom is complex and may need separate porting
    // For now, keep existing script
    // output.variables.script = generateScriptByConfigCustom(output, { licenseData, skipDisplayErrors });
  }
}

/**
 * Ensure inbound number items have templateId 3 and no parentNode
 */
export function ensureInboundNumberItemsTemplateId(
  items: PayloadSubItem[]
): PayloadSubItem[] {
  return items.map((subItem) => {
    const updated = { ...subItem, templateId: 3 };
    return omit(updated, 'parentNode') as PayloadSubItem;
  });
}

/**
 * Omit connect and screen IDs from a node, unless it's a special title
 */
export function omitConnectAndScreenIds<T extends { title?: string; label?: string }>(node: T): T {
  let result = omit(node, 'label') as T;
  
  // Keep fields for these specific titles
  if (['Hunt Group', 'Connect a Call', 'Call Queue'].includes(node.title ?? '')) {
    return result;
  }

  return omit(result, OMIT_FIELDS.CONNECT_AND_SCREEN_IDS) as T;
}

/**
 * Omit library-specific fields from an output
 */
export function omitOutputLibraryFields<T>(output: T): T {
  return omit(output, OMIT_FIELDS.LIBRARY) as T;
}

/**
 * Map nodes to a valid payload format for saving
 */
export function mapNodesToPayloadFormat({
  nodes,
  config,
  policyType,
  licenseData = {},
  skipDisplayErrors,
}: {
  nodes: PayloadNode[];
  config: SalesforceConfig;
  policyType: string;
  licenseData?: LicenseData;
  skipDisplayErrors?: boolean;
}): PayloadNode[] {
  return nodes.reduce<PayloadNode[]>((acc, node) => {
    const { data, templateId, id, position } = node;

    const isInboundNumberWithoutTemplateClass =
      templateId === NODE_ID.INBOUND_NUMBER && !data?.templateClass;

    // Exclude Inbound Number nodes without templateClass from the payload
    if (!isInboundNumberWithoutTemplateClass) {
      let updatedNode: PayloadNode = {
        ...data,
        templateId,
        id: id || null,
        parentId: node?.parentId ?? uuidv4(),
        ...(position ?? {}),
      };

      updatedNode = omitConnectAndScreenIds(updatedNode);

      if (Array.isArray(updatedNode?.outputs)) {
        updatedNode.outputs = updatedNode.outputs.map((output) => {
          if (output.type === 'group') {
            return output;
          }

          output.type = policyType;

          let processedOutput = omitConnectAndScreenIds(output);
          processedOutput = omitOutputLibraryFields(processedOutput);
          
          if (processedOutput?.data?.name) {
            processedOutput.name = processedOutput.data.name;
          }

          if (!processedOutput.connectedTo && processedOutput?.data?.connectedTo) {
            processedOutput.connectedTo = processedOutput.data.connectedTo;
            processedOutput = omit(processedOutput, 'output') as PayloadOutput;
          }

          processedOutput = omit(processedOutput, 'data') as PayloadOutput;

          updateOutputConfigIfExists(processedOutput?.config, config);
          updateOutputVariablesIfExists(processedOutput, skipDisplayErrors, licenseData);

          return processedOutput;
        });
      }

      if (templateId === NODE_ID.INBOUND_NUMBER && updatedNode.subItems) {
        updatedNode.subItems = ensureInboundNumberItemsTemplateId(updatedNode.subItems);
      }

      acc.push(updatedNode);
    }

    return acc;
  }, []);
}

/**
 * Map React Flow edges to legacy connections format.
 * 
 * Angular version:
 * - For connections starting from a subNode (a node with a parentNode):
 *   - The `source` property will contain:
 *     - `nodeId`: set to the parentNode (`parentId`).
 *     - `id`: set to the actual subNode's id.
 * - For nodes without a parentNode (root nodes):
 *   - The `source` property will contain:
 *     - `nodeId`: set to the node's own id.
 *     - `id`: set to the output's id.
 */
export function mapEdgesToConnections(
  edges: PayloadEdge[],
  nodes: PayloadNode[]
): PayloadConnection[] {
  return edges.reduce<PayloadConnection[]>((connections, edge) => {
    const sourceNode = nodes?.find((n) => n.id === edge.source);
    const destNode = nodes?.find((n) => n.id === edge.target);
    
    if (sourceNode && destNode) {
      let resolvedSourceNodeID = sourceNode.parentNode;
      const parentNode = nodes.find(({ id }) => id === sourceNode.parentNode);

      // If the source node is within a group, use the node ID of its parent container
      if (parentNode?.type === 'group') {
        resolvedSourceNodeID = parentNode.parentNode;
      }

      connections.push({
        source: {
          nodeID: resolvedSourceNodeID ? resolvedSourceNodeID : edge.source,
          id: sourceNode.parentNode ? edge.source : (sourceNode.data?.output?.id ?? edge.source),
        },
        dest: {
          nodeID: edge.target,
          id: destNode.data?.input?.id ?? edge.target,
        },
      });
    }

    return connections;
  }, []);
}

// Export as a service object for consistency with React app
export const PayloadService = {
  filterPayloadNodes,
  processPayloadItems,
  mapNodesToPayloadFormat,
  omitOutputLibraryFields,
  omitConnectAndScreenIds,
  updateOutputConfigIfExists,
  updateOutputVariablesIfExists,
  ensureInboundNumberItemsTemplateId,
  mapEdgesToConnections,
};

