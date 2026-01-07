/**
 * Tests for Routing Policies Page Component
 * Tests the policy list table rendering, search, filtering, and actions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Page from '../+page.svelte';

// Mock data
const mockPolicies = [
  {
    id: 'policy-1',
    name: 'Sales Inbound Policy',
    description: 'Routes sales calls to the sales team',
    source: 'Inbound',
    type: 'Call',
    status: 'Enabled',
    phoneNumbers: ['+1234567890', '+0987654321'],
    createdByName: 'John Doe',
    lastModifiedDate: new Date().toISOString(),
  },
  {
    id: 'policy-2',
    name: 'Support Queue Policy',
    description: 'Handles support queue routing',
    source: 'System',
    type: 'Call',
    status: 'Disabled',
    phoneNumbers: [],
    createdByName: 'Jane Smith',
    lastModifiedDate: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
  },
  {
    id: 'policy-3',
    name: 'Digital Channel Policy',
    description: 'Routes digital messages',
    source: 'Inbound',
    type: 'Digital',
    status: 'Enabled',
    phoneNumbers: ['+1112223333'],
    createdByName: 'Bob Wilson',
    lastModifiedDate: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
  },
];

const defaultProps = {
  data: {
    policies: mockPolicies,
    isDemo: false,
    totalCount: mockPolicies.length,
  },
  form: null,
};

// Mock fetch for form actions
vi.stubGlobal('fetch', vi.fn());

describe('Routing Policies Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the page title', () => {
      render(Page, { props: defaultProps });
      expect(screen.getByRole('heading', { name: /routing policies/i })).toBeInTheDocument();
    });

    it('should render the total count', () => {
      render(Page, { props: defaultProps });
      expect(screen.getByText(/3 total/i)).toBeInTheDocument();
    });

    it('should render all policies in the table', () => {
      render(Page, { props: defaultProps });
      
      expect(screen.getByText('Sales Inbound Policy')).toBeInTheDocument();
      expect(screen.getByText('Support Queue Policy')).toBeInTheDocument();
      expect(screen.getByText('Digital Channel Policy')).toBeInTheDocument();
    });

    it('should render Edit links for each policy', () => {
      render(Page, { props: defaultProps });
      
      const editLinks = screen.getAllByText('Edit');
      expect(editLinks).toHaveLength(mockPolicies.length);
      
      // Check that links have correct href
      const firstEditLink = editLinks[0].closest('a');
      expect(firstEditLink).toHaveAttribute('href', '/policy-editor/policy-1');
    });

    it('should render phone numbers', () => {
      render(Page, { props: defaultProps });
      
      // First policy has 2 phone numbers
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('+0987654321')).toBeInTheDocument();
    });
  });

  describe('Demo Mode', () => {
    it('should show demo mode banner when isDemo is true', () => {
      render(Page, { 
        props: {
          ...defaultProps,
          data: { ...defaultProps.data, isDemo: true },
        },
      });
      
      expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    });

    it('should disable New Policy button in demo mode', () => {
      render(Page, { 
        props: {
          ...defaultProps,
          data: { ...defaultProps.data, isDemo: true },
        },
      });
      
      const newPolicyButton = screen.getByRole('button', { name: /new policy/i });
      expect(newPolicyButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should show error banner when error is present', () => {
      render(Page, { 
        props: {
          ...defaultProps,
          data: { ...defaultProps.data, error: 'Failed to load policies' },
        },
      });
      
      expect(screen.getByText('Failed to load policies')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('should filter policies by search query (name)', async () => {
      render(Page, { props: defaultProps });
      
      const searchInput = screen.getByPlaceholderText(/search policies/i);
      await fireEvent.input(searchInput, { target: { value: 'Sales' } });
      
      // Only Sales policy should be visible
      expect(screen.getByText('Sales Inbound Policy')).toBeInTheDocument();
      expect(screen.queryByText('Support Queue Policy')).not.toBeInTheDocument();
      expect(screen.queryByText('Digital Channel Policy')).not.toBeInTheDocument();
    });

    it('should filter policies by search query (description)', async () => {
      render(Page, { props: defaultProps });
      
      const searchInput = screen.getByPlaceholderText(/search policies/i);
      await fireEvent.input(searchInput, { target: { value: 'digital messages' } });
      
      expect(screen.queryByText('Sales Inbound Policy')).not.toBeInTheDocument();
      expect(screen.getByText('Digital Channel Policy')).toBeInTheDocument();
    });

    it('should filter policies by search query (phone number)', async () => {
      render(Page, { props: defaultProps });
      
      const searchInput = screen.getByPlaceholderText(/search policies/i);
      await fireEvent.input(searchInput, { target: { value: '+1234567890' } });
      
      expect(screen.getByText('Sales Inbound Policy')).toBeInTheDocument();
      expect(screen.queryByText('Support Queue Policy')).not.toBeInTheDocument();
    });

    it('should filter policies by source', async () => {
      render(Page, { props: defaultProps });
      
      const sourceSelect = screen.getAllByRole('combobox')[0];
      await fireEvent.change(sourceSelect, { target: { value: 'Inbound' } });
      
      expect(screen.getByText('Sales Inbound Policy')).toBeInTheDocument();
      expect(screen.getByText('Digital Channel Policy')).toBeInTheDocument();
      expect(screen.queryByText('Support Queue Policy')).not.toBeInTheDocument();
    });

    it('should filter policies by status', async () => {
      render(Page, { props: defaultProps });
      
      const statusSelect = screen.getAllByRole('combobox')[1];
      await fireEvent.change(statusSelect, { target: { value: 'Disabled' } });
      
      expect(screen.queryByText('Sales Inbound Policy')).not.toBeInTheDocument();
      expect(screen.getByText('Support Queue Policy')).toBeInTheDocument();
    });

    it('should show empty state when no policies match search', async () => {
      render(Page, { props: defaultProps });
      
      const searchInput = screen.getByPlaceholderText(/search policies/i);
      await fireEvent.input(searchInput, { target: { value: 'nonexistent policy xyz' } });
      
      expect(screen.getByText(/no routing policies found matching your search/i)).toBeInTheDocument();
    });
  });

  describe('Column Visibility', () => {
    it('should toggle column selector dropdown', async () => {
      render(Page, { props: defaultProps });
      
      const columnsButton = screen.getByRole('button', { name: /columns/i });
      await fireEvent.click(columnsButton);
      
      expect(screen.getByText(/toggle columns/i)).toBeInTheDocument();
    });

    it('should toggle column visibility', async () => {
      render(Page, { props: defaultProps });
      
      // Initially description column should be hidden
      expect(screen.queryByRole('columnheader', { name: 'Description' })).not.toBeInTheDocument();
      
      // Open column selector
      const columnsButton = screen.getByRole('button', { name: /columns/i });
      await fireEvent.click(columnsButton);
      
      // Toggle description column on
      const descriptionCheckbox = screen.getByLabelText('Description');
      await fireEvent.click(descriptionCheckbox);
      
      // Now description column should be visible
      expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    });
  });

  describe('Delete Action', () => {
    it('should show delete confirmation when Del is clicked', async () => {
      render(Page, { props: defaultProps });
      
      const deleteButtons = screen.getAllByText('Del');
      await fireEvent.click(deleteButtons[0]);
      
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should hide confirmation when Cancel is clicked', async () => {
      render(Page, { props: defaultProps });
      
      const deleteButtons = screen.getAllByText('Del');
      await fireEvent.click(deleteButtons[0]);
      
      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);
      
      // Should go back to showing Del
      expect(screen.getAllByText('Del')).toHaveLength(mockPolicies.length);
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });

    it('should call delete endpoint when Confirm is clicked', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal('fetch', mockFetch);
      
      render(Page, { props: defaultProps });
      
      const deleteButtons = screen.getAllByText('Del');
      await fireEvent.click(deleteButtons[0]);
      
      const confirmButton = screen.getByText('Confirm');
      await fireEvent.click(confirmButton);
      
      expect(mockFetch).toHaveBeenCalledWith(
        '?/delete',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Toggle Status', () => {
    it('should show Enable for disabled policies', () => {
      render(Page, { props: defaultProps });
      
      // Support Queue Policy is disabled, should show Enable
      expect(screen.getByText('Enable')).toBeInTheDocument();
    });

    it('should show Disable for enabled policies', () => {
      render(Page, { props: defaultProps });
      
      // There are 2 enabled policies
      const disableButtons = screen.getAllByText('Disable');
      expect(disableButtons).toHaveLength(2);
    });
  });

  describe('Create Policy Modal', () => {
    it('should open create modal when New Policy is clicked', async () => {
      render(Page, { props: defaultProps });
      
      const newPolicyButton = screen.getByRole('button', { name: /new policy/i });
      await fireEvent.click(newPolicyButton);
      
      expect(screen.getByText('Create New Policy')).toBeInTheDocument();
      expect(screen.getByLabelText(/policy name/i)).toBeInTheDocument();
    });

    it('should close modal when Cancel is clicked', async () => {
      render(Page, { props: defaultProps });
      
      const newPolicyButton = screen.getByRole('button', { name: /new policy/i });
      await fireEvent.click(newPolicyButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Create New Policy')).not.toBeInTheDocument();
    });

    it('should disable Create button when name is empty', async () => {
      render(Page, { props: defaultProps });
      
      const newPolicyButton = screen.getByRole('button', { name: /new policy/i });
      await fireEvent.click(newPolicyButton);
      
      const createButton = screen.getByRole('button', { name: /create policy/i });
      expect(createButton).toBeDisabled();
    });

    it('should enable Create button when name is entered', async () => {
      render(Page, { props: defaultProps });
      
      const newPolicyButton = screen.getByRole('button', { name: /new policy/i });
      await fireEvent.click(newPolicyButton);
      
      const nameInput = screen.getByLabelText(/policy name/i);
      await fireEvent.input(nameInput, { target: { value: 'New Test Policy' } });
      
      const createButton = screen.getByRole('button', { name: /create policy/i });
      expect(createButton).not.toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no policies exist', () => {
      render(Page, { 
        props: {
          ...defaultProps,
          data: { policies: [], isDemo: false, totalCount: 0 },
        },
      });
      
      expect(screen.getByText(/no routing policies found/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination info', () => {
      render(Page, { props: defaultProps });
      
      expect(screen.getByText(/showing 3 of 3 routing policies/i)).toBeInTheDocument();
    });
  });
});

