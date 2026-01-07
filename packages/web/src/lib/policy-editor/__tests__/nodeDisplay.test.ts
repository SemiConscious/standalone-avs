/**
 * Tests for nodeDisplay utilities
 * Ported from natterbox-routing-policies/src/utils/nodeDisplay.test.js
 */

import { describe, test, expect } from 'vitest';
import {
  getNodeDisplayTitle,
  getNodeDisplayDescription,
  getNodeDisplayPlaceholder,
  decodeHtmlEntities,
  NODE_DISPLAY_INFO,
} from '../nodeDisplay';

describe('nodeDisplay utilities', () => {
  describe('getNodeDisplayTitle', () => {
    test('returns override title when available in NODE_DISPLAY_INFO', () => {
      const node = { title: 'Router' };
      expect(getNodeDisplayTitle(node)).toBe('Router');
    });

    test('falls back to node.data.title when no override title exists', () => {
      const node = {
        title: 'Route',
        data: { title: 'Custom Route Title' },
      };
      expect(getNodeDisplayTitle(node)).toBe('Custom Route Title');
    });

    test('falls back to node.title when no override or data.title exists', () => {
      const node = { title: 'Unknown Node' };
      expect(getNodeDisplayTitle(node)).toBe('Unknown Node');
    });

    test('handles node with no title property', () => {
      const node = { data: { title: 'Data Title' } };
      expect(getNodeDisplayTitle(node)).toBe('Data Title');
    });

    test('returns "Node" for empty node', () => {
      const node = {};
      expect(getNodeDisplayTitle(node)).toBe('Node');
    });

    test('prefers data.name when data.title is not available', () => {
      const node = { data: { name: 'Node Name' } };
      expect(getNodeDisplayTitle(node)).toBe('Node Name');
    });

    test('prefers node.name when node.title is not available', () => {
      const node = { name: 'My Node' };
      expect(getNodeDisplayTitle(node)).toBe('My Node');
    });
  });

  describe('getNodeDisplayDescription', () => {
    test('returns override description when available in NODE_DISPLAY_INFO', () => {
      const node = {
        title: 'Router',
        data: { description: 'Original description' },
      };
      expect(getNodeDisplayDescription(node)).toBe(
        'Uses AI to make routing decisions based on customer inquiries.'
      );
    });

    test('returns override description for nodes with partial overrides', () => {
      const node = {
        title: 'Route',
        data: { description: 'Original route description' },
      };
      expect(getNodeDisplayDescription(node)).toBe('AI-Powered Route Selector');
    });

    test('falls back to node.data.description when no override exists', () => {
      const node = {
        title: 'Unknown Node',
        data: { description: 'Custom description' },
      };
      expect(getNodeDisplayDescription(node)).toBe('Custom description');
    });

    test('handles undefined node.data.description', () => {
      const node = { title: 'Unknown', data: {} };
      expect(getNodeDisplayDescription(node)).toBeUndefined();
    });

    test('returns description for common node types', () => {
      expect(getNodeDisplayDescription({ title: 'Voicemail' })).toBe(
        'AI-powered voicemail with smart notifications'
      );
      expect(getNodeDisplayDescription({ title: 'Human Escalation' })).toBe(
        'Establish a route for the AI to escalate to a human.'
      );
      expect(getNodeDisplayDescription({ title: 'Knowledge' })).toBe(
        'Use AI to Answer Questions from a Knowledgebase'
      );
    });
  });

  describe('getNodeDisplayPlaceholder', () => {
    test('returns override placeholder when available in NODE_DISPLAY_INFO', () => {
      expect(getNodeDisplayPlaceholder('Router')).toBe('e.g. Main Switchboard');
    });

    test('returns override placeholder for nodes with specific placeholders', () => {
      expect(getNodeDisplayPlaceholder('Response')).toBe(
        'e.g. Read out terms and conditions'
      );
      expect(getNodeDisplayPlaceholder('Get Info')).toBe(
        'e.g. Get booking reference'
      );
    });

    test('falls back to default placeholder when no override exists', () => {
      expect(getNodeDisplayPlaceholder('Route')).toBe('enter name');
      expect(getNodeDisplayPlaceholder('Human Escalation')).toBe('enter name');
    });

    test('handles unknown node titles', () => {
      expect(getNodeDisplayPlaceholder('Unknown Node')).toBe('enter name');
    });

    test('handles undefined input', () => {
      expect(getNodeDisplayPlaceholder(undefined)).toBe('enter name');
    });
  });

  describe('decodeHtmlEntities', () => {
    test('decodes single quotes', () => {
      expect(decodeHtmlEntities("It&#39;s working")).toBe("It's working");
      expect(decodeHtmlEntities("It&apos;s working")).toBe("It's working");
    });

    test('decodes double quotes', () => {
      expect(decodeHtmlEntities("Say &quot;hello&quot;")).toBe('Say "hello"');
    });

    test('decodes less than and greater than', () => {
      expect(decodeHtmlEntities("&lt;div&gt;")).toBe("<div>");
    });

    test('handles multiple entities', () => {
      expect(decodeHtmlEntities("&lt;p&gt;It&#39;s &quot;great&quot;&lt;/p&gt;")).toBe(
        '<p>It\'s "great"</p>'
      );
    });

    test('returns unchanged string when no entities present', () => {
      expect(decodeHtmlEntities("Hello World")).toBe("Hello World");
    });
  });

  describe('NODE_DISPLAY_INFO', () => {
    test('contains expected node types', () => {
      expect(NODE_DISPLAY_INFO).toHaveProperty('Router');
      expect(NODE_DISPLAY_INFO).toHaveProperty('Route');
      expect(NODE_DISPLAY_INFO).toHaveProperty('Response');
      expect(NODE_DISPLAY_INFO).toHaveProperty('Get Info');
      expect(NODE_DISPLAY_INFO).toHaveProperty('Knowledge');
      expect(NODE_DISPLAY_INFO).toHaveProperty('Persona');
      expect(NODE_DISPLAY_INFO).toHaveProperty('Voicemail');
      expect(NODE_DISPLAY_INFO).toHaveProperty('Agent');
    });

    test('Router has correct properties', () => {
      expect(NODE_DISPLAY_INFO['Router']).toEqual({
        placeholder: 'e.g. Main Switchboard',
        description: 'Uses AI to make routing decisions based on customer inquiries.',
      });
    });

    test('Route has description override', () => {
      expect(NODE_DISPLAY_INFO['Route']).toEqual({
        description: 'AI-Powered Route Selector',
      });
    });
  });
});

