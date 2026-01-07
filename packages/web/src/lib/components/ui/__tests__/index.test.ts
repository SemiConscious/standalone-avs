/**
 * Tests for UI component barrel exports
 */

import { describe, it, expect } from 'vitest';
import * as UI from '../index';

describe('UI Component Exports', () => {
  it('should export Button component', () => {
    expect(UI.Button).toBeDefined();
  });

  it('should export Card component', () => {
    expect(UI.Card).toBeDefined();
  });

  it('should export Badge component', () => {
    expect(UI.Badge).toBeDefined();
  });

  it('should export Input component', () => {
    expect(UI.Input).toBeDefined();
  });

  it('should export Select component', () => {
    expect(UI.Select).toBeDefined();
  });

  it('should export Modal component', () => {
    expect(UI.Modal).toBeDefined();
  });

  it('should export Toast component', () => {
    expect(UI.Toast).toBeDefined();
  });

  it('should export ToastContainer component', () => {
    expect(UI.ToastContainer).toBeDefined();
  });

  it('should export Avatar component', () => {
    expect(UI.Avatar).toBeDefined();
  });

  it('should export DataTable component', () => {
    expect(UI.DataTable).toBeDefined();
  });

  it('should export Pagination component', () => {
    expect(UI.Pagination).toBeDefined();
  });

  it('should export ThemeToggle component', () => {
    expect(UI.ThemeToggle).toBeDefined();
  });
});

