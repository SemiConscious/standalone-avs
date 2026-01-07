/**
 * Data transformation utilities for the policy editor.
 * Ported from natterbox-routing-policies/src/services/buildChartWithLegacyData.service.js
 * 
 * This module transforms legacy Natterbox policy data into the format expected by our editor.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  getNodeClassName, 
  getLegacyNodeClassName, 
  mapTemplateClassToNodeType,
  mapTemplateIdToNodeType,
  NODE_ID 
} from './nodeClassName';
import { getNodeDisplayTitle, getNodeDisplayDescription, decodeHtmlEntities } from './nodeDisplay';

// Constants
export const NODE_VALUES = {
  MAX_SUBITEMS: 5,
  MAX_ROUTER_ROUTES: 25,
};

export const FLOWCHART_STYLE = {
  MarkerEnd: { type: 'arrowclosed' },
};

// Types
export interface LegacyNode {
  id: string;
  x: number;
  y: number;
  templateId?: number;
  templateClass?: string;
  title?: string;
  name?: string;
  description?: string;
  type?: string;
  className?: string;
  inputConnectorsAllowed?: boolean;
  outputConnectorsAllowed?: boolean;
  outputs?: LegacyOutput[];
  subItems?: LegacySubItem[];
  variables?: Record<string, unknown>;
  config?: Record<string, unknown>;
  input?: { id: string };
  output?: { id: string };
  connectedTo?: string;
  connectedFromNode?: string;
  connectedFromItem?: string;
  data?: Record<string, unknown>;
}

export interface LegacyOutput {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  templateId?: number;
  type?: string;
  connectedTo?: string;
  config?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface LegacySubItem {
  id: string;
  name: string;
  templateId?: number;
}

export interface LegacyConnection {
  source: { nodeID: string; id: string };
  dest: { nodeID: string; id: string };
}

export interface LegacyPolicy {
  nodes: LegacyNode[];
  connections: LegacyConnection[];
  navigator?: boolean;
  navigatorPositionIndex?: number;
  connectionType?: string;
  source?: string;
  [key: string]: unknown;
}

export interface TransformedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    title?: string;
    name?: string;
    templateId?: number;
    templateClass?: string;
    outputs?: TransformedOutput[];
    subItems?: TransformedSubItem[];
    variables?: Record<string, unknown>;
    config?: Record<string, unknown>;
    connectedTo?: string;
    connectedFromNode?: string;
    connectedFromItem?: string;
    [key: string]: unknown;
  };
  width?: number;
  height?: number;
  parentNode?: string;
  extent?: string;
  className?: string;
  draggable?: boolean;
  selectable?: boolean;
  sourcePosition?: string;
  targetPosition?: string;
  style?: Record<string, unknown>;
}

export interface TransformedOutput {
  id: string;
  type: string;
  parentNode: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    title?: string;
    name?: string;
    connectedTo?: string;
    [key: string]: unknown;
  };
  extent?: string;
  selectable?: boolean;
  draggable?: boolean;
  templateId?: number;
  className?: string;
  style?: Record<string, unknown>;
}

export interface TransformedSubItem {
  id: string;
  type: string;
  parentNode: string;
  position: { x: number; y: number };
  data: {
    name: string;
    [key: string]: unknown;
  };
  extent?: string;
  selectable?: boolean;
  draggable?: boolean;
  connectable?: boolean;
  templateId?: number;
  className?: string;
  style?: Record<string, unknown>;
}

export interface TransformedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  markerEnd?: { type: string };
}

export interface TransformedPolicy {
  nodes: TransformedNode[];
  edges: TransformedEdge[];
  navigator?: boolean;
  navigatorPositionIndex?: number;
  viewport?: { x: number; y: number; zoom: number };
  [key: string]: unknown;
}

/**
 * Check if a policy is a system policy
 */
export function isSystemPolicySource(policy: LegacyPolicy): boolean {
  return policy?.source === 'system';
}

/**
 * Calculate node height based on the number of outputs
 */
export function calculateNodeHeightBasedOnOutputs(outputs: TransformedOutput[]): number {
  if (!outputs || outputs.length === 0) return 63;
  return 33 * outputs.length + 63;
}

/**
 * Get the next Y position for an output based on existing outputs
 */
