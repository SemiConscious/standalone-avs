/**
 * Tests for nodeClassName utilities
 * Ported from natterbox-routing-policies/src/services/nodeClassName.service.test.js
 */

import { describe, test, expect } from 'vitest';
import {
  getBaseNodeClassNameByTemplateId,
  getNodeClassName,
  getLegacyNodeClassName,
  manageNodeClassName,
  mapTemplateClassToNodeType,
  mapTemplateIdToNodeType,
  classNameToNodeType,
  nodeTypeColors,
  NODE_ID,
} from '../nodeClassName';

describe('nodeClassName utilities', () => {
  describe('manageNodeClassName', () => {
    test('should return the node unchanged if it does not have a className property', () => {
      const node = { id: '1' };
      const className = 'test-class';
      const result = manageNodeClassName(node, className, false);
      expect(result).toEqual(node);
    });

    test('should add a class name to the node', () => {
      const node = { id: '1', className: 'initial-class' };
      const className = 'new-class';
      const result = manageNodeClassName(node, className, false);
      expect(result.className).toBe('initial-class new-class');
    });

    test('should remove a class name from the node', () => {
      const node = { id: '1', className: 'initial-class new-class' };
      const className = 'new-class';
      const result = manageNodeClassName(node, className, true);
      expect(result.className).toBe('initial-class');
    });

    test('should prevent class name duplication', () => {
      const node = { id: '1', className: 'initial-class new-class' };
      const className = 'new-class';
      const result = manageNodeClassName(node, className, false);
      expect(result.className).toBe('initial-class new-class');
    });

    test('should handle empty className', () => {
      const node = { id: '1', className: '' };
      const className = 'new-class';
      const result = manageNodeClassName(node, className, false);
      expect(result.className).toBe('new-class');
    });
  });

  describe('getBaseNodeClassNameByTemplateId', () => {
    test('should return the correct class name for a known templateId', () => {
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.FROM_POLICY)).toBe('from_policy_node');
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.DA_ACTION)).toBe('action_node');
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.ACTION)).toBe('action_node');
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.INBOUND_NUMBER)).toBe('inbound_numbers_node');
    });

    test('should return an empty string for an unknown templateId', () => {
      expect(getBaseNodeClassNameByTemplateId(999)).toBe('');
    });

    test('should return an empty string for undefined', () => {
      expect(getBaseNodeClassNameByTemplateId(undefined)).toBe('');
    });

    test('should return correct class names for special node types', () => {
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.NATTERBOX_AI)).toBe('natterbox_ai');
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.OMNI_CHANNEL_FLOW)).toBe('omniChannelFlow_node');
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.SWITCHBOARD)).toBe('switchboard_node');
      expect(getBaseNodeClassNameByTemplateId(NODE_ID.FINISH)).toBe('finish_node');
    });
  });

  describe('getNodeClassName', () => {
    test('should include "parent_node" if withParentClass is true', () => {
      const node = { templateId: NODE_ID.FROM_POLICY };
      const result = getNodeClassName(node, true);
      expect(result).toBe('parent_node from_policy_node');
    });

    test('should not include "parent_node" if withParentClass is false', () => {
      const node = { templateId: NODE_ID.FROM_POLICY };
      const result = getNodeClassName(node, false);
      expect(result).toBe('from_policy_node');
    });

    test('should not include "parent_node" for group type nodes', () => {
      const node = { templateId: NODE_ID.FROM_POLICY, type: 'group' };
      const result = getNodeClassName(node, true);
      expect(result).toBe('from_policy_node');
    });

    test('should handle nodes with unknown templateId', () => {
      const node = { templateId: 999 };
      const result = getNodeClassName(node, true);
      expect(result).toBe('parent_node');
    });
  });

  describe('getLegacyNodeClassName', () => {
    test('should return the correct legacy class name including default and node class names', () => {
      const node = {
        templateId: NODE_ID.FROM_POLICY,
        className: 'legacy-class',
        parentId: undefined,
        data: { outputs: [] },
      };
      const result = getLegacyNodeClassName(node);
      expect(result).toBe('legacy-class parent_node from_policy_node');
    });

    test('should handle nodes without parentId and outputs correctly', () => {
      const node = {
        templateId: NODE_ID.FROM_POLICY,
        className: 'legacy-class',
        data: { outputs: [] },
      };
      const result = getLegacyNodeClassName(node);
      expect(result).toBe('legacy-class parent_node from_policy_node');
    });

    test('should handle nodes with a parentId correctly', () => {
      const node = {
        templateId: NODE_ID.FROM_POLICY,
        className: 'legacy-class',
        parentId: '1',
        data: { outputs: [] },
      };
      const result = getLegacyNodeClassName(node);
      expect(result).toBe('legacy-class from_policy_node');
    });

    test('should deduplicate class names', () => {
      const node = {
        templateId: NODE_ID.FROM_POLICY,
        className: 'from_policy_node legacy-class',
        parentId: undefined,
        data: { outputs: [] },
      };
      const result = getLegacyNodeClassName(node);
      expect(result).toBe('from_policy_node legacy-class parent_node');
    });
  });

  describe('mapTemplateClassToNodeType', () => {
    test('should map known template classes to node types', () => {
      expect(mapTemplateClassToNodeType('ModFromPolicy')).toBe('init');
      expect(mapTemplateClassToNodeType('ModNumber')).toBe('inboundNumber');
      expect(mapTemplateClassToNodeType('ModAction')).toBe('default');
      expect(mapTemplateClassToNodeType('ModAction_Say')).toBe('speak');
      expect(mapTemplateClassToNodeType('ModConnect')).toBe('connectCall');
      expect(mapTemplateClassToNodeType('ModVoicemail')).toBe('voicemail');
      expect(mapTemplateClassToNodeType('ModHuntGroup')).toBe('huntGroup');
      expect(mapTemplateClassToNodeType('ModCallQueue')).toBe('callQueue');
      expect(mapTemplateClassToNodeType('ModRule')).toBe('rule');
    });

    test('should return default for unknown template classes', () => {
      expect(mapTemplateClassToNodeType('UnknownClass')).toBe('default');
      expect(mapTemplateClassToNodeType(undefined)).toBe('default');
    });
  });

  describe('mapTemplateIdToNodeType', () => {
    test('should map known template IDs to node types', () => {
      expect(mapTemplateIdToNodeType(NODE_ID.FROM_POLICY)).toBe('init');
      expect(mapTemplateIdToNodeType(NODE_ID.INBOUND_NUMBER)).toBe('inboundNumber');
      expect(mapTemplateIdToNodeType(NODE_ID.ACTION)).toBe('default');
      expect(mapTemplateIdToNodeType(NODE_ID.NATTERBOX_AI)).toBe('natterboxAI');
      expect(mapTemplateIdToNodeType(NODE_ID.FINISH)).toBe('end');
    });

    test('should return default for unknown template IDs', () => {
      expect(mapTemplateIdToNodeType(999)).toBe('default');
      expect(mapTemplateIdToNodeType(undefined)).toBe('default');
    });
  });

  describe('classNameToNodeType', () => {
    test('should contain expected mappings', () => {
      expect(classNameToNodeType['from_policy_node']).toBe('init');
      expect(classNameToNodeType['inbound_numbers_node']).toBe('inboundNumber');
      expect(classNameToNodeType['action_node']).toBe('default');
      expect(classNameToNodeType['finish_node']).toBe('end');
      expect(classNameToNodeType['natterbox_ai']).toBe('natterboxAI');
    });
  });

  describe('nodeTypeColors', () => {
    test('should contain expected color configurations', () => {
      expect(nodeTypeColors['action_node']).toEqual({
        headerColor: '#2ecbbf',
        footerColor: '#96e5df',
      });
      expect(nodeTypeColors['from_policy_node']).toEqual({
        headerColor: '#963cbd',
        footerColor: '#cf92ef',
      });
      expect(nodeTypeColors['finish_node']).toEqual({
        headerColor: '#666666',
        footerColor: '#999999',
      });
    });

    test('should have default colors', () => {
      expect(nodeTypeColors['default']).toBeDefined();
      expect(nodeTypeColors['default'].headerColor).toBe('#4f6a92');
    });
  });

  describe('NODE_ID constants', () => {
    test('should have expected node IDs', () => {
      expect(NODE_ID.FROM_POLICY).toBe(2);
      expect(NODE_ID.INBOUND_NUMBER).toBe(3);
      expect(NODE_ID.ACTION).toBe(4);
      expect(NODE_ID.FINISH).toBe(23);
      expect(NODE_ID.NATTERBOX_AI).toBe(145);
    });
  });
});

