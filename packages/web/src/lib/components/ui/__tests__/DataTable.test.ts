/**
 * Tests for DataTable Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DataTable from '../DataTable.svelte';

describe('DataTable Component', () => {
  const defaultColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
  ];

  const defaultData = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
  ];

  describe('Rendering', () => {
    it('should render table with columns', () => {
      render(DataTable, { props: { columns: defaultColumns, data: defaultData } });
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render column headers', () => {
      render(DataTable, { props: { columns: defaultColumns, data: defaultData } });
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should render data rows', () => {
      render(DataTable, { props: { columns: defaultColumns, data: defaultData } });
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should render correct number of rows', () => {
      render(DataTable, { props: { columns: defaultColumns, data: defaultData } });
      const rows = screen.getAllByRole('row');
      // 1 header row + 3 data rows
      expect(rows).toHaveLength(4);
    });
  });

  describe('Empty State', () => {
    it('should render default empty message when data is empty', () => {
      render(DataTable, { props: { columns: defaultColumns, data: [] } });
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      render(DataTable, { 
        props: { 
          columns: defaultColumns, 
          data: [], 
          emptyMessage: 'No records found' 
        } 
      });
      expect(screen.getByText('No records found')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      render(DataTable, { props: { columns: defaultColumns, data: [], loading: true } });
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not show data rows when loading', () => {
      render(DataTable, { 
        props: { 
          columns: defaultColumns, 
          data: defaultData, 
          loading: true 
        } 
      });
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should render sortable column headers as buttons', () => {
      const sortableColumns = [
        { key: 'name', label: 'Name', sortable: true },
      ];
      const onSort = vi.fn();
      render(DataTable, { 
        props: { 
          columns: sortableColumns, 
          data: defaultData, 
          onSort 
        } 
      });
      
      const sortButton = screen.getByRole('button', { name: /name/i });
      expect(sortButton).toBeInTheDocument();
    });

    it('should call onSort when sortable column is clicked', async () => {
      const sortableColumns = [
        { key: 'name', label: 'Name', sortable: true },
      ];
      const onSort = vi.fn();
      render(DataTable, { 
        props: { 
          columns: sortableColumns, 
          data: defaultData, 
          onSort 
        } 
      });
      
      await fireEvent.click(screen.getByRole('button', { name: /name/i }));
      expect(onSort).toHaveBeenCalledWith('name');
    });

    it('should not render button for non-sortable columns', () => {
      const mixedColumns = [
        { key: 'id', label: 'ID', sortable: false },
        { key: 'name', label: 'Name', sortable: true },
      ];
      const onSort = vi.fn();
      render(DataTable, { 
        props: { 
          columns: mixedColumns, 
          data: defaultData, 
          onSort 
        } 
      });
      
      // ID should just be text, not a button
      const headers = screen.getAllByRole('columnheader');
      expect(headers[0]).toHaveTextContent('ID');
      // Name should be in a button
      expect(screen.getByRole('button', { name: /name/i })).toBeInTheDocument();
    });

    it('should indicate current sort column and order', () => {
      const sortableColumns = [
        { key: 'name', label: 'Name', sortable: true },
      ];
      const { container } = render(DataTable, { 
        props: { 
          columns: sortableColumns, 
          data: defaultData, 
          onSort: vi.fn(),
          sortBy: 'name',
          sortOrder: 'asc'
        } 
      });
      
      // The ascending chevron should have accent color
      expect(container.querySelector('.text-accent')).toBeInTheDocument();
    });
  });

  describe('Column Width', () => {
    it('should apply custom column width', () => {
      const columnsWithWidth = [
        { key: 'id', label: 'ID', width: '100px' },
      ];
      const { container } = render(DataTable, { 
        props: { columns: columnsWithWidth, data: defaultData } 
      });
      
      const header = container.querySelector('th');
      expect(header).toHaveStyle({ width: '100px' });
    });
  });

  describe('Nested Values', () => {
    it('should access nested object values', () => {
      const nestedColumns = [
        { key: 'user.name', label: 'User Name' },
      ];
      const nestedData = [
        { id: 1, user: { name: 'Nested User' } },
      ];
      render(DataTable, { props: { columns: nestedColumns, data: nestedData } });
      expect(screen.getByText('Nested User')).toBeInTheDocument();
    });
  });

  describe('Row Key', () => {
    it('should use id as default row key', () => {
      render(DataTable, { props: { columns: defaultColumns, data: defaultData } });
      // Should render without errors
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should use custom row key', () => {
      const customKeyData = [
        { customId: 'a', name: 'Item A' },
        { customId: 'b', name: 'Item B' },
      ];
      render(DataTable, { 
        props: { 
          columns: [{ key: 'name', label: 'Name' }], 
          data: customKeyData,
          rowKey: 'customId'
        } 
      });
      expect(screen.getByText('Item A')).toBeInTheDocument();
      expect(screen.getByText('Item B')).toBeInTheDocument();
    });
  });
});

