import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import AIAgentOptionsWrapper from './helpers/AIAgentOptionsWrapper.svelte';

describe('AIAgentOptions', () => {
  const mockNode = {
    id: 'ai-1',
    type: 'aiAgent',
    position: { x: 0, y: 0 },
    data: {
      label: 'Sales AI',
      agentId: 'agent-1',
      agentVersion: 'LATEST',
      componentVersion: '1',
      toolResultSetName: 'salesTools',
      userGreetingPrompt: '',
      tokens: [],
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
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Sales AI');
  });

  it('should show AI Agent selection with required indicator', () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('AI Agent')).toBeInTheDocument();
    // Required indicator - there may be multiple required fields
    expect(screen.getAllByText('*').length).toBeGreaterThan(0);
  });

  it('should show refresh button for agents', () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByTitle('Refresh agents')).toBeInTheDocument();
  });

  it('should show component version dropdown', () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Component Version')).toBeInTheDocument();
    expect(screen.getByText('V1 - Standard')).toBeInTheDocument();
    expect(screen.getByText('V2 - With Greeting')).toBeInTheDocument();
  });

  it('should show agent version dropdown when agent is selected', async () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Agent Version')).toBeInTheDocument();
    });
  });

  it('should show tool result set name input when agent is selected', async () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Tool Result Set Name')).toBeInTheDocument();
    });
  });

  it('should show tokens section when agent is selected', async () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Agent Tokens')).toBeInTheDocument();
    });
  });

  it('should show welcome message when V2 is selected', async () => {
    const nodeWithV2 = {
      ...mockNode,
      data: { ...mockNode.data, componentVersion: '2' },
    };
    render(AIAgentOptionsWrapper, {
      props: { node: nodeWithV2, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Welcome Message')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter a custom greeting message for the user...')).toBeInTheDocument();
  });

  it('should not show welcome message when V1 is selected', () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.queryByText('Welcome Message')).not.toBeInTheDocument();
  });

  it('should call onUpdate when label changes', async () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    await fireEvent.input(labelInput, { target: { value: 'New AI Agent' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalledWith({ label: 'New AI Agent' });
  });

  it('should show node info section', () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Node Info')).toBeInTheDocument();
    expect(screen.getByText('ai-1')).toBeInTheDocument();
  });

  it('should show add token button', async () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByTitle('Add token')).toBeInTheDocument();
    });
  });

  it('should show empty tokens message when no tokens', async () => {
    render(AIAgentOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText(/No tokens configured/)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid agent', () => {
    const nodeWithoutAgent = {
      ...mockNode,
      data: { ...mockNode.data, agentId: '' },
    };
    render(AIAgentOptionsWrapper, {
      props: { node: nodeWithoutAgent, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Agent is required')).toBeInTheDocument();
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'ai-2',
      type: 'aiAgent',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(AIAgentOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('AI Agent');
  });
});