export function getNextYPositionFromOutputs(outputs: TransformedOutput[]): number {
  if (!outputs || outputs.length === 0) return 33;
  return (outputs.length + 1) * 33;
}

/**
 * Build sub-items for a node
 */
export function buildNodeSubItems(node: LegacyNode): TransformedSubItem[] {
  if (!Array.isArray(node.subItems) || node.subItems.length === 0) {
    return [];
  }
  
  const maxSubItems = NODE_VALUES.MAX_SUBITEMS;
  const totalSubItems = node.subItems.length;
  
  return node.subItems.slice(0, maxSubItems).map((subItem, index) => {
    const name = decodeHtmlEntities(subItem.name);
    const isLastAndTruncated = totalSubItems > maxSubItems && index === maxSubItems - 1;
    const displayName = isLastAndTruncated 
      ? `...${totalSubItems - maxSubItems + 1} more`
      : name;
    
    return {
      id: subItem.id,
      parentNode: node.id,
      extent: 'parent',
      templateId: subItem.templateId,
      selectable: false,
      draggable: false,
      connectable: false,
      type: 'output',
      className: 'custom-node container__subItem',
      position: {
        x: 0,
        y: (index + 1) * 33,
      },
      style: {
        width: 200,
        height: 30,
        padding: '8px',
        display: 'flex',
        borderColor: 'transparent',
      },
      data: {
        ...subItem,
        name: displayName,
      },
    };
  });
}

/**
 * Build outputs for a node
 */
export function buildNodeOutputs(node: LegacyNode, nextYPos?: number): TransformedOutput[] {
  if (!Array.isArray(node.outputs) || node.outputs.length === 0) {
    return [];
  }
  
  const outputs: TransformedOutput[] = [];
  
  for (const output of node.outputs) {
    // If it's a group type node, add directly
    if (output.type === 'group') {
      outputs.push(output as unknown as TransformedOutput);
      continue;
    }
    
    // Handle Connect a Call special case
    let updatedOutput = { ...output };
    if (output.templateId === 118 && output.title === 'Connect a Call' && !output.id) {
      updatedOutput.data = { ...updatedOutput.data, ...output };
    }
    
    const outputId = output.id || uuidv4();
    const yPosition = typeof nextYPos === 'number' 
      ? nextYPos 
      : getNextYPositionFromOutputs(outputs);
    
    const transformedOutput: TransformedOutput = {
      ...updatedOutput,
      id: outputId,
      type: 'output',
      parentNode: node.id || (node.data as { id?: string })?.id || '',
      extent: 'parent',
      selectable: false,
      draggable: true,
      templateId: output.templateId,
      position: {
        x: 0,
        y: yPosition,
      },
      style: {
        height: 30,
        padding: '8px',
        display: 'flex',
        borderColor: 'transparent',
      },
      className: 'container__subItem-event-output custom-node',
      data: {
        ...output,
        ...output.data,
        label: output.title || output.name || 'Output',
        description: output.description,
        connectedTo: output.connectedTo ?? output.data?.connectedTo ?? 'finish',
      },
    };
    
    // Remove top-level connectedTo to avoid redundancy
    delete (transformedOutput as { connectedTo?: string }).connectedTo;
    
    outputs.push(transformedOutput);
  }
  
  return outputs;
}

/**
 * Get the node type based on templateClass and title
 */
export function getNodeType(node: LegacyNode): string {
  // First try templateClass mapping
  if (node.templateClass) {
    const mappedType = mapTemplateClassToNodeType(node.templateClass);
    // Return the mapped type (including 'default' for ModAction)
    return mappedType;
  }
  
  // Then try templateId mapping
  if (node.templateId !== undefined) {
    const mappedType = mapTemplateIdToNodeType(node.templateId);
    if (mappedType !== 'default') {
      return mappedType;
    }
  }
  
  // Default based on connector allowances
  if (node.outputConnectorsAllowed && node.inputConnectorsAllowed) {
    return 'default';
  } else if (node.templateId === NODE_ID.FINISH || node.templateId === NODE_ID.TO_POLICY || node.templateId === NODE_ID.FINISH_ANALYTICS) {
    return 'end';
  } else if (node.outputConnectorsAllowed && !node.inputConnectorsAllowed) {
    return 'input';
  } else {
    return 'default';
  }
}

