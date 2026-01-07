/**
 * Tests for NodeManagerService
 * Ported from natterbox-routing-policies/src/services/nodeManager.service.test.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NodeManagerService,
  removeNodes,
  removeEdgeAndUpdateNode,
  updateParentOnNewOutputCreation,
  findRelevantParentToGoBack,
  initializeContainerConfig,
  initializeStartContainerConfig,
  generateNonInteractiveOutput,
  isNodeTypeOutput,
  processEdgesAndGroupOutputs,
  groupOutputNodesByParent,
  resetDisconnectedOutputPaths,
  clearEdges,
  isNodeTypeGroup,
  findNodeById,
  findNodeIndexById,
  calculateNodeHeightBasedOnOutputs,
  getNextYPositionFromOutputs,
  NODE_LAYOUT_CONFIG,
} from '../nodeManagerService';
import { NODE_ID } from '../nodeClassName';

describe('NodeManagerService.removeNodes', () => {
  let mockPolicy: any;
  let mockSelectedNodes: any[];
  const mockSystemNode = {
    id: 'node0',
    data: { type: 'SYSTEM', connectedTo: 'node1', outputs: [] },
  };

  beforeEach(() => {
    mockPolicy = {
      nodes: [
        { id: 'node1', data: { connectedTo: 'node2', outputs: [] } },
        { id: 'node2', data: { connectedFromItem: 'node1', outputs: [] } },
        { id: 'node3', data: { connectedTo: 'finish', outputs: [] } },
      ],
      edges: [
        { id: 'edge1', source: 'node1', target: 'node2' },
        { id: 'edge2', source: 'node2', target: 'node3' },
      ],
    };
    mockSelectedNodes = [
      { id: 'node2', data: { connectedFromItem: 'node1', outputs: [] } },
    ];
  });

  it('should handle removing nodes with outputs correctly', () => {
    mockSelectedNodes = [
      {
        id: 'node1',
        data: { connectedTo: 'node2', outputs: [{ id: 'output1' }] },
      },
    ];
    const { updatedPolicy } = removeNodes(mockPolicy, mockSelectedNodes);

    expect(updatedPolicy.nodes).toHaveLength(2);
    expect(updatedPolicy.nodes.find((node: any) => node.id === 'node1')).toBeUndefined();
    expect(updatedPolicy.edges).toHaveLength(1);
    expect(updatedPolicy.edges.find((edge: any) => edge.id === 'edge1')).toBeUndefined();
  });

  it('should handle removing nodes with connectedFromItem correctly', () => {
    mockSelectedNodes = [
      { id: 'node3', data: { connectedFromItem: 'node2', outputs: [] } },
    ];
    const { updatedPolicy } = removeNodes(mockPolicy, mockSelectedNodes);

    expect(updatedPolicy.nodes).toHaveLength(2);
    expect(updatedPolicy.nodes.find((node: any) => node.id === 'node3')).toBeUndefined();
    expect(updatedPolicy.edges).toHaveLength(1);
    expect(updatedPolicy.edges.find((edge: any) => edge.id === 'edge2')).toBeUndefined();
  });

  it('should handle removing multiple nodes correctly', () => {
    mockSelectedNodes = [
      { id: 'node1', data: { connectedTo: 'node2', outputs: [] } },
      { id: 'node2', data: { connectedFromItem: 'node1', outputs: [] } },
    ];
    const { updatedPolicy } = removeNodes(mockPolicy, mockSelectedNodes);

    expect(updatedPolicy.nodes).toHaveLength(1);
    expect(updatedPolicy.nodes.find((node: any) => node.id === 'node1')).toBeUndefined();
    expect(updatedPolicy.nodes.find((node: any) => node.id === 'node2')).toBeUndefined();
    expect(updatedPolicy.edges).toHaveLength(0);
  });

  it('should handle removing SYSTEM node without callback', () => {
    mockSelectedNodes = [mockSystemNode];
    mockPolicy.nodes.push(mockSystemNode);

    const { updatedPolicy } = removeNodes(mockPolicy, mockSelectedNodes);

    // SYSTEM nodes should not be removed
    expect(updatedPolicy.nodes).toHaveLength(4);
  });

  it('should handle removing SYSTEM node and call handleSystemNode function', () => {
    mockSelectedNodes = [mockSystemNode];
    mockPolicy.nodes.push(mockSystemNode);

    const mockHandleSystemNode = vi.fn();
    const { updatedPolicy } = removeNodes(mockPolicy, mockSelectedNodes, mockHandleSystemNode);

    expect(updatedPolicy.nodes).toHaveLength(4);
    expect(mockHandleSystemNode).toHaveBeenCalled();
  });

  it('should handle empty selectedNodes array', () => {
    const { updatedPolicy } = removeNodes(mockPolicy, []);

    expect(updatedPolicy.nodes).toHaveLength(3);
    expect(updatedPolicy.edges).toHaveLength(2);
  });

  it('should handle nodes without parentNode property', () => {
    mockSelectedNodes = [{ id: 'node1', data: { outputs: [] } }];

    const { updatedPolicy } = removeNodes(mockPolicy, mockSelectedNodes);

    expect(updatedPolicy.nodes).toHaveLength(2);
  });

  it('should handle nodes with empty outputs array', () => {
    mockSelectedNodes = [{ id: 'node1', data: { outputs: [] } }];

    const { updatedPolicy } = removeNodes(mockPolicy, mockSelectedNodes);

    expect(updatedPolicy.nodes).toHaveLength(2);
  });

  it('should return newActiveNode as undefined when node is null', () => {
    const policy = {
      nodes: [{ id: 'node1', data: { outputs: [] } }],
      edges: [],
    };
    mockSelectedNodes = [{ id: 'node1', data: { outputs: [] } }];

    const { newActiveNode } = removeNodes(policy, mockSelectedNodes);

    expect(newActiveNode).toBeUndefined();
  });

  it('should set connectedTo to "finish" if no matching edge exists', () => {
    const policy = {
      nodes: [
        { id: 'node1', data: { connectedTo: 'node2' } },
        { id: 'node2', data: { connectedFromItem: 'node1' } },
      ],
      edges: [],
    };
    mockSelectedNodes = [{ id: 'node2', data: {} }];

    const { updatedPolicy } = removeNodes(policy, mockSelectedNodes);

    const updatedNode = updatedPolicy.nodes.find((node: any) => node.id === 'node1');
    expect(updatedNode?.data.connectedTo).toBe('finish');
  });

  it('should handle removing output nodes correctly', () => {
    const policy = {
      nodes: [
        {
          id: 'parentNode',
          data: {
            connectedTo: 'output1',
            outputs: [
              { id: 'output1', position: { x: 0, y: 0 } },
              { id: 'output2', position: { x: 0, y: 50 } },
            ],
          },
          height: 129,
          style: { height: 129 },
        },
        {
          id: 'output1',
          type: 'output',
          parentNode: 'parentNode',
          data: {
            connectedFromNode: 'parentNode',
            connectedFromItem: 'parentNode',
            connectedTo: 'targetNode',
            output: { id: 'output1' },
          },
        },
        {
          id: 'output2',
          type: 'output',
          parentNode: 'parentNode',
          data: {
            connectedFromNode: 'parentNode',
            connectedFromItem: 'output2',
            connectedTo: 'finish',
            output: { id: 'output2' },
          },
        },
        {
          id: 'targetNode',
          data: {
            connectedFromNode: 'parentNode',
            connectedFromItem: 'output1',
          },
        },
      ],
      edges: [{ id: 'edge1', source: 'output1', target: 'targetNode' }],
    };

    const selectedNodes = [
      {
        id: 'output1',
        type: 'output',
        parentNode: 'parentNode',
        data: {
          connectedFromNode: 'parentNode',
          connectedFromItem: 'parentNode',
          connectedTo: 'targetNode',
          output: { id: 'output1' },
        },
      },
    ];

    const { updatedPolicy, newActiveNode } = removeNodes(policy, selectedNodes);

    // Output node should be removed
    expect(updatedPolicy.nodes.find((node: any) => node.id === 'output1')).toBeUndefined();
    // Parent node should have its outputs updated
    expect(newActiveNode?.id).toBe('parentNode');
  });

  it('should handle removing a node with connectedFromNode', () => {
    const policy = {
      nodes: [
        { id: 'node1', data: { connectedTo: 'node2', output: { id: 'node1' } } },
        {
          id: 'node2',
          data: {
            connectedFromNode: 'node1',
            connectedFromItem: 'node1',
            connectedTo: 'node3',
          },
        },
        {
          id: 'node3',
          data: {
            connectedFromNode: 'node2',
            connectedFromItem: 'node2',
          },
        },
      ],
      edges: [
        { id: 'edge1', source: 'node1', target: 'node2' },
        { id: 'edge2', source: 'node2', target: 'node3' },
      ],
    };

    const selectedNodes = [{ id: 'node2', data: policy.nodes[1].data }];

    const { updatedPolicy } = removeNodes(policy, selectedNodes);

    expect(updatedPolicy.nodes.find((node: any) => node.id === 'node2')).toBeUndefined();
    // node3 should have its connection updated
    const node3 = updatedPolicy.nodes.find((node: any) => node.id === 'node3');
    expect(node3?.data.connectedFromItem).toBeNull();
  });

  it('should handle node with GROUP_OUTPUT templateId', () => {
    const policy = {
      nodes: [
        {
          id: 'groupNode',
          type: 'group',
          data: { connectedTo: 'output1', outputs: [] },
        },
        {
          id: 'output1',
          type: 'output',
          templateId: 114, // NODE_ID.GROUP_OUTPUT
          parentNode: 'groupNode',
          data: {
            connectedFromNode: 'groupNode',
            connectedFromItem: 'groupNode',
            connectedTo: 'nextNode',
            output: { id: 'output1' },
          },
        },
        {
          id: 'nextNode',
          data: {
            connectedFromNode: 'groupNode',
            connectedFromItem: 'output1',
          },
        },
      ],
      edges: [{ id: 'edge1', source: 'output1', target: 'nextNode' }],
    };

    const selectedNodes = [
      {
        id: 'output1',
        type: 'output',
        templateId: 114,
        parentNode: 'groupNode',
        data: policy.nodes[1].data,
      },
    ];

    const { updatedPolicy } = removeNodes(policy, selectedNodes);

    expect(updatedPolicy.nodes.find((node: any) => node.id === 'output1')).toBeUndefined();
  });

  it('should handle node with data.connectedFromNode matching activeNode.id and outputs array', () => {
    const policy = {
      nodes: [
        {
          id: 'parentNode',
          data: {
            connectedTo: 'activeNode',
            outputs: [
              { id: 'output1', position: { x: 0, y: 0 } },
              { id: 'output2', position: { x: 0, y: 50 } },
            ],
          },
          height: 129,
          style: { height: 129 },
        },
        {
          id: 'activeNode',
          parentNode: 'parentNode',
          data: {
            connectedFromNode: 'parentNode',
            connectedTo: 'childNode',
            outputs: [{ id: 'activeOutput' }],
          },
        },
        {
          id: 'childNode',
          data: {
            connectedFromNode: 'activeNode',
            connectedFromItem: 'activeOutput',
            connectedTo: 'finish',
          },
        },
      ],
      edges: [
        { id: 'edge1', source: 'activeNode', target: 'childNode' },
      ],
    };

    const selectedNodes = [
      {
        id: 'activeNode',
        parentNode: 'parentNode',
        data: policy.nodes[1].data,
      },
    ];

    const { updatedPolicy, newActiveNode } = removeNodes(policy, selectedNodes);

    expect(updatedPolicy.nodes.find((node: any) => node.id === 'activeNode')).toBeUndefined();
    expect(newActiveNode?.id).toBe('parentNode');
  });

  it('should handle removing node when head of group is in removal list', () => {
    const policy = {
      nodes: [
        {
          id: 'groupNode',
          type: 'group',
          data: {
            connectedTo: 'headNode',
          },
        },
        {
          id: 'headNode',
          parentNode: 'groupNode',
          data: {
            connectedFromNode: 'groupNode',
            connectedTo: 'tailNode',
          },
        },
        {
          id: 'tailNode',
          data: {
            connectedFromNode: 'headNode',
            connectedFromItem: 'headNode',
          },
        },
      ],
      edges: [
        { id: 'edge1', source: 'headNode', target: 'tailNode' },
      ],
    };

    const selectedNodes = [
      {
        id: 'headNode',
        parentNode: 'groupNode',
        data: policy.nodes[1].data,
      },
    ];

    const { updatedPolicy } = removeNodes(policy, selectedNodes);

    expect(updatedPolicy.nodes.find((node: any) => node.id === 'headNode')).toBeUndefined();
  });

  it('should handle updating target connections when type is not output', () => {
    const policy = {
      nodes: [
        {
          id: 'node1',
          data: {
            id: 'node1-data',
            connectedTo: 'activeNode',
            output: { id: 'node1-output' },
          },
        },
        {
          id: 'activeNode',
          data: {
            connectedFromNode: 'node1',
            connectedFromItem: 'node1-output',
            connectedTo: 'targetNode',
          },
        },
        {
          id: 'targetNode',
          data: {
            connectedFromNode: 'activeNode',
            connectedFromItem: 'activeNode',
            connectedTo: 'finish',
          },
        },
      ],
      edges: [
        { id: 'edge1', source: 'node1', target: 'activeNode' },
        { id: 'edge2', source: 'activeNode', target: 'targetNode' },
      ],
    };

    const selectedNodes = [
      {
        id: 'activeNode',
        data: policy.nodes[1].data,
      },
    ];

    const { updatedPolicy } = removeNodes(policy, selectedNodes);

    // targetNode should have its connection fields cleared (no matching target connections found)
    const targetNode = updatedPolicy.nodes.find((node: any) => node.id === 'targetNode');
    expect(targetNode?.data.connectedFromNode).toBeNull();
    expect(targetNode?.data.connectedFromItem).toBeNull();
  });
});

describe('NodeManagerService.updateParentOnNewOutputCreation', () => {
  it('should add outputs to the parent node and update its height', () => {
    const nodes = [
      {
        id: 'parentNode',
        data: { outputs: [] },
        style: { height: 63 },
      },
    ];
    const outputs = [
      { id: 'output1', parentNode: 'parentNode', style: { height: 30 } },
      { id: 'output2', parentNode: 'parentNode', style: { height: 30 } },
    ];

    const updatedNodes = updateParentOnNewOutputCreation(nodes as any, outputs as any);

    expect(updatedNodes[0].data.outputs).toHaveLength(2);
    expect(updatedNodes[0].height).toBe(129); // 63 + 33*2
  });

  it('should handle empty outputs array', () => {
    const nodes = [
      {
        id: 'parentNode',
        data: { outputs: [] },
        style: { height: 63 },
      },
    ];

    const result = updateParentOnNewOutputCreation(nodes as any, [
      { id: 'out1', parentNode: 'parentNode' },
    ] as any);

    expect(result[0].data.outputs).toHaveLength(1);
  });

  it('should handle parent node not found', () => {
    const nodes = [
      {
        id: 'otherNode',
        data: { outputs: [] },
        style: { height: 63 },
      },
    ];
    const outputs = [{ id: 'output1', parentNode: 'nonexistent' }];

    const result = updateParentOnNewOutputCreation(nodes as any, outputs as any);

    // Should return nodes unchanged since parent not found
    expect(result).toEqual(nodes);
  });
});

describe('NodeManagerService.findRelevantParentToGoBack', () => {
  it('should return the parent node if no special conditions are met', () => {
    // Note: parent node must NOT be a group type for this test
    // The function first finds the parent node by looking up node.parentNode in the nodes array
    const parentNode = { id: 'parentNode', type: 'default', data: {} };
    const nodes = [parentNode];
    const node = { id: 'childNode', parentNode: 'parentNode', data: {} };

    const result = findRelevantParentToGoBack(nodes as any, node as any);

    expect(result?.id).toBe('parentNode');
  });

  it('should return the first group node if templateId is GROUP_OUTPUT', () => {
    const nodes = [
      { id: 'parentNode', data: { outputs: [{ id: 'groupNode1' }] } },
      { id: 'groupNode1', data: {} },
    ];
    const node = {
      id: 'childNode',
      parentNode: 'parentNode',
      templateId: NODE_ID.GROUP_OUTPUT,
      data: {},
    };

    const result = findRelevantParentToGoBack(nodes as any, node as any);

    expect(result?.id).toBe('groupNode1');
  });

  it('should return the parent\'s parent if the parent is a group', () => {
    // The parent is 'group' type, so function should return grandparent
    // First it finds parentNode which is type='group', then looks up parentNode.parentNode
    const nodes = [
      { id: 'grandParentNode', type: 'default', data: {} },
      { id: 'parentNode', parentNode: 'grandParentNode', type: 'group', data: {} },
    ];
    const node = { id: 'childNode', parentNode: 'parentNode', data: {} };

    const result = findRelevantParentToGoBack(nodes as any, node as any);

    expect(result?.id).toBe('grandParentNode');
  });

  it('should handle node without parentNode', () => {
    const nodes = [{ id: 'parentNode', data: {} }];
    const node = { id: 'childNode', data: {} };

    const result = findRelevantParentToGoBack(nodes as any, node as any);

    expect(result).toBeUndefined();
  });

  it('should handle parent without outputs', () => {
    const nodes = [{ id: 'parentNode', data: {} }];
    const node = {
      id: 'childNode',
      parentNode: 'parentNode',
      templateId: NODE_ID.GROUP_OUTPUT,
      data: {},
    };

    const result = findRelevantParentToGoBack(nodes as any, node as any);

    expect(result).toBeUndefined();
  });
});

describe('NodeManagerService.initializeContainerConfig', () => {
  it('should return container with parentNode when container is provided', () => {
    const container = { id: 'container1', templateId: 10, data: {} };
    const activeNodeId = 'activeNode1';

    const result = initializeContainerConfig(container as any, activeNodeId);

    expect(result.parentNode).toBe('activeNode1');
  });

  it('should handle undefined container', () => {
    const result = initializeContainerConfig(undefined, 'activeNode1');

    expect(result.parentNode).toBe('activeNode1');
    expect(result.id).toBeDefined();
  });

  it('should merge container data for non-group types', () => {
    const container = {
      id: 'container1',
      templateId: 10,
      type: 'default',
      data: { key: 'value' },
    };
    const activeNodeId = 'activeNode1';

    const result = initializeContainerConfig(container as any, activeNodeId);

    expect(result.parentNode).toBe('activeNode1');
    expect(result.key).toBe('value'); // Data should be spread
  });
});

describe('NodeManagerService.initializeStartContainerConfig', () => {
  it('should update config for AI_TEST_NODE templateId', () => {
    const container = {
      id: 'c2',
      config: { component: {} },
      templateId: NODE_ID.AI_TEST_NODE,
      data: {},
    };
    const policy = { Name: 'PolicyName', Type__c: 'PolicyType', nodes: [], edges: [] };

    const result = initializeStartContainerConfig(container as any, policy);

    expect(result.config?.parentId).toBeDefined();
  });

  it('should not modify config if templateId is not special', () => {
    const container = {
      id: 'c2',
      config: { component: { existing: 'data' } },
      templateId: 999,
      data: {},
    };
    const policy = { Name: 'PolicyName', Type__c: 'PolicyType', nodes: [], edges: [] };

    const result = initializeStartContainerConfig(container as any, policy);

    expect(result.config?.component?.existing).toBe('data');
  });

  it('should handle AI_SUPPORT_CHAT templateId', () => {
    const container = {
      id: 'chat1',
      config: { component: {} },
      templateId: NODE_ID.AI_SUPPORT_CHAT,
      data: {},
    };

    const result = initializeStartContainerConfig(container as any);

    expect(result.config?.parentId).toBeDefined();
  });
});

describe('NodeManagerService.generateNonInteractiveOutput', () => {
  it('should return null if container templateId is not in NON_INTERACTIVE_NODE_OUTPUTS', () => {
    const container = { id: 'container1', templateId: 999, data: {} };

    const result = generateNonInteractiveOutput(container as any);

    expect(result).toBeNull();
  });

  it('should return a custom output for valid templateId', () => {
    const container = {
      id: 'container1',
      templateId: NODE_ID.EXTENSION_NUMBER,
      data: { variables: { internalExtension: '1234' } },
    };

    const result = generateNonInteractiveOutput(container as any);

    expect(result).not.toBeNull();
    expect(result?.parentNode).toBe('container1');
    expect(result?.data?.label).toBe('1234');
  });

  it('should handle container without variables', () => {
    const container = {
      id: 'container1',
      templateId: NODE_ID.EXTENSION_NUMBER,
      data: {},
    };

    const result = generateNonInteractiveOutput(container as any);

    expect(result).not.toBeNull();
    expect(result?.parentNode).toBe('container1');
  });

  it('should handle undefined container', () => {
    const result = generateNonInteractiveOutput(undefined);

    expect(result).toBeNull();
  });

  it('should handle null container', () => {
    const result = generateNonInteractiveOutput(null);

    expect(result).toBeNull();
  });
});

describe('NodeManagerService.removeEdgeAndUpdateNode', () => {
  it('should remove edge and update nodes correctly', () => {
    const mockPolicy = {
      nodes: [
        { id: 'node1', data: { connectedTo: 'node2' } },
        { id: 'node2', data: { connectedFromItem: 'node1', connectedFromNode: 'node1' } },
      ],
    };
    const mockEdges = [{ id: 'edge1', source: 'node1', target: 'node2' }];
    const mockEdge = { id: 'edge1', source: 'node1', target: 'node2' };

    const result = removeEdgeAndUpdateNode(mockPolicy as any, mockEdges, mockEdge);

    expect(result.filteredEdges).toHaveLength(0);
    expect(result.filteredNodes).toHaveLength(2);
    expect(result.filteredNodes[0].data.connectedTo).toBe('finish');
  });

  it('should handle edge with non-existent source or target node', () => {
    const mockPolicy = {
      nodes: [{ id: 'node1', data: { connectedTo: 'node2' } }],
    };
    const mockEdges = [{ id: 'edge1', source: 'nonExistent', target: 'node2' }];
    const mockEdge = { id: 'edge1', source: 'nonExistent', target: 'node2' };

    const result = removeEdgeAndUpdateNode(mockPolicy as any, mockEdges, mockEdge);

    expect(result.filteredEdges).toHaveLength(0);
    expect(result.filteredNodes).toHaveLength(1);
  });
});

describe('NodeManagerService.isNodeTypeOutput', () => {
  it('should return true for output type', () => {
    const result = isNodeTypeOutput('output');
    expect(result).toBe(true);
  });

  it('should return false for non-output type', () => {
    const result = isNodeTypeOutput('default');
    expect(result).toBe(false);
  });

  it('should return false for undefined', () => {
    const result = isNodeTypeOutput(undefined);
    expect(result).toBe(false);
  });
});

describe('NodeManagerService.processEdgesAndGroupOutputs', () => {
  it('should process edges and group outputs correctly', () => {
    const edges = [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node3', target: 'node4' },
    ];
    const nodes = [
      { id: 'node1', type: 'output', parentNode: 'parent1', data: {} },
      { id: 'node2', type: 'default', data: {} },
      { id: 'node3', type: 'default', data: {} },
      { id: 'node4', type: 'default', data: {} },
    ];
    const nodeIdsToRemove = ['node2'];

    const result = processEdgesAndGroupOutputs(edges, nodes as any, nodeIdsToRemove);

    expect(result.filteredEdges).toHaveLength(1);
    expect(result.filteredEdges[0].id).toBe('edge2');
    expect(result.disconnectedOutputNodesByParent).toBeDefined();
  });
});

describe('NodeManagerService.groupOutputNodesByParent', () => {
  it('should group output nodes by parent correctly', () => {
    const nodes = [
      { id: 'node1', type: 'output', parentNode: 'parent1', data: {} },
      { id: 'node2', type: 'output', parentNode: 'parent1', data: {} },
      { id: 'node3', type: 'default', data: {} },
    ];
    const sourceNodeIds = ['node1', 'node2', 'node3'];

    const result = groupOutputNodesByParent(nodes as any, sourceNodeIds);

    expect(result.parent1).toEqual(['node1', 'node2']);
  });

  it('should handle nodes without parentNode', () => {
    const nodes = [{ id: 'node1', type: 'output', data: {} }];
    const sourceNodeIds = ['node1'];

    const result = groupOutputNodesByParent(nodes as any, sourceNodeIds);

    expect(result).toEqual({});
  });
});

describe('NodeManagerService.resetDisconnectedOutputPaths', () => {
  it('should reset disconnected output paths correctly', () => {
    const node = {
      id: 'parent1',
      data: {
        outputs: [
          { id: 'output1', connectedTo: 'node2' },
          { id: 'output2', data: { connectedTo: 'node3' } },
        ],
      },
    };
    const disconnectedOutputIds = ['output1', 'output2'];

    resetDisconnectedOutputPaths(node as any, disconnectedOutputIds);

    expect(node.data.outputs[0].connectedTo).toBe('finish');
    expect(node.data.outputs[1].data?.connectedTo).toBe('finish');
  });

  it('should handle undefined disconnectedOutputIds', () => {
    const node = {
      id: 'parent1',
      data: {
        outputs: [{ id: 'output1', connectedTo: 'node2' }],
      },
    };

    expect(() => resetDisconnectedOutputPaths(node as any, undefined)).not.toThrow();
  });
});

describe('NodeManagerService.clearEdges', () => {
  it('should clear edges and collect source node IDs', () => {
    const edges = [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node3', target: 'node4' },
      { id: 'edge3', source: 'node5', target: 'node6' },
    ];
    const nodeIdsToRemove = ['node2', 'node4'];

    const result = clearEdges(edges, nodeIdsToRemove);

    expect(result.filteredEdges).toHaveLength(1);
    expect(result.filteredEdges[0].id).toBe('edge3');
    expect(result.sourceNodeIds).toEqual(['node1', 'node3']);
  });

  it('should handle empty nodeIdsToRemove', () => {
    const edges = [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node3', target: 'node4' },
    ];
    const nodeIdsToRemove: string[] = [];

    const result = clearEdges(edges, nodeIdsToRemove);

    expect(result.filteredEdges).toHaveLength(2);
    expect(result.sourceNodeIds).toHaveLength(0);
  });
});

describe('Utility functions', () => {
  describe('isNodeTypeGroup', () => {
    it('should return true for group type', () => {
      expect(isNodeTypeGroup('group')).toBe(true);
    });

    it('should return false for other types', () => {
      expect(isNodeTypeGroup('default')).toBe(false);
      expect(isNodeTypeGroup(undefined)).toBe(false);
    });
  });

  describe('findNodeById', () => {
    it('should find node by id', () => {
      const nodes = [
        { id: 'node1', data: {} },
        { id: 'node2', data: {} },
      ];
      const result = findNodeById(nodes as any, 'node2');
      expect(result?.id).toBe('node2');
    });

    it('should return undefined if not found', () => {
      const nodes = [{ id: 'node1', data: {} }];
      const result = findNodeById(nodes as any, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('findNodeIndexById', () => {
    it('should find node index by id', () => {
      const nodes = [
        { id: 'node1', data: {} },
        { id: 'node2', data: {} },
      ];
      const result = findNodeIndexById(nodes as any, 'node2');
      expect(result).toBe(1);
    });

    it('should return -1 if not found', () => {
      const nodes = [{ id: 'node1', data: {} }];
      const result = findNodeIndexById(nodes as any, 'nonexistent');
      expect(result).toBe(-1);
    });
  });

  describe('calculateNodeHeightBasedOnOutputs', () => {
    it('should return base height for empty outputs', () => {
      expect(calculateNodeHeightBasedOnOutputs([])).toBe(NODE_LAYOUT_CONFIG.CONTAINER_BASE_HEIGHT);
    });

    it('should calculate height based on output count', () => {
      const outputs = [{ id: '1' }, { id: '2' }];
      const expected = NODE_LAYOUT_CONFIG.OUTPUT_HEIGHT * 2 + NODE_LAYOUT_CONFIG.CONTAINER_BASE_HEIGHT;
      expect(calculateNodeHeightBasedOnOutputs(outputs as any)).toBe(expected);
    });

    it('should use custom base height', () => {
      const outputs = [{ id: '1' }];
      expect(calculateNodeHeightBasedOnOutputs(outputs as any, 100)).toBe(133);
    });
  });

  describe('getNextYPositionFromOutputs', () => {
    it('should return GAP_BETWEEN_NODES for empty outputs', () => {
      expect(getNextYPositionFromOutputs([])).toBe(NODE_LAYOUT_CONFIG.GAP_BETWEEN_NODES);
    });

    it('should calculate position based on output count', () => {
      const outputs = [{ id: '1' }, { id: '2' }];
      const expected = 3 * NODE_LAYOUT_CONFIG.GAP_BETWEEN_NODES;
      expect(getNextYPositionFromOutputs(outputs as any)).toBe(expected);
    });
  });
});

// Additional coverage tests
describe('NodeManagerService.initializeContainerConfig - group types', () => {
  it('should return container directly for group type', () => {
    const container = {
      id: 'group1',
      templateId: 10,
      type: 'group',
      parentNode: 'oldParent',
      data: { key: 'value' },
    };
    const activeNodeId = 'activeNode1';

    const result = initializeContainerConfig(container as any, activeNodeId);

    expect(result.parentNode).toBe('activeNode1');
    expect(result.type).toBe('group');
    // Group type should not spread data
    expect((result as any).key).toBeUndefined();
  });
});

describe('NodeManagerService.initializeStartContainerConfig - edge cases', () => {
  it('should create config object if undefined for AI_TEST_NODE', () => {
    const container = {
      id: 'test1',
      templateId: NODE_ID.AI_TEST_NODE,
      data: {},
    };

    const result = initializeStartContainerConfig(container as any);

    expect(result.config).toBeDefined();
    expect(result.config?.parentId).toBeDefined();
  });

  it('should create config object if undefined for AI_SUPPORT_CHAT', () => {
    const container = {
      id: 'chat1',
      templateId: NODE_ID.AI_SUPPORT_CHAT,
      data: {},
    };

    const result = initializeStartContainerConfig(container as any);

    expect(result.config).toBeDefined();
    expect(result.config?.parentId).toBeDefined();
  });
});

describe('NodeManagerService.generateNonInteractiveOutput - all node types', () => {
  it('should generate output for INBOUND_MESSAGE', () => {
    const container = {
      id: 'container1',
      templateId: NODE_ID.INBOUND_MESSAGE,
      data: { variables: { internalExtension: 'MSG001' } },
    };

    const result = generateNonInteractiveOutput(container as any);

    expect(result).not.toBeNull();
    expect(result?.parentNode).toBe('container1');
    expect(result?.type).toBe('output');
  });

  it('should generate output for INVOKABLE_DESTINATION', () => {
    const container = {
      id: 'container1',
      templateId: NODE_ID.INVOKABLE_DESTINATION,
      data: {},
    };

    const result = generateNonInteractiveOutput(container as any);

    expect(result).not.toBeNull();
    expect(result?.data?.label).toBe('');
  });

  it('should generate output for DA_EVENT', () => {
    const container = {
      id: 'container1',
      templateId: NODE_ID.DA_EVENT,
      data: { variables: { internalExtension: 'EVT001' } },
    };

    const result = generateNonInteractiveOutput(container as any);

    expect(result).not.toBeNull();
    expect(result?.data?.label).toBe('EVT001');
  });
});

describe('NodeManagerService.findRelevantParentToGoBack - edge cases', () => {
  it('should return undefined when parent has no outputs for GROUP_OUTPUT', () => {
    const nodes = [
      { id: 'parent1', type: 'group', data: {} },
      { id: 'groupOutput1', parentNode: 'parent1', templateId: NODE_ID.GROUP_OUTPUT, data: {} },
    ];

    const result = findRelevantParentToGoBack(nodes as any, nodes[1] as any);

    expect(result).toBeUndefined();
  });

  it('should return grandparent for group type parent', () => {
    const nodes = [
      { id: 'grandparent1', type: 'default', data: {} },
      { id: 'parent1', type: 'group', parentNode: 'grandparent1', data: {} },
      { id: 'node1', parentNode: 'parent1', data: {} },
    ];

    const result = findRelevantParentToGoBack(nodes as any, nodes[2] as any);

    expect(result?.id).toBe('grandparent1');
  });

  it('should return parent for regular nodes', () => {
    const nodes = [
      { id: 'parent1', type: 'default', data: {} },
      { id: 'node1', parentNode: 'parent1', data: {} },
    ];

    const result = findRelevantParentToGoBack(nodes as any, nodes[1] as any);

    expect(result?.id).toBe('parent1');
  });

  it('should handle node without parentNode', () => {
    const nodes = [
      { id: 'node1', data: {} },
    ];

    const result = findRelevantParentToGoBack(nodes as any, nodes[0] as any);

    expect(result).toBeUndefined();
  });
});

describe('NodeManagerService.updateParentOnNewOutputCreation - edge cases', () => {
  it('should handle node without existing outputs', () => {
    const nodes = [
      { id: 'parent1', data: {}, height: 100 },
    ];
    const outputs = [{ id: 'output1', parentNode: 'parent1', data: {} }];

    const result = updateParentOnNewOutputCreation(nodes as any, outputs as any);

    expect(result).toHaveLength(2);
    expect(result[0].data.outputs).toHaveLength(1);
  });

  it('should calculate and set height based on outputs', () => {
    const nodes = [
      { id: 'parent1', data: { outputs: [] }, height: 100, style: { height: 100 } },
    ];
    const outputs = [{ id: 'output1', parentNode: 'parent1', data: {} }];

    const result = updateParentOnNewOutputCreation(nodes as any, outputs as any);

    expect(result[0].height).toBeGreaterThan(0);
  });
});

describe('NodeManagerService.removeEdgeAndUpdateNode - additional cases', () => {
  it('should handle edge with sourceHandle', () => {
    const mockPolicy = {
      nodes: [
        { id: 'node1', data: { connectedTo: 'node2', outputs: [{ id: 'handle1', connectedTo: 'node2' }] } },
        { id: 'node2', data: { connectedFromItem: 'handle1' } },
      ],
    };
    const mockEdges = [{ id: 'edge1', source: 'node1', sourceHandle: 'handle1', target: 'node2' }];
    const mockEdge = { id: 'edge1', source: 'node1', sourceHandle: 'handle1', target: 'node2' };

    const result = removeEdgeAndUpdateNode(mockPolicy as any, mockEdges, mockEdge);

    expect(result.filteredEdges).toHaveLength(0);
  });

  it('should handle target node with complex connectedFrom data', () => {
    const mockPolicy = {
      nodes: [
        { id: 'node1', data: { connectedTo: 'node2' } },
        { id: 'node2', data: { connectedFromItem: 'node1', connectedFromNode: 'node1', connectedFromOutputId: 'out1' } },
      ],
    };
    const mockEdges = [{ id: 'edge1', source: 'node1', target: 'node2' }];
    const mockEdge = { id: 'edge1', source: 'node1', target: 'node2' };

    const result = removeEdgeAndUpdateNode(mockPolicy as any, mockEdges, mockEdge);

    // The function sets these to null rather than undefined
    expect(result.filteredNodes[1].data.connectedFromItem).toBeNull();
    expect(result.filteredNodes[1].data.connectedFromNode).toBeNull();
  });
});

describe('NodeManagerService.resetDisconnectedOutputPaths - deep nested data', () => {
  it('should reset nested output data connectedTo', () => {
    const node = {
      id: 'parent1',
      data: {
        outputs: [
          { id: 'output1', data: { connectedTo: 'node2', label: 'Output 1' } },
        ],
      },
    };
    const disconnectedOutputIds = ['output1'];

    resetDisconnectedOutputPaths(node as any, disconnectedOutputIds);

    expect(node.data.outputs[0].data?.connectedTo).toBe('finish');
    expect(node.data.outputs[0].data?.label).toBe('Output 1'); // Other data preserved
  });

  it('should handle outputs with only top-level connectedTo', () => {
    const node = {
      id: 'parent1',
      data: {
        outputs: [
          { id: 'output1', connectedTo: 'node2' },
        ],
      },
    };
    const disconnectedOutputIds = ['output1'];

    resetDisconnectedOutputPaths(node as any, disconnectedOutputIds);

    expect(node.data.outputs[0].connectedTo).toBe('finish');
  });

  it('should not modify outputs not in disconnectedOutputIds', () => {
    const node = {
      id: 'parent1',
      data: {
        outputs: [
          { id: 'output1', connectedTo: 'node2' },
          { id: 'output2', connectedTo: 'node3' },
        ],
      },
    };
    const disconnectedOutputIds = ['output1'];

    resetDisconnectedOutputPaths(node as any, disconnectedOutputIds);

    expect(node.data.outputs[0].connectedTo).toBe('finish');
    expect(node.data.outputs[1].connectedTo).toBe('node3'); // Unchanged
  });
});

