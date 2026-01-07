import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EventOptionsWrapper from './helpers/EventOptionsWrapper.svelte';

describe('EventOptions', () => {
  const mockNode = {
    id: 'event-1',
    type: 'event',
    position: { x: 0, y: 0 },
    data: {
      label: 'Case Created',
      eventType: 'salesforce',
      enabled: true,
      eventName: 'Case',
      filterField: 'Status',
      filterOperator: 'equals',
      filterValue: 'New',
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
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Case Created');
  });

  it('should render event type dropdown', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getByText('Salesforce Trigger')).toBeInTheDocument();
  });

  it('should show all event types', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Salesforce Trigger')).toBeInTheDocument();
    expect(screen.getByText('Webhook')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Platform Event')).toBeInTheDocument();
  });

  it('should show event type description', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Trigger on Salesforce object events')).toBeInTheDocument();
  });

  it('should show Salesforce Object label when salesforce type is selected', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Salesforce Object')).toBeInTheDocument();
  });

  it('should show enabled toggle', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Event subscription enabled')).toBeInTheDocument();
  });

  it('should show event filter section', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Event Filter (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Filter Field')).toBeInTheDocument();
  });

  it('should show filter operator and value when filter field is set', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Operator')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('should show subscription status section', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Subscription Status')).toBeInTheDocument();
  });

  it('should show "Not synced" status when no subscription ID', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Not synced')).toBeInTheDocument();
    expect(screen.getByText('This event subscription will be created when the policy is saved')).toBeInTheDocument();
  });

  it('should show "Active" status when subscription ID exists', () => {
    const nodeWithSubscription = {
      ...mockNode,
      data: { ...mockNode.data, subscriptionId: 'sub-123' },
    };
    render(EventOptionsWrapper, {
      props: { node: nodeWithSubscription, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('ID: sub-123')).toBeInTheDocument();
  });

  it('should show filter operators', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Equals')).toBeInTheDocument();
    expect(screen.getByText('Not Equals')).toBeInTheDocument();
    expect(screen.getByText('Contains')).toBeInTheDocument();
  });

  it('should call onUpdate when label changes', async () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    await fireEvent.input(labelInput, { target: { value: 'New Event' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalledWith({ label: 'New Event' });
  });

  it('should call onUpdate when enabled is toggled', async () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const enabledCheckbox = screen.getByRole('checkbox');
    await fireEvent.click(enabledCheckbox);

    expect(mockOnUpdate).toHaveBeenCalledWith({ enabled: false });
  });

  it('should show node info section', () => {
    render(EventOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Node Info')).toBeInTheDocument();
    expect(screen.getByText('event-1')).toBeInTheDocument();
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'event-2',
      type: 'event',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(EventOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Event Subscription');
  });
});