/**
 * Get the label for a node based on its data
 */
export function getNodeLabel(node: LegacyNode): string {
  // Check various possible label sources
  const title = node.title || node.name;
  const dataTitle = node.data?.title || node.data?.name;
  
  // Use the display title function for proper overrides
  const displayNode = {
    title: title as string | undefined,
    name: node.name,
    data: {
      title: dataTitle as string | undefined,
      name: node.data?.name as string | undefined,
    },
  };
  
  return getNodeDisplayTitle(displayNode);
}

/**
 * Transform a single legacy node to our format
 */
export function transformNode(node: LegacyNode): TransformedNode {
  const nodeType = getNodeType(node);
  const label = getNodeLabel(node);
  const description = getNodeDisplayDescription({
    title: node.title || node.name,
    data: { description: node.description },
  });
  
  // Calculate height based on subitems/outputs
  let height = 60;
  if (node.subItems && node.subItems.length > 0) {
    const subItemCount = Math.min(NODE_VALUES.MAX_SUBITEMS, node.subItems.length);
    height = 33 * subItemCount + 63;
  } else if (node.outputs && node.outputs.length > 0) {
    height = calculateNodeHeightBasedOnOutputs(node.outputs as unknown as TransformedOutput[]);
  } else if ((node.variables && (node.variables as { internalExtension?: string }).internalExtension) || node.title === 'Event') {
    height = 96;
  }
  
  // Build outputs and subitems
  const transformedOutputs = buildNodeOutputs(node);
  const transformedSubItems = buildNodeSubItems(node);
  
  return {
    id: node.id,
    type: nodeType,
    position: {
      x: Math.max(30, node.x || 0),
      y: Math.max(30, node.y || 0),
    },
    width: 150,
    height,
    className: getNodeClassName({ templateId: node.templateId, type: nodeType }),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: {
      label,
      description,
      title: node.title,
      name: node.name,
      templateId: node.templateId,
      templateClass: node.templateClass,
      outputs: transformedOutputs.length > 0 ? transformedOutputs : undefined,
      subItems: transformedSubItems.length > 0 ? transformedSubItems : undefined,
      variables: node.variables,
      config: node.config,
      connectedTo: node.connectedTo,
      connectedFromNode: node.connectedFromNode,
      connectedFromItem: node.connectedFromItem,
      ...node.data,
    },
  };
}

/**
 * Transform legacy connections to edges
 */
