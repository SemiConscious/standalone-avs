import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import OmniChannelFlowOptionsWrapper from './helpers/OmniChannelFlowOptionsWrapper.svelte';

describe('OmniChannelFlowOptions', () => {
  const mockNode = {
    id: 'omni-1',
    type: 'omniChannelFlow',
    position: { x: 0, y: 0 },
    data: {
      label: 'Support Routing',
      routingType: 'queue',
      queueId: 'q2',
      flowId: '',
      fallbackBehavior: 'voicemail',
      timeout: 30,
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
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Support Routing');
  });

  it('should show routing type dropdown', () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Routing Type')).toBeInTheDocument();
    expect(screen.getByText('Route to Queue')).toBeInTheDocument();
    expect(screen.getByText('Route via Flow')).toBeInTheDocument();
  });

  it('should show refresh button', () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByTitle('Refresh options')).toBeInTheDocument();
  });

  it('should show queue selection when routing type is queue', async () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Target Queue')).toBeInTheDocument();
    });
  });

  it('should load and display queues', async () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Sales Queue')).toBeInTheDocument();
      expect(screen.getByText('Support Queue')).toBeInTheDocument();
      expect(screen.getByText('Billing Queue')).toBeInTheDocument();
    });
  });

  it('should show flow selection when routing type is flow', async () => {
    const nodeWithFlow = {
      ...mockNode,
      data: { ...mockNode.data, routingType: 'flow' },
    };
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: nodeWithFlow, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Routing Flow')).toBeInTheDocument();
    });
  });

  it('should load and display flows when routing type is flow', async () => {
    const nodeWithFlow = {
      ...mockNode,
      data: { ...mockNode.data, routingType: 'flow' },
    };
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: nodeWithFlow, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Standard Routing')).toBeInTheDocument();
      expect(screen.getByText('Skills-Based Routing')).toBeInTheDocument();
    });
  });

  it('should show timeout input', () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Queue Timeout (seconds)')).toBeInTheDocument();
    const timeoutInput = screen.getByRole('spinbutton');
    expect(timeoutInput).toHaveValue(30);
  });

  it('should show fallback behavior dropdown', () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Fallback Behavior')).toBeInTheDocument();
    expect(screen.getByText('Voicemail')).toBeInTheDocument();
  });

  it('should show all fallback options', () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Voicemail')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
    expect(screen.getByText('Transfer to Another Queue')).toBeInTheDocument();
    expect(screen.getByText('Offer Callback')).toBeInTheDocument();
  });

  it('should call onUpdate when label changes', async () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    await fireEvent.input(labelInput, { target: { value: 'New Routing' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalledWith({ label: 'New Routing' });
  });

  it('should show node info section', () => {
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Node Info')).toBeInTheDocument();
    expect(screen.getByText('omni-1')).toBeInTheDocument();
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'omni-2',
      type: 'omniChannelFlow',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(OmniChannelFlowOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('OmniChannel Routing');
  });
});

