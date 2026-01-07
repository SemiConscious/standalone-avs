import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SendTemplateOptionsWrapper from './helpers/SendTemplateOptionsWrapper.svelte';

describe('SendTemplateOptions', () => {
  const mockNode = {
    id: 'template-1',
    type: 'sendTemplate',
    position: { x: 0, y: 0 },
    data: {
      label: 'Welcome Template',
      templateId: 't1',
      channelType: '',
    },
  };

  const mockContext = {
    groups: [],
    users: [],
    sounds: [],
  };

  let mockOnUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
  });

  it('should render label input with initial value', () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Welcome Template');
  });

  it('should show message template section', () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Message Template')).toBeInTheDocument();
  });

  it('should show refresh button', () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByTitle('Refresh templates')).toBeInTheDocument();
  });

  it('should show search input', () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
  });

  it('should show channel type filter', () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('All channels')).toBeInTheDocument();
  });

  it('should load and display templates', async () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome Message')).toBeInTheDocument();
      expect(screen.getByText('Order Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
    });
  });

  it('should show template status badges', async () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      const approvedBadges = screen.getAllByText('APPROVED');
      expect(approvedBadges.length).toBeGreaterThan(0);
    });
  });

  it('should show channel type badges', async () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getAllByText('WHATSAPP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SMS').length).toBeGreaterThan(0);
      expect(screen.getAllByText('EMAIL').length).toBeGreaterThan(0);
    });
  });

  it('should show template preview section when template is selected', async () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Template Preview')).toBeInTheDocument();
    });
  });

  it('should show toggle preview button', async () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByTitle('Toggle preview')).toBeInTheDocument();
    });
  });

  it('should call onUpdate when label changes', async () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    await fireEvent.input(labelInput, { target: { value: 'New Template' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalledWith({ label: 'New Template' });
  });

  it('should filter templates based on search', async () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome Message')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search templates...');
    await fireEvent.input(searchInput, { target: { value: 'Appointment' } });

    await waitFor(() => {
      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
      expect(screen.queryByText('Welcome Message')).not.toBeInTheDocument();
    });
  });

  it('should show node info section', () => {
    render(SendTemplateOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Node Info')).toBeInTheDocument();
    expect(screen.getByText('template-1')).toBeInTheDocument();
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'template-2',
      type: 'sendTemplate',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(SendTemplateOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Send Template');
  });
});

