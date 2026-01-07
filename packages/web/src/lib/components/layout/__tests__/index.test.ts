/**
 * Tests for layout component barrel exports
 */

import { describe, it, expect } from 'vitest';
import * as Layout from '../index';

describe('Layout Component Exports', () => {
  it('should export Header component', () => {
    expect(Layout.Header).toBeDefined();
  });

  it('should export Sidebar component', () => {
    expect(Layout.Sidebar).toBeDefined();
  });
});

