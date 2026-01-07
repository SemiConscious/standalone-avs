/**
 * Node Manager Service for the policy editor.
 * Ported from natterbox-routing-policies/src/services/nodeManager.service.js
 * 
 * This module provides utilities for managing nodes in the policy editor:
 * - Adding/removing nodes
 * - Managing edges
 * - Updating node positions
 */

import { v4 as uuidv4 } from 'uuid';
import { cloneDeep, isFunction, set } from 'lodash-es';
import { NODE_ID } from './nodeClassName';

// Types
export interface PolicyNode {
  id: string;
  type?: string;
  parentNode?: string;
  headOfGroup?: boolean;
  templateId?: number | string;
  position?: { x: number; y: number };
  height?: number;
  style?: { height?: number; [key: string]: unknown };
  data: {
    type?: string;
    id?: string;
    connectedTo?: string;
    connectedFromItem?: string | null;
    connectedFromNode?: string | null;
    outputs?: PolicyOutput[];
    output?: { id: string };
    input?: { id: string };
    [key: string]: unknown;
  };
  output?: { id: string };
  [key: string]: unknown;
}

export interface PolicyOutput {
  id: string;
  parentNode?: string;
  parentId?: string;
  type?: string;
  headOfGroup?: boolean;
  connectedTo?: string;
  position?: { x: number; y: number };
  style?: { height?: number; [key: string]: unknown };
  data?: {
    connectedTo?: string;
    outputs?: PolicyOutput[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PolicyEdge {
  id: string;
  source: string;
  target: string;
}

export interface PolicyData {
  nodes: PolicyNode[];
  edges: PolicyEdge[];
  [key: string]: unknown;
}

export interface RemoveNodesResult {
  updatedPolicy: PolicyData;
  newActiveNode: PolicyNode | undefined;
}

// Layout constants
export const NODE_LAYOUT_CONFIG = {
  GAP_BETWEEN_NODES: 33,
  CONTAINER_BASE_HEIGHT: 63,
  OUTPUT_HEIGHT: 33,
};

/**
 * Check if a node type is a group type
 */
export function isNodeTypeGroup(type?: string): boolean {
  return type === 'group';
}

/**
 * Check if a node type is an output type
 */
export function isNodeTypeOutput(type?: string): boolean {
  return type === 'output';
}

/**
 * Find a node by ID
 */
export function findNodeById(nodes: PolicyNode[], id: string): PolicyNode | undefined {
  return nodes.find((node) => node.id === id);
}

/**
 * Find a node index by ID
 */
export function findNodeIndexById(nodes: PolicyNode[], id: string): number {
  return nodes.findIndex((node) => node.id === id);
}

/**
 * Calculate node height based on outputs
 */
export function calculateNodeHeightBasedOnOutputs(
  outputs: PolicyOutput[],
  baseHeight: number = NODE_LAYOUT_CONFIG.CONTAINER_BASE_HEIGHT
): number {
  if (!outputs || outputs.length === 0) return baseHeight;
  return NODE_LAYOUT_CONFIG.OUTPUT_HEIGHT * outputs.length + baseHeight;
}

/**
 * Get the next Y position for placing outputs
 */
export function getNextYPositionFromOutputs(
  outputs: PolicyOutput[],
  parentType?: string
): number {
  if (!outputs || outputs.length === 0) {
    return NODE_LAYOUT_CONFIG.GAP_BETWEEN_NODES;
  }
  return (outputs.length + 1) * NODE_LAYOUT_CONFIG.GAP_BETWEEN_NODES;
}

/**
 * Ensure outputs have correct positions
 */
export function ensureOutputsPositions(outputs: PolicyOutput[]): PolicyOutput[] {
  return outputs.map((output, index) => ({
    ...output,
    position: {
      x: output.position?.x ?? 0,
      y: (index + 1) * NODE_LAYOUT_CONFIG.GAP_BETWEEN_NODES,
    },
  }));
}

/**
 * Determine base height based on node type
 */
export function determineNodeBaseHeightBasedOnType(
  type: string | undefined,
  defaultHeight: number = NODE_LAYOUT_CONFIG.CONTAINER_BASE_HEIGHT
): number {
  // Groups have no header, so base is smaller
  if (isNodeTypeGroup(type)) {
    return 0;
  }
  return defaultHeight;
}

/**
 * Remove connectedFrom fields from nodes after edge removal
 */
function removeNodeConnectedFrom({
  nodes,
  edge,
  edges,
}: {
  nodes: PolicyNode[];
  edge: PolicyEdge;
  edges: PolicyEdge[];
}): PolicyNode[] {
  const sourceIndex = findNodeIndexById(nodes, edge.source);
  const targetIndex = findNodeIndexById(nodes, edge.target);
  const sourceFromItemIndex = nodes.findIndex(
    (node) => node.data.connectedFromItem === edge.source
  );

  if (sourceIndex === -1 || targetIndex === -1) {
    return nodes;
  }

  if (nodes[sourceIndex].data.connectedTo === edge.target) {
    const matchingEdge = edges.find(({ source }) => source === edge.source);
    nodes[sourceIndex].data.connectedTo = matchingEdge?.target ?? 'finish';
  }

  if (sourceFromItemIndex !== -1) {
    const sourceNode = findNodeById(
      nodes,
      nodes[sourceFromItemIndex].data.connectedFromNode ?? ''
    );

    nodes[sourceFromItemIndex].data.connectedFromItem =
      sourceNode?.data?.output?.id || sourceNode?.id || null;
  }

  const targetConnections = edges.filter(
    ({ target, id }) => target === edge.target && edge.id !== id
  );

  if (!targetConnections.length) {
    nodes[targetIndex].data.connectedFromItem = null;
    nodes[targetIndex].data.connectedFromNode = null;
  }

  return nodes;
}

/**
 * Remove an edge and update related nodes
 */
export function removeEdgeAndUpdateNode(
  policy: PolicyData,
  edges: PolicyEdge[],
  edge: PolicyEdge
): { filteredEdges: PolicyEdge[]; filteredNodes: PolicyNode[] } {
  const filteredEdges = edges.filter((rEdge) => rEdge.id !== edge.id);

  const filteredNodes = removeNodeConnectedFrom({
    edge,
    edges: filteredEdges,
    nodes: policy.nodes,
  });

  return {
    filteredEdges,
    filteredNodes,
  };
}

/**
 * Clear edges that reference removed nodes
 */
export function clearEdges(
  edges: PolicyEdge[],
  nodeIdsToRemove: string[]
): { filteredEdges: PolicyEdge[]; sourceNodeIds: string[] } {
  return edges.reduce<{ filteredEdges: PolicyEdge[]; sourceNodeIds: string[] }>(
    (acc, edge) => {
      if (
        !nodeIdsToRemove.includes(edge.source) &&
        !nodeIdsToRemove.includes(edge.target)
      ) {
        acc.filteredEdges.push(edge);
      } else {
        acc.sourceNodeIds.push(edge.source);
      }
      return acc;
    },
    { filteredEdges: [], sourceNodeIds: [] }
  );
}

/**
 * Group output nodes by their parent
 */
export function groupOutputNodesByParent(
  nodes: PolicyNode[],
  sourceNodeIds: string[]
): Record<string, string[]> {
  return sourceNodeIds.reduce<Record<string, string[]>>((acc, nodeId) => {
    const node = findNodeById(nodes, nodeId);

    if (!node || !isNodeTypeOutput(node.type)) return acc;

    const parentNode = node.parentNode;
    if (!parentNode) return acc;

    if (!acc[parentNode]) acc[parentNode] = [];

    acc[parentNode].push(nodeId);
    return acc;
  }, {});
}

/**
 * Reset disconnected output paths to finish
 */
export function resetDisconnectedOutputPaths(
  node: PolicyNode,
  disconnectedOutputIds?: string[]
): void {
  if (!Array.isArray(disconnectedOutputIds)) return;

  node.data.outputs?.forEach((outputNode) => {
    if (!disconnectedOutputIds.includes(outputNode.id)) return;

    const connectedToPath = outputNode.hasOwnProperty('data')
      ? 'data.connectedTo'
      : 'connectedTo';

    set(outputNode, connectedToPath, 'finish');
  });
}

/**
 * Process edges and group outputs for removal
 */
export function processEdgesAndGroupOutputs(
  edges: PolicyEdge[],
  nodes: PolicyNode[],
  nodeIdsToRemove: string[]
): { filteredEdges: PolicyEdge[]; disconnectedOutputNodesByParent: Record<string, string[]> } {
  const { filteredEdges, sourceNodeIds } = clearEdges(edges, nodeIdsToRemove);

  const disconnectedOutputNodesByParent = groupOutputNodesByParent(
    nodes,
    sourceNodeIds
  );

  return {
    filteredEdges,
    disconnectedOutputNodesByParent,
  };
}

/**
 * Remove and update node outputs positions
 */
function removeAndUpdateNodeOutputsPositions(
  nodes: PolicyNode[],
  activeNode: PolicyNode
): [PolicyOutput[], PolicyNode | null] {
  const parentNode = findNodeById(nodes, activeNode.parentNode ?? '');

  if (!parentNode) {
    return [[], null];
  }

  const updatedOutputs = (parentNode.data.outputs || []).reduce<PolicyOutput[]>(
    (acc, rNode) => {
      if (rNode.id === activeNode.id) return acc;

      const updatedY = getNextYPositionFromOutputs(acc, parentNode.type);
      acc.push({ ...rNode, position: { ...rNode.position, x: rNode.position?.x ?? 0, y: updatedY } });

      return acc;
    },
    []
  );

  return [updatedOutputs, parentNode];
}

/**
 * Collect node ID and all child dependencies for removal
 */
function collectNodeIdAndChildDependencies(
  node: PolicyNode,
  parentNode: PolicyNode | null
): string[] {
  const dependencies = [node.id];

  if (node.headOfGroup && parentNode) {
    dependencies.push(parentNode.id);
    const groupOutputs = (parentNode.data.outputs || []).map(({ id }) => id);
    dependencies.push(...groupOutputs);
    return dependencies;
  }

  if (node.type === 'default' && Array.isArray(node.data?.outputs)) {
    return node.data.outputs.reduce<string[]>((acc, output) => {
      if (isNodeTypeGroup(output.type)) {
        const groupOutputs = (output.data?.outputs || []).map(({ id }) => id);
        acc.push(...groupOutputs);
      }
      acc.push(output.id);
      return acc;
    }, dependencies);
  }

  return dependencies;
}

/**
 * Filter target connections
 */
function filterTargetConnections({
  nodes,
  connectedTo,
  activeNodeId,
}: {
  nodes: PolicyNode[];
  connectedTo: string;
  activeNodeId: string;
}): PolicyNode[] {
  return nodes.filter(
    ({ id, data }) => data.connectedTo === connectedTo && id !== activeNodeId
  );
}

/**
 * Update node height based on remaining outputs
 */
function updateNodeHeightBasedOnOutputs(
  node: PolicyNode,
  outputs: PolicyOutput[]
): void {
  node.data.outputs = outputs;

  const baseHeight = determineNodeBaseHeightBasedOnType(
    node.type,
    NODE_LAYOUT_CONFIG.CONTAINER_BASE_HEIGHT
  );

  let updatedHeight = calculateNodeHeightBasedOnOutputs(outputs, baseHeight);

  // Groups need gap adjustment
  if (isNodeTypeGroup(node.type)) {
    updatedHeight -= NODE_LAYOUT_CONFIG.GAP_BETWEEN_NODES;
  }

  node.height = updatedHeight;
  if (!node.style) {
    node.style = {};
  }
  node.style.height = updatedHeight;
}

/**
 * Clear input connection fields if no incoming connections remain
 */
function clearInputConnectionFieldsIfNoIncomingConnections({
  nodes,
  node,
  connectedNodeId,
}: {
  nodes: PolicyNode[];
  node: PolicyNode;
  connectedNodeId: string;
}): void {
  const targetConnections = filterTargetConnections({
    nodes,
    connectedTo: node.id,
    activeNodeId: connectedNodeId,
  });

  if (!targetConnections.length) {
    node.data.connectedFromItem = null;
    node.data.connectedFromNode = null;
  }
}

/**
 * Replace node position from updated outputs
 */
function replaceNodePositionFromOutputs(
  node: PolicyNode,
  outputs: PolicyOutput[],
  parentNode: PolicyNode | null
): PolicyNode {
  const outputNode = outputs.find(({ id }) => id === node.id);
  if (outputNode && outputNode.position) {
    return { ...node, position: outputNode.position };
  }

  // Handle group parent updates
  if (isNodeTypeGroup(parentNode?.type) && parentNode?.parentNode === node.id) {
    const groupIndex = findNodeIndexById(
      node.data.outputs as unknown as PolicyNode[],
      parentNode?.id ?? ''
    );

    // If head of group was removed, remove remaining group items
    if (!outputs[0]?.headOfGroup && groupIndex !== -1 && node.data.outputs) {
      node.data.outputs.splice(groupIndex, 1);
    } else if (groupIndex !== -1 && node.data.outputs) {
      updateNodeHeightBasedOnOutputs(
        node.data.outputs[groupIndex] as unknown as PolicyNode,
        outputs
      );
    }

    node.data.outputs = ensureOutputsPositions(node.data.outputs || []);

    const updatedHeight = calculateNodeHeightBasedOnOutputs(node.data.outputs);

    node.height = updatedHeight;
    if (node.style) {
      node.style.height = updatedHeight;
    }
  }

  return node;
}

/**
 * Filter and recalculate node height after removal
 */
function filterAndRecalculateNodeHeight({
  acc,
  node,
  nodes,
  outputs,
  activeNode,
  nodeIdsToRemove,
  disconnectedOutputNodesByParent,
}: {
  acc: PolicyNode[];
  node: PolicyNode;
  nodes: PolicyNode[];
  outputs: PolicyOutput[];
  activeNode: PolicyNode;
  nodeIdsToRemove: string[];
  disconnectedOutputNodesByParent: Record<string, string[]>;
}): PolicyNode[] {
  if (nodeIdsToRemove.includes(node.id)) return acc;

  if (node.data.connectedTo === activeNode.id) {
    // Update connectedTo with next matching edge or 'finish'
    const nextMatchingEdge = nodes.find(
      ({ data, id }) =>
        data.connectedFromItem === node.id && !nodeIdsToRemove.includes(id)
    );

    node.data.connectedTo = nextMatchingEdge?.id ?? 'finish';
  }

  if (
    node.data.connectedFromNode === activeNode.id ||
    node.id === activeNode.data.connectedTo
  ) {
    let connectedTo = node.data.id ?? node.id;
    
    if (
      node.data.connectedFromItem !== (activeNode.output?.id ?? activeNode.id) &&
      Array.isArray(activeNode?.data?.outputs)
    ) {
      connectedTo = node.data.connectedFromItem ?? connectedTo;
    }

    const targetConnections = filterTargetConnections({
      nodes,
      connectedTo: connectedTo as string,
      activeNodeId: activeNode.id,
    });

    if (!targetConnections.length) {
      node.data.connectedFromItem = null;
      node.data.connectedFromNode = null;
    } else {
      const [nextNode] = targetConnections;
      if (nextNode.type === 'output') {
        node.data.connectedFromNode = nextNode.parentNode ?? null;
        node.data.connectedFromItem = nextNode.id;
      } else {
        node.data.connectedFromNode = nextNode.id;
        node.data.connectedFromItem = nextNode.data?.output?.id ?? nextNode.id;
      }
    }
  }

  resetDisconnectedOutputPaths(node, disconnectedOutputNodesByParent[node.id]);

  if (node.data.connectedFromItem === activeNode.id) {
    const sourceNode = findNodeById(nodes, activeNode.parentNode ?? '');
    node.data.connectedFromItem =
      sourceNode?.data?.output?.id || sourceNode?.id || null;

    if (activeNode.templateId === NODE_ID.GROUP_OUTPUT) {
      clearInputConnectionFieldsIfNoIncomingConnections({
        nodes,
        node,
        connectedNodeId: activeNode.id,
      });
    }
  }

  if (node?.data?.outputs && node?.id === activeNode.parentNode) {
    updateNodeHeightBasedOnOutputs(node, outputs);
  }

  // Handle head of group node removal
  const removalIndex = nodeIdsToRemove.indexOf(node.data.connectedFromItem ?? '');
  if (removalIndex !== -1) {
    clearInputConnectionFieldsIfNoIncomingConnections({
      nodes,
      node,
      connectedNodeId: nodeIdsToRemove[removalIndex],
    });
  }

  acc.push(node);

  return acc;
}

/**
 * Find the next active node after removal
 */
function findNextActiveNode(
  nodes: PolicyNode[],
  node: PolicyNode
): PolicyNode | undefined {
  const newActiveNode = findNodeById(nodes, node?.parentNode ?? '');
  if (!isNodeTypeGroup(newActiveNode?.type)) return newActiveNode;

  return findNodeById(nodes, newActiveNode?.parentNode ?? '');
}

/**
 * Remove nodes from a policy
 */
export function removeNodes(
  policy: PolicyData,
  selectedNodes: PolicyNode[],
  handleSystemNode?: () => void
): RemoveNodesResult {
  let copyPolicy = cloneDeep(policy);

  selectedNodes.forEach((selectedNode) => {
    // Don't remove SYSTEM nodes
    if (selectedNode.data?.type === 'SYSTEM') {
      if (isFunction(handleSystemNode)) handleSystemNode();
      return;
    }

    // Remove and update outputs
    const [updatedOutputs, parentNode] = removeAndUpdateNodeOutputsPositions(
      copyPolicy.nodes,
      selectedNode
    );

    const nodeIdsToRemove = collectNodeIdAndChildDependencies(
      selectedNode,
      parentNode
    );

    const { filteredEdges, disconnectedOutputNodesByParent } =
      processEdgesAndGroupOutputs(
        copyPolicy.edges,
        copyPolicy.nodes,
        nodeIdsToRemove
      );

    copyPolicy.edges = filteredEdges;

    // Recalculate node positions and filter out removed nodes
    copyPolicy.nodes = copyPolicy.nodes
      .reduce<PolicyNode[]>(
        (acc, node) =>
          filterAndRecalculateNodeHeight({
            acc,
            node,
            nodeIdsToRemove,
            activeNode: selectedNode,
            nodes: copyPolicy.nodes,
            outputs: updatedOutputs,
            disconnectedOutputNodesByParent,
          }),
        []
      )
      .map((node) =>
        replaceNodePositionFromOutputs(node, updatedOutputs, parentNode)
      );
  });

  return {
    updatedPolicy: copyPolicy,
    newActiveNode: findNextActiveNode(
      copyPolicy.nodes,
      selectedNodes[selectedNodes.length - 1]
    ),
  };
}

/**
 * Update parent node when creating new outputs
 */
export function updateParentOnNewOutputCreation(
  nodes: PolicyNode[],
  outputs: PolicyOutput[]
): PolicyNode[] {
  const parentNodeIndex = findNodeIndexById(nodes, outputs[0]?.parentNode ?? '');
  
  if (parentNodeIndex === -1) return nodes;

  nodes[parentNodeIndex].data.outputs = [
    ...(nodes[parentNodeIndex].data.outputs || []),
    ...outputs,
  ];
  
  const updatedHeight = calculateNodeHeightBasedOnOutputs(
    nodes[parentNodeIndex].data.outputs
  );
  
  nodes[parentNodeIndex].height = updatedHeight;
  if (nodes[parentNodeIndex].style) {
    nodes[parentNodeIndex].style!.height = updatedHeight;
  }
  
  nodes.push(...(outputs as unknown as PolicyNode[]));

  return nodes;
}

/**
 * Find relevant parent to go back to
 */
export function findRelevantParentToGoBack(
  nodes: PolicyNode[],
  node: PolicyNode
): PolicyNode | undefined {
  const parent = findNodeById(nodes, node.parentNode ?? '');

  if (node.templateId === NODE_ID.GROUP_OUTPUT) {
    const firstGroupNode = parent?.data?.outputs?.[0];
    if (!firstGroupNode) return undefined;
    return findNodeById(nodes, firstGroupNode.id);
  }

  if (isNodeTypeGroup(parent?.type)) {
    return findNodeById(nodes, parent?.parentNode ?? '');
  }

  return parent;
}

/**
 * Initialize container config when adding a new app
 */
export function initializeContainerConfig(
  container: PolicyNode | undefined,
  activeNodeId: string,
  config?: unknown
): PolicyNode {
  if (!container) {
    return { id: uuidv4(), parentNode: activeNodeId, data: {} };
  }

  let updatedContainer: PolicyNode = {
    ...container,
    parentNode: activeNodeId,
  };

  // Handle special container types (Call Queue, etc.)
  // Additional initialization would go here

  if (isNodeTypeGroup(updatedContainer.type)) {
    return updatedContainer;
  }

  return {
    ...updatedContainer,
    ...updatedContainer.data,
  };
}

/**
 * Initialize start container config
 */
export function initializeStartContainerConfig(
  container: PolicyNode,
  policy?: PolicyData
): PolicyNode {
  const updatedContainer = cloneDeep(container);

  switch (container.templateId) {
    case NODE_ID.AI_TEST_NODE:
      // Build test node config
      if (!updatedContainer.config) {
        updatedContainer.config = {};
      }
      updatedContainer.config.parentId = uuidv4();
      // Additional config would go here
      return updatedContainer;
      
    case NODE_ID.AI_SUPPORT_CHAT:
      // Build support chat config
      if (!updatedContainer.config) {
        updatedContainer.config = {};
      }
      updatedContainer.config.parentId = uuidv4();
      return updatedContainer;
      
    default:
      return container;
  }
}

/**
 * Generate non-interactive output for certain node types
 */
export function generateNonInteractiveOutput(
  container: PolicyNode | null | undefined
): PolicyOutput | null {
  const NON_INTERACTIVE_NODE_OUTPUTS = [
    NODE_ID.EXTENSION_NUMBER,
    NODE_ID.INBOUND_MESSAGE,
    NODE_ID.INVOKABLE_DESTINATION,
    NODE_ID.DA_EVENT,
  ];

  if (
    !container ||
    !NON_INTERACTIVE_NODE_OUTPUTS.includes(container.templateId as number)
  ) {
    return null;
  }

  const internalExtension = container?.data?.variables?.internalExtension;

  return {
    id: uuidv4(),
    extent: 'parent',
    parentNode: container.id,
    parentId: container.id,
    type: 'output',
    position: { x: 0, y: NODE_LAYOUT_CONFIG.GAP_BETWEEN_NODES },
    data: {
      label: String(internalExtension ?? ''),
    },
  };
}

// Export as service object
export const NodeManagerService = {
  removeNodes,
  isNodeTypeOutput,
  removeEdgeAndUpdateNode,
  generateNonInteractiveOutput,
  updateParentOnNewOutputCreation,
  initializeContainerConfig,
  findRelevantParentToGoBack,
  processEdgesAndGroupOutputs,
  groupOutputNodesByParent,
  resetDisconnectedOutputPaths,
  clearEdges,
  initializeStartContainerConfig,
  findNodeById,
  findNodeIndexById,
  calculateNodeHeightBasedOnOutputs,
  getNextYPositionFromOutputs,
  ensureOutputsPositions,
  determineNodeBaseHeightBasedOnType,
  isNodeTypeGroup,
};

