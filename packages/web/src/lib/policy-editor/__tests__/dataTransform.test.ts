/**
 * Tests for dataTransform utilities
 * Ported from natterbox-routing-policies/src/services/buildChartWithLegacyData.service.test.js
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  buildNodeSubItems,
  buildNodeOutputs,
  transformNode,
  transformConnections,
  transformLegacyPolicy,
  isSystemPolicySource,
  calculateNodeHeightBasedOnOutputs,
  getNextYPositionFromOutputs,
  getNodeType,
  getNodeLabel,
  NODE_VALUES,
  type LegacyNode,
  type LegacyPolicy,
  type LegacyConnection,
  type TransformedOutput,
} from '../dataTransform';
import { NODE_ID } from '../nodeClassName';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
}));

describe('dataTransform utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSystemPolicySource', () => {
    test('should return true for system policies', () => {
      expect(isSystemPolicySource({ source: 'system', nodes: [], connections: [] })).toBe(true);
    });

    test('should return false for non-system policies', () => {
      expect(isSystemPolicySource({ source: 'user', nodes: [], connections: [] })).toBe(false);
      expect(isSystemPolicySource({ nodes: [], connections: [] })).toBe(false);
    });
  });

  describe('calculateNodeHeightBasedOnOutputs', () => {
    test('should return base height for empty outputs', () => {
      expect(calculateNodeHeightBasedOnOutputs([])).toBe(63);
    });

    test('should calculate height based on output count', () => {
      const outputs = [{ id: '1' }, { id: '2' }] as TransformedOutput[];
      expect(calculateNodeHeightBasedOnOutputs(outputs)).toBe(33 * 2 + 63);
    });
  });

  describe('getNextYPositionFromOutputs', () => {
    test('should return 33 for empty outputs', () => {
      expect(getNextYPositionFromOutputs([])).toBe(33);
    });

    test('should calculate next position based on output count', () => {
      const outputs = [{ id: '1' }, { id: '2' }] as TransformedOutput[];
      expect(getNextYPositionFromOutputs(outputs)).toBe(3 * 33);
    });
  });

  describe('buildNodeSubItems', () => {
    test('should return empty array for nodes without subItems', () => {
      const node = { id: 'node1' } as LegacyNode;
      expect(buildNodeSubItems(node)).toEqual([]);
    });

    test('should return empty array for empty subItems', () => {
      const node = { id: 'node1', subItems: [] } as LegacyNode;
      expect(buildNodeSubItems(node)).toEqual([]);
    });

    test('should handle subItems correctly', () => {
      const node: LegacyNode = {
        id: 'node1',
        x: 0,
        y: 0,
        subItems: [
          { id: 'sub1', name: 'SubItem 1', templateId: 1 },
          { id: 'sub2', name: 'SubItem 2', templateId: 2 },
        ],
      };

      const result = buildNodeSubItems(node);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'sub1',
          parentNode: 'node1',
          data: expect.objectContaining({ name: 'SubItem 1' }),
        })
      );
    });

    test('should show "...N more" when subItems exceed MAX_SUBITEMS', () => {
      const MAX = NODE_VALUES.MAX_SUBITEMS;
      const node: LegacyNode = {
        id: 'node1',
        x: 0,
        y: 0,
        subItems: Array.from({ length: MAX + 2 }, (_, i) => ({
          id: `sub${i}`,
          name: `SubItem ${i}`,
          templateId: 1,
        })),
      };

      const result = buildNodeSubItems(node);
      expect(result).toHaveLength(MAX);

      // The "more" label should be on the last returned item
      const expectedMore = `...${node.subItems!.length - MAX + 1} more`;
      expect(result[MAX - 1].data.name).toBe(expectedMore);
    });

    test('should decode HTML entities in subItem names', () => {
      const node: LegacyNode = {
        id: 'node1',
        x: 0,
        y: 0,
        subItems: [{ id: 'sub1', name: 'Test&#39;s &amp; Items' }],
      };

      const result = buildNodeSubItems(node);
      expect(result[0].data.name).toBe("Test's & Items");
    });
  });

  describe('buildNodeOutputs', () => {
    test('should return empty array for nodes without outputs', () => {
      const node = { id: 'node1', x: 0, y: 0 } as LegacyNode;
      expect(buildNodeOutputs(node)).toEqual([]);
    });

    test('should return empty array for empty outputs', () => {
      const node = { id: 'node1', x: 0, y: 0, outputs: [] } as LegacyNode;
      expect(buildNodeOutputs(node)).toEqual([]);
    });

    test('should handle outputs correctly', () => {
      const node: LegacyNode = {
        id: 'node1',
        x: 0,
        y: 0,
        outputs: [
          { id: 'output1', title: 'Output 1', templateId: 1 },
          { id: 'output2', title: 'Output 2', templateId: 2 },
        ],
      };

      const result = buildNodeOutputs(node);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'output1',
          parentNode: 'node1',
          data: expect.objectContaining({ title: 'Output 1' }),
        })
      );
    });

    test('should add output directly if it is a NodeTypeGroup', () => {
      const node: LegacyNode = {
        id: 'node1',
        x: 0,
        y: 0,
        outputs: [
          { id: 'output1', type: 'group', title: 'Group Output', templateId: 1 },
        ],
      };

      const result = buildNodeOutputs(node);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'output1',
          type: 'group',
          templateId: 1,
          title: 'Group Output',
        })
      );
    });

    test('should generate UUID if output.id is missing', () => {
      const node: LegacyNode = {
        id: 'node1',
        x: 0,
        y: 0,
        outputs: [{ title: 'Output without id', templateId: 1 }],
      };

      const result = buildNodeOutputs(node);
      expect(result[0].id).toMatch(/^mock-uuid-/);
    });

    test('should use provided nextYPos when specified', () => {
      const node: LegacyNode = {
        id: 'node1',
        x: 0,
        y: 0,
        outputs: [{ id: 'output1', title: 'Output 1', templateId: 1 }],
      };

      const result = buildNodeOutputs(node, 100);
      expect(result[0].position.y).toBe(100);
    });
  });

  describe('getNodeType', () => {
    test('should return type based on templateClass', () => {
      expect(getNodeType({ id: '1', x: 0, y: 0, templateClass: 'ModFromPolicy' })).toBe('init');
      expect(getNodeType({ id: '1', x: 0, y: 0, templateClass: 'ModNumber' })).toBe('inboundNumber');
      expect(getNodeType({ id: '1', x: 0, y: 0, templateClass: 'ModAction' })).toBe('default');
    });

    test('should return type based on templateId when templateClass not found', () => {
      expect(getNodeType({ id: '1', x: 0, y: 0, templateId: NODE_ID.FROM_POLICY })).toBe('init');
      expect(getNodeType({ id: '1', x: 0, y: 0, templateId: NODE_ID.FINISH })).toBe('end');
    });

    test('should return default for unknown nodes', () => {
      expect(getNodeType({ id: '1', x: 0, y: 0 })).toBe('default');
    });

    test('should return correct type based on connector allowances', () => {
      expect(getNodeType({ 
        id: '1', 
        x: 0, 
        y: 0, 
        inputConnectorsAllowed: true, 
        outputConnectorsAllowed: true 
      })).toBe('default');
    });
  });

  describe('getNodeLabel', () => {
    test('should use title as label', () => {
      expect(getNodeLabel({ id: '1', x: 0, y: 0, title: 'My Title' })).toBe('My Title');
    });

    test('should use name when title not available', () => {
      expect(getNodeLabel({ id: '1', x: 0, y: 0, name: 'My Name' })).toBe('My Name');
    });

    test('should use data.title when available', () => {
      expect(getNodeLabel({ id: '1', x: 0, y: 0, data: { title: 'Data Title' } })).toBe('Data Title');
    });
  });

  describe('transformNode', () => {
    test('should transform a basic node', () => {
      const node: LegacyNode = {
        id: 'test_node',
        x: 100,
        y: 200,
        title: 'Test Node',
        templateClass: 'ModAction',
      };

      const result = transformNode(node);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'test_node',
          type: 'default',
          position: { x: 100, y: 200 },
          data: expect.objectContaining({
            label: 'Test Node',
            title: 'Test Node',
          }),
        })
      );
    });

    test('should enforce minimum position of 30', () => {
      const node: LegacyNode = {
        id: 'test_node',
        x: 0,
        y: 10,
        title: 'Test Node',
      };

      const result = transformNode(node);
      expect(result.position).toEqual({ x: 30, y: 30 });
    });

    test('should calculate height based on subItems', () => {
      const node: LegacyNode = {
        id: 'test_node',
        x: 0,
        y: 0,
        title: 'Test Node',
        subItems: [
          { id: '1', name: 'Sub 1' },
          { id: '2', name: 'Sub 2' },
        ],
      };

      const result = transformNode(node);
      expect(result.height).toBe(33 * 2 + 63);
    });

    test('should set parrentNode.title if node has a title', () => {
      const node: LegacyNode = {
        id: 'node_with_title',
        x: 0,
        y: 0,
        title: 'My Custom Title',
      };

      const result = transformNode(node);
      expect(result.data.title).toBe('My Custom Title');
    });
  });

  describe('transformConnections', () => {
    test('should transform connections to edges', () => {
      const connections: LegacyConnection[] = [
        { source: { nodeID: 'node1', id: 'out1' }, dest: { nodeID: 'node2', id: 'in2' } },
      ];
      const nodes = [
        { id: 'node1', type: 'default', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'default', position: { x: 100, y: 0 }, data: {} },
      ];

      const result = transformConnections(connections, nodes as any);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          source: 'node1',
          target: 'node2',
        })
      );
    });

    test('should use output ID as source when connection comes from output', () => {
      const connections: LegacyConnection[] = [
        { source: { nodeID: 'node1', id: 'output1' }, dest: { nodeID: 'node2', id: 'in2' } },
      ];
      const nodes = [
        { 
          id: 'node1', 
          type: 'default', 
          position: { x: 0, y: 0 }, 
          data: { outputs: [{ id: 'output1' }] } 
        },
        { id: 'node2', type: 'default', position: { x: 100, y: 0 }, data: {} },
      ];

      const result = transformConnections(connections, nodes as any);
      expect(result[0].source).toBe('output1');
    });

    test('should deduplicate edges', () => {
      const connections: LegacyConnection[] = [
        { source: { nodeID: 'node1', id: 'out1' }, dest: { nodeID: 'node2', id: 'in2' } },
        { source: { nodeID: 'node1', id: 'out1' }, dest: { nodeID: 'node2', id: 'in2' } },
      ];
      const nodes = [
        { id: 'node1', type: 'default', position: { x: 0, y: 0 }, data: {} },
        { id: 'node2', type: 'default', position: { x: 100, y: 0 }, data: {} },
      ];

      const result = transformConnections(connections, nodes as any);
      expect(result).toHaveLength(1);
    });

    test('should redirect to finish node when dest matches finishInputId', () => {
      const connections: LegacyConnection[] = [
        { source: { nodeID: 'node1', id: 'out1' }, dest: { nodeID: 'node2', id: 'finish_input' } },
      ];
      const nodes = [
        { id: 'node1', type: 'default', position: { x: 0, y: 0 }, data: {} },
        { id: 'finish_node', type: 'end', position: { x: 100, y: 0 }, data: {} },
      ];

      const result = transformConnections(connections, nodes as any, 'finish_node', 'finish_input');
      expect(result[0].target).toBe('finish_node');
    });
  });

  describe('transformLegacyPolicy', () => {
    test('should return the correct structure for a new policy', () => {
      const result = transformLegacyPolicy(null as any, true);

      expect(result).toEqual(
        expect.objectContaining({
          nodes: expect.arrayContaining([
            expect.objectContaining({
              id: 'init_node',
              type: 'init',
            }),
          ]),
          edges: [],
          navigator: true,
          navigatorPositionIndex: 5,
        })
      );
    });

    test('should transform a simple policy', () => {
      const policy: LegacyPolicy = {
        nodes: [
          {
            id: 'node1',
            x: 100,
            y: 100,
            templateClass: 'ModFromPolicy',
            title: 'From Policy',
            inputConnectorsAllowed: false,
            outputConnectorsAllowed: true,
          },
          {
            id: 'node2',
            x: 300,
            y: 100,
            templateClass: 'ModAction',
            title: 'Action',
            inputConnectorsAllowed: true,
            outputConnectorsAllowed: true,
          },
        ],
        connections: [
          { source: { nodeID: 'node1', id: 'out1' }, dest: { nodeID: 'node2', id: 'in2' } },
        ],
      };

      const result = transformLegacyPolicy(policy);

      expect(result.nodes.length).toBeGreaterThan(2); // init + 2 nodes
      expect(result.edges.length).toBe(1);
      expect(result.navigator).toBe(true);
    });

    test('should use policy.navigator and policy.navigatorPositionIndex if defined', () => {
      const policy: LegacyPolicy = {
        nodes: [],
        connections: [],
        navigator: false,
        navigatorPositionIndex: 0,
      };

      const result = transformLegacyPolicy(policy);

      expect(result.navigator).toBe(false);
      expect(result.navigatorPositionIndex).toBe(0);
    });

    test('should handle nodes with subItems', () => {
      const policy: LegacyPolicy = {
        nodes: [
          {
            id: 'node1',
            x: 100,
            y: 100,
            templateId: NODE_ID.INBOUND_NUMBER,
            title: 'Inbound Numbers',
            inputConnectorsAllowed: false,
            outputConnectorsAllowed: true,
            subItems: [
              { id: 'sub1', name: '+1 555-0100' },
              { id: 'sub2', name: '+1 555-0200' },
            ],
          },
        ],
        connections: [],
      };

      const result = transformLegacyPolicy(policy);

      // Should have init node + main node + 2 subitems
      expect(result.nodes.length).toBeGreaterThanOrEqual(4);
    });

    test('should handle nodes with outputs', () => {
      const policy: LegacyPolicy = {
        nodes: [
          {
            id: 'node1',
            x: 100,
            y: 100,
            templateClass: 'ModAction',
            title: 'Action',
            inputConnectorsAllowed: true,
            outputConnectorsAllowed: true,
            outputs: [
              { id: 'output1', title: 'Speak', templateId: 1 },
              { id: 'output2', title: 'Connect', templateId: 2 },
            ],
          },
        ],
        connections: [],
      };

      const result = transformLegacyPolicy(policy);

      const actionNode = result.nodes.find(n => n.id === 'node1');
      expect(actionNode?.data.outputs).toHaveLength(2);
    });
  });

  describe('NODE_VALUES', () => {
    test('should have expected constants', () => {
      expect(NODE_VALUES.MAX_SUBITEMS).toBe(5);
      expect(NODE_VALUES.MAX_ROUTER_ROUTES).toBe(25);
    });
  });
});

