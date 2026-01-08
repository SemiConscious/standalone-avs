import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import KnowledgeBaseOptionsWrapper from './helpers/KnowledgeBaseOptionsWrapper.svelte';

describe('KnowledgeBaseOptions', () => {
  const mockNode = {
    id: 'kb-node-1',
    type: 'knowledgeBase',
    position: { x: 0, y: 0 },
    data: {
      label: 'Product KB',
      knowledgeBaseId: 'kb-1',
      tagFilter: ['products'],
      queryThreshold: 70,
      goalPrompt: 'Help users find product information',
      userGreetingPrompt: 'Welcome!',
      domainSpecificKnowledge: '',
      knowledgeCompleteConfirmPrompt: '',
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
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Product KB');
  });

  it('should show knowledge base selection', () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
  });

  it('should show refresh button', () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByTitle('Refresh knowledge bases')).toBeInTheDocument();
  });

  it('should show relevance threshold slider', () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText(/Relevance Threshold/)).toBeInTheDocument();
    expect(screen.getByText('More results (0%)')).toBeInTheDocument();
    expect(screen.getByText('Higher quality (100%)')).toBeInTheDocument();
  });

  it('should show prompts configuration when KB is selected', async () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Prompts Configuration')).toBeInTheDocument();
    });
  });

  it('should show goal prompt field', async () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Goal Prompt')).toBeInTheDocument();
    });
  });

  it('should show user greeting field', async () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('User Greeting')).toBeInTheDocument();
    });
  });

  it('should show domain-specific knowledge field', async () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Domain-Specific Knowledge')).toBeInTheDocument();
    });
  });

  it('should show test section when KB is selected', async () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Test Knowledge Base')).toBeInTheDocument();
    });
  });

  it('should have show/hide test toggle', async () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Show Test')).toBeInTheDocument();
    });
  });

  it('should call onUpdate when label changes', async () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    await fireEvent.input(labelInput, { target: { value: 'New KB' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalledWith({ label: 'New KB' });
  });

  it('should show node info section', () => {
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Node Info')).toBeInTheDocument();
    expect(screen.getByText('kb-node-1')).toBeInTheDocument();
  });

  it('should not show prompts when no KB selected', () => {
    const nodeWithoutKB = {
      ...mockNode,
      data: { ...mockNode.data, knowledgeBaseId: '' },
    };
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: nodeWithoutKB, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.queryByText('Prompts Configuration')).not.toBeInTheDocument();
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'kb-2',
      type: 'knowledgeBase',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(KnowledgeBaseOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Knowledge Base');
  });
});