export function transformConnections(
  connections: LegacyConnection[],
  nodes: TransformedNode[],
  finishId?: string,
  finishInputId?: string
): TransformedEdge[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const outputIds = new Set<string>();
  
  // Collect all output IDs
  for (const node of nodes) {
    if (node.data.outputs) {
      for (const output of node.data.outputs) {
        outputIds.add(output.id);
      }
    }
  }
  
  const edges: TransformedEdge[] = [];
  
  for (const connection of connections) {
    const targetId = connection.dest.id === finishInputId 
      ? finishId 
      : connection.dest.nodeID;
    
    // Check if source is from an output
    const isSourceOutput = outputIds.has(connection.source.id);
    const sourceId = isSourceOutput 
      ? connection.source.id 
      : connection.source.nodeID;
    
    if (!targetId || !sourceId) continue;
    
    edges.push({
      id: `edge-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      sourceHandle: connection.source.id,
      targetHandle: connection.dest.id,
      markerEnd: FLOWCHART_STYLE.MarkerEnd,
      type: 'default',
    });
  }
  
  // Deduplicate edges
  const uniqueEdges = edges.filter((edge, index, self) =>
    index === self.findIndex(e => e.source === edge.source && e.target === edge.target)
  );
  
  return uniqueEdges;
}

/**
 * Main function to transform a legacy policy to our format
 */
export function transformLegacyPolicy(policy: LegacyPolicy, isNewPolicy = false): TransformedPolicy {
  // Init node for the canvas
  const initNode: TransformedNode = {
    id: 'init_node',
    type: 'init',
    position: { x: 30, y: 30 },
    data: {
      label: 'Click here to START',
      name: 'Click here to START',
      description: 'init node',
    },
    draggable: false,
    selectable: false,
  };
  
  // New policy returns just the init node
  if (isNewPolicy || !policy || !policy.nodes) {
    return {
      nodes: [initNode],
      edges: [],
      navigator: true,
      navigatorPositionIndex: 5,
    };
  }
  
  const transformedNodes: TransformedNode[] = [];
  const allChildNodes: TransformedNode[] = [];
  let finishId = '';
  let finishInputId = '';
  
  // Check for existing From Policy node
  const hasFromPolicy = policy.nodes.some(n => n.templateId === NODE_ID.FROM_POLICY);
  const isSystemPolicy = isSystemPolicySource(policy);
  
  // Transform each node
  for (const node of policy.nodes) {
    // Track finish node
    if (node.templateId === NODE_ID.FINISH || node.templateId === NODE_ID.TO_POLICY || node.templateId === NODE_ID.FINISH_ANALYTICS) {
      finishId = node.id;
      finishInputId = node.input?.id || '';
    }
    
    const transformed = transformNode(node);
    transformedNodes.push(transformed);
    
    // Add subitems as child nodes
    if (transformed.data.subItems) {
      allChildNodes.push(...(transformed.data.subItems as unknown as TransformedNode[]));
    }
    
    // Add outputs as child nodes
    if (transformed.data.outputs) {
      allChildNodes.push(...(transformed.data.outputs as unknown as TransformedNode[]));
    }
    
    // Handle internal extension nodes
    if ((node.variables && (node.variables as { internalExtension?: string }).internalExtension) || node.title === 'Event') {
      const internalExtNode: TransformedNode = {
        id: uuidv4(),
        type: 'output',
        parentNode: node.id,
        extent: 'parent',
        selectable: false,
        draggable: false,
        position: { x: 0, y: 33 },
        className: 'custom-node container__subItem',
        data: {
          label: String((node.variables as { internalExtension?: string })?.internalExtension ?? node.config?.component?.label ?? ''),
          name: String((node.variables as { internalExtension?: string })?.internalExtension ?? node.config?.component?.label ?? ''),
          variables: node.variables,
        },
        style: {
          width: 200,
          height: 30,
          padding: '8px',
          display: 'flex',
          borderColor: 'transparent',
        },
      };
      allChildNodes.push(internalExtNode);
    }
  }
  
  // Transform connections to edges
  const edges = transformConnections(policy.connections || [], transformedNodes, finishId, finishInputId);
  
  // Update connectedFromNode/connectedFromItem on nodes based on connections
  for (const connection of (policy.connections || [])) {
    const destNodeIndex = transformedNodes.findIndex(n => n.id === connection.dest.nodeID);
    const sourceNodeIndex = transformedNodes.findIndex(n => n.id === connection.source.nodeID);
    
    if (destNodeIndex === -1 || sourceNodeIndex === -1) continue;
    
    const sourceNode = transformedNodes[sourceNodeIndex];
    const destNode = transformedNodes[destNodeIndex];
    
    if (!sourceNode.data.connectedTo) {
      transformedNodes[sourceNodeIndex].data.connectedTo = destNode.id;
    }
    
    if (sourceNode.type === 'output') {
      transformedNodes[destNodeIndex].data.connectedFromNode = sourceNode.parentNode;
      transformedNodes[destNodeIndex].data.connectedFromItem = sourceNode.id;
    } else {
      transformedNodes[destNodeIndex].data.connectedFromNode = sourceNode.id;
      transformedNodes[destNodeIndex].data.connectedFromItem = sourceNode.data.output?.id || sourceNode.id;
    }
  }
  
  // Apply legacy class names
  const nodesWithClassNames = transformedNodes.map(node => ({
    ...node,
    className: getLegacyNodeClassName(node as unknown as Parameters<typeof getLegacyNodeClassName>[0]),
  }));
  
  // Combine all nodes
  const allNodes = [initNode, ...nodesWithClassNames, ...allChildNodes];
  
  // Deduplicate nodes by ID
  const uniqueNodes = allNodes.filter((node, index, self) =>
    index === self.findIndex(n => n.id === node.id)
  );
  
  return {
    ...policy,
    nodes: uniqueNodes,
    edges,
    navigator: policy.navigator ?? true,
    navigatorPositionIndex: policy.navigatorPositionIndex ?? 5,
  };
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return uuidv4();
}

