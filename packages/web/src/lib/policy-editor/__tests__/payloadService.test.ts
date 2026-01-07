/**
 * Tests for PayloadService
 * Ported from natterbox-routing-policies/src/services/payload.service.test.js
 */

import { describe, it, expect, vi } from 'vitest';
import {
  PayloadService,
  processPayloadItems,
  omitOutputLibraryFields,
  omitConnectAndScreenIds,
  updateOutputConfigIfExists,
  ensureInboundNumberItemsTemplateId,
  mapEdgesToConnections,
  filterPayloadNodes,
  mapNodesToPayloadFormat,
  updateOutputVariablesIfExists,
} from '../payloadService';
import { NODE_ID } from '../nodeClassName';

describe('PayloadService', () => {
  describe('processPayloadItems', () => {
    it('returns an array of processed items with updated subItems if nextId is truthy and templateId is not 1', () => {
      const items = [
        { id: '1', templateId: 1, subItems: [] },
        { id: '2', templateId: 2, subItems: [] },
        { id: '3', templateId: 3, subItems: [] },
      ];

      const result = processPayloadItems(items);

      const expectedResult = [
        { id: '1', templateId: 1, subItems: [] },
        { id: '2', templateId: 2, subItems: [] },
        { id: '3', templateId: 3, subItems: [] },
      ];
      expect(result).toEqual(expectedResult);
    });

    it('omits variables.nextId if templateId is 124', () => {
      const items = [
        { id: '1', templateId: 124, variables: { nextId: 'next', other: 'value' } },
        { id: '2', templateId: 2, subItems: [] },
      ];

      const result = processPayloadItems(items);

      expect(result[0].variables).not.toHaveProperty('nextId');
      expect(result[0].variables).toHaveProperty('other', 'value');
    });

    it('returns item if subItems is not an array', () => {
      const items = [{ id: '1', templateId: 1, subItems: null }];

      const result = processPayloadItems(items as any);

      const expectedResult = [{ id: '1', templateId: 1, subItems: null }];
      expect(result).toEqual(expectedResult);
    });

    it('omits parentNode from subItems', () => {
      const items = [
        { id: '1', templateId: 1, subItems: [{ id: 'sub1', parentNode: '1' }] },
      ];

      const result = processPayloadItems(items);

      const expectedResult = [
        { id: '1', templateId: 1, subItems: [{ id: 'sub1' }] },
      ];
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateOutputConfigIfExists', () => {
    it('updates outputConfig with config fields if devOrgId or connectorId is null', () => {
      const outputConfig = { devOrgId: null, connectorId: null };
      const config = {
        DevOrgId__c: 'dev123',
        ConnectorId__c: 'conn123',
      };

      updateOutputConfigIfExists(outputConfig, config);

      expect(outputConfig).toEqual({
        devOrgId: 'dev123',
        connectorId: 'conn123',
      });
    });

    it('does not update if values are already set', () => {
      const outputConfig = { devOrgId: 'existing', connectorId: 'existing' };
      const config = {
        DevOrgId__c: 'dev123',
        ConnectorId__c: 'conn123',
      };

      updateOutputConfigIfExists(outputConfig, config);

      expect(outputConfig).toEqual({
        devOrgId: 'existing',
        connectorId: 'existing',
      });
    });
  });

  describe('ensureInboundNumberItemsTemplateId', () => {
    it('sets templateId to 3 for each subItem and omits parentNode', () => {
      const items = [{ id: 'sub1', parentNode: 'parent' }];
      const result = ensureInboundNumberItemsTemplateId(items as any);

      expect(result).toEqual([{ id: 'sub1', templateId: 3 }]);
    });

    it('handles multiple items', () => {
      const items = [
        { id: 'sub1', parentNode: 'parent', name: 'Item 1' },
        { id: 'sub2', parentNode: 'parent', name: 'Item 2' },
      ];
      const result = ensureInboundNumberItemsTemplateId(items as any);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'sub1', templateId: 3, name: 'Item 1' });
      expect(result[1]).toEqual({ id: 'sub2', templateId: 3, name: 'Item 2' });
    });
  });

  describe('omitConnectAndScreenIds', () => {
    it('omits label and specific fields if title is not in allowed list', () => {
      const node = {
        title: 'Create a Record',
        label: 'label',
        screenId: 1,
        connectId: 2,
      };
      const result = omitConnectAndScreenIds(node);

      expect(result).not.toHaveProperty('label');
      expect(result).not.toHaveProperty('screenId');
      expect(result).not.toHaveProperty('connectId');
    });

    it('does not omit screenId and connectId if title is in the allowed list', () => {
      const node = {
        title: 'Connect a Call',
        label: 'label',
        screenId: 1,
        connectId: 2,
      };
      const result = omitConnectAndScreenIds(node);

      expect(result).toHaveProperty('screenId');
      expect(result).toHaveProperty('connectId');
      expect(result).not.toHaveProperty('label'); // label is always removed
    });

    it('handles Hunt Group title', () => {
      const node = {
        title: 'Hunt Group',
        screenId: 1,
        connectId: 2,
      };
      const result = omitConnectAndScreenIds(node);

      expect(result).toHaveProperty('screenId');
      expect(result).toHaveProperty('connectId');
    });

    it('handles Call Queue title', () => {
      const node = {
        title: 'Call Queue',
        screenId: 1,
        connectId: 2,
      };
      const result = omitConnectAndScreenIds(node);

      expect(result).toHaveProperty('screenId');
      expect(result).toHaveProperty('connectId');
    });
  });

  describe('omitOutputLibraryFields', () => {
    it('omits fields specified in OMIT_FIELDS.LIBRARY', () => {
      const output = {
        id: 'output1',
        position: { x: 0, y: 0 },
        className: 'output',
        sourcePosition: 'source',
        targetPosition: 'target',
        style: { height: 30 },
        label: 'Label',
        draggable: true,
        selectable: true,
      };

      const result = omitOutputLibraryFields(output);

      expect(result).not.toHaveProperty('position');
      expect(result).not.toHaveProperty('sourcePosition');
      expect(result).not.toHaveProperty('targetPosition');
      expect(result).not.toHaveProperty('className');
      expect(result).not.toHaveProperty('style');
      expect(result).not.toHaveProperty('label');
      expect(result).not.toHaveProperty('draggable');
      expect(result).not.toHaveProperty('selectable');
      expect(result).toHaveProperty('id', 'output1');
    });
  });

  describe('mapEdgesToConnections', () => {
    it('returns an array of connections based on the edges', () => {
      const edges = [
        { id: 'e1', source: '1', target: '3' },
        { id: 'e2', source: '2', target: '3' },
      ];

      const nodes = [
        {
          id: '1',
          data: {
            outputs: [{ id: '2', parentNode: '1' }],
            output: { id: 'c1' },
          },
        },
        { id: '2', parentNode: '1', data: {} },
        {
          id: '3',
          data: {
            input: { id: 'c2' },
          },
        },
      ];

      const expectConnections = [
        { source: { id: 'c1', nodeID: '1' }, dest: { id: 'c2', nodeID: '3' } },
        { source: { id: '2', nodeID: '1' }, dest: { id: 'c2', nodeID: '3' } },
      ];

      const result = mapEdgesToConnections(edges, nodes as any);

      expect(result).toEqual(expectConnections);
    });

    it('handles missing nodes gracefully', () => {
      const edges = [{ id: 'e1', source: '1', target: 'nonexistent' }];
      const nodes = [{ id: '1', data: {} }];

      const result = mapEdgesToConnections(edges, nodes as any);

      expect(result).toHaveLength(0);
    });

    it('handles group parent nodes', () => {
      const edges = [{ id: 'e1', source: '2', target: '3' }];

      const nodes = [
        { id: '1', parentNode: undefined, data: {} },
        { id: 'group1', type: 'group', parentNode: '1', data: {} },
        { id: '2', parentNode: 'group1', data: {} },
        { id: '3', data: { input: { id: 'c2' } } },
      ];

      const result = mapEdgesToConnections(edges, nodes as any);

      expect(result).toHaveLength(1);
      // Source nodeID should be the grandparent (1) since group1 is a group
      expect(result[0].source.nodeID).toBe('1');
    });
  });

  describe('filterPayloadNodes', () => {
    it('should filter nodes correctly based on SYSTEM type', () => {
      const nodes = [
        { templateId: 999, data: { type: 'SYSTEM' } },
        { templateId: 999, data: { type: 'USER' } },
      ];
      const filteredNodes = filterPayloadNodes(nodes as any);
      
      expect(filteredNodes).toHaveLength(1);
      expect(filteredNodes[0].data?.type).toBe('SYSTEM');
    });

    it('should filter nodes correctly based on accepted templateIds', () => {
      const nodes = [
        { templateId: NODE_ID.ACTION, data: { type: 'USER' } },
        { templateId: NODE_ID.FINISH, data: { type: 'USER' } },
        { templateId: 999, data: { type: 'USER' } },
      ];
      const filteredNodes = filterPayloadNodes(nodes as any);
      
      expect(filteredNodes).toHaveLength(2);
    });
  });

  describe('mapNodesToPayloadFormat', () => {
    it('should map nodes to payload format correctly', () => {
      const nodes = [
        {
          id: '1',
          templateId: NODE_ID.EXTENSION_NUMBER,
          data: { type: 'USER', templateClass: 'class1' },
          position: { x: 0, y: 0 },
        },
        {
          id: '2',
          templateId: NODE_ID.ACTION,
          data: { type: 'SYSTEM' },
          position: { x: 10, y: 10 },
        },
      ];
      const config = { DevOrgId__c: 'devOrgId', ConnectorId__c: 'connectorId' };
      const policyType = 'CALL';
      
      const mappedNodes = mapNodesToPayloadFormat({
        nodes: nodes as any,
        config,
        policyType,
      });
      
      expect(mappedNodes).toHaveLength(2);
      expect(mappedNodes[0]).toMatchObject({
        templateId: NODE_ID.EXTENSION_NUMBER,
        id: '1',
        x: 0,
        y: 0,
      });
      expect(mappedNodes[0]).toHaveProperty('parentId');
    });

    it('should exclude Inbound Number nodes without templateClass', () => {
      const nodes = [
        {
          id: '1',
          templateId: NODE_ID.INBOUND_NUMBER,
          data: { type: 'USER' }, // No templateClass
          position: { x: 0, y: 0 },
        },
      ];
      const config = { DevOrgId__c: 'devOrgId', ConnectorId__c: 'connectorId' };
      const policyType = 'CALL';
      
      const mappedNodes = mapNodesToPayloadFormat({
        nodes: nodes as any,
        config,
        policyType,
      });
      
      expect(mappedNodes).toHaveLength(0);
    });

    it('should handle nodes with outputs correctly', () => {
      const nodes = [
        {
          id: '1',
          templateId: NODE_ID.ACTION,
          data: {
            type: 'SYSTEM',
            outputs: [
              { type: 'group' },
              {
                type: 'output',
                data: { name: 'outputName' },
                connectedTo: 'connectedNode',
              },
            ],
          },
          position: { x: 0, y: 0 },
        },
      ];
      const config = { DevOrgId__c: 'devOrgId', ConnectorId__c: 'connectorId' };
      const policyType = 'CALL';
      
      const mappedNodes = mapNodesToPayloadFormat({
        nodes: nodes as any,
        config,
        policyType,
      });
      
      expect(mappedNodes).toHaveLength(1);
      expect(mappedNodes[0].outputs).toHaveLength(2);
      // Group output keeps its type
      expect(mappedNodes[0].outputs?.[0].type).toBe('group');
      // Other outputs get policy type
      expect(mappedNodes[0].outputs?.[1].type).toBe('CALL');
    });

    it('should handle Inbound Number nodes with subItems correctly', () => {
      const nodes = [
        {
          id: '1',
          templateId: NODE_ID.INBOUND_NUMBER,
          data: {
            type: 'USER',
            templateClass: 'class1',
            subItems: [{ id: 'sub1', parentNode: '1' }],
          },
          position: { x: 0, y: 0 },
        },
      ];
      const config = { DevOrgId__c: 'devOrgId', ConnectorId__c: 'connectorId' };
      const policyType = 'CALL';
      
      const mappedNodes = mapNodesToPayloadFormat({
        nodes: nodes as any,
        config,
        policyType,
      });
      
      expect(mappedNodes).toHaveLength(1);
      expect(mappedNodes[0].subItems).toEqual([{ id: 'sub1', templateId: 3 }]);
    });
  });

  describe('updateOutputVariablesIfExists', () => {
    it('should not update script variable if title is "Rule"', () => {
      const output = {
        id: 'output1',
        title: 'Rule',
        variables: { script: 'oldScript' },
      };
      
      updateOutputVariablesIfExists(output as any);
      
      expect(output.variables.script).toBe('oldScript');
    });

    it('should not throw error if variables is undefined', () => {
      const output = {
        id: 'output1',
        title: 'Some Title',
      };
      
      expect(() => updateOutputVariablesIfExists(output as any)).not.toThrow();
    });
  });
});

