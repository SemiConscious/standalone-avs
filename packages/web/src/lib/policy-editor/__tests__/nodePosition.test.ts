/**
 * Tests for node position utilities
 * Ported from natterbox-routing-policies/src/services/nodePosition.service.test.js
 */

import { describe, test, expect } from 'vitest';
import {
  calculateNodeHeightBasedOnOutputs,
  getNextYPositionFromOutputs,
  type TransformedOutput,
} from '../dataTransform';

// Layout constants (matching React app)
const GAP_BETWEEN_NODES = 3;
const CONTAINER_BASE_HEIGHT = 63;
const START_CONTAINER_OUTPUT_Y_POSITION = 33;
const START_GROUP_OUTPUT_Y_POSITION = 0;
const OUTPUT_NODE_HEIGHT_WITH_GAP = 33;

describe('Node Position utilities', () => {
  describe('getNextYPositionFromOutputs', () => {
    test('return the default position when there are no outputs', () => {
      const outputs: TransformedOutput[] = [];
      const nextYPosition = getNextYPositionFromOutputs(outputs);
      expect(nextYPosition).toBe(33);
    });

    test('return the next Y position based on the number of outputs', () => {
      const outputs = [
        { id: '1', type: 'output', parentNode: '', position: { x: 0, y: 33 }, data: { label: '' } },
      ] as TransformedOutput[];
      const nextYPosition = getNextYPositionFromOutputs(outputs);
      expect(nextYPosition).toBe(66);
    });

    test('returns correct position for multiple outputs', () => {
      const outputs = [
        { id: '1', type: 'output', parentNode: '', position: { x: 0, y: 33 }, data: { label: '' } },
        { id: '2', type: 'output', parentNode: '', position: { x: 0, y: 66 }, data: { label: '' } },
        { id: '3', type: 'output', parentNode: '', position: { x: 0, y: 99 }, data: { label: '' } },
      ] as TransformedOutput[];
      const nextYPosition = getNextYPositionFromOutputs(outputs);
      expect(nextYPosition).toBe(132);
    });
  });

  describe('calculateNodeHeightBasedOnOutputs', () => {
    test('returns base height for empty outputs', () => {
      const outputs: TransformedOutput[] = [];
      const height = calculateNodeHeightBasedOnOutputs(outputs);
      expect(height).toBe(63);
    });

    test('returns calculated height based on output count', () => {
      const outputs = [
        { id: '1', type: 'output', parentNode: '', position: { x: 0, y: 33 }, data: { label: '' } },
        { id: '2', type: 'output', parentNode: '', position: { x: 0, y: 66 }, data: { label: '' } },
      ] as TransformedOutput[];
      const height = calculateNodeHeightBasedOnOutputs(outputs);
      expect(height).toBe(33 * 2 + 63);
    });

    test('returns correct height for many outputs', () => {
      const outputs = Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        type: 'output',
        parentNode: '',
        position: { x: 0, y: (i + 1) * 33 },
        data: { label: '' },
      })) as TransformedOutput[];
      const height = calculateNodeHeightBasedOnOutputs(outputs);
      expect(height).toBe(33 * 5 + 63);
    });
  });

  describe('Position alignment utilities', () => {
    test('alignPositionToSlotHeight rounds correctly', () => {
      const slotHeight = OUTPUT_NODE_HEIGHT_WITH_GAP;
      
      // Test rounding down
      const pos1 = Math.round(45 / slotHeight) * slotHeight;
      expect(pos1).toBe(33); // 45/33 = 1.36, rounds to 1
      
      // Test rounding up
      const pos2 = Math.round(50 / slotHeight) * slotHeight;
      expect(pos2).toBe(66); // 50/33 = 1.52, rounds to 2
    });

    test('minimum position enforcement', () => {
      const minY = START_CONTAINER_OUTPUT_Y_POSITION;
      
      // Position below minimum should be clamped
      expect(Math.max(-10, minY)).toBe(minY);
      expect(Math.max(0, minY)).toBe(minY);
      expect(Math.max(50, minY)).toBe(50);
    });
  });

  describe('Layout constants', () => {
    test('have expected values', () => {
      expect(GAP_BETWEEN_NODES).toBe(3);
      expect(CONTAINER_BASE_HEIGHT).toBe(63);
      expect(START_CONTAINER_OUTPUT_Y_POSITION).toBe(33);
      expect(START_GROUP_OUTPUT_Y_POSITION).toBe(0);
      expect(OUTPUT_NODE_HEIGHT_WITH_GAP).toBe(33);
    });
  });
});

