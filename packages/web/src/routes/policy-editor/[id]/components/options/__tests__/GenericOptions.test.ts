import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import GenericOptionsWrapper from './helpers/GenericOptionsWrapper.svelte';

describe('GenericOptions', () => {
  const mockNode = {
    id: 'node-1',
    type: 'action',
    position: { x: 100, y: 200 },
    data: {
      label: 'Test Node',
      description: 'Test description',
      containerType: 'default',
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
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toHaveValue('Test Node');
  });

  it('should render description textarea with initial value', () => {
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const descriptionTextarea = screen.getByPlaceholderText('Enter description...');
    expect(descriptionTextarea).toBeInTheDocument();
    expect(descriptionTextarea).toHaveValue('Test description');
  });

  it('should display node info section', () => {
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Node Info')).toBeInTheDocument();
    expect(screen.getByText('ID:')).toBeInTheDocument();
    expect(screen.getByText('node-1')).toBeInTheDocument();
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('action')).toBeInTheDocument();
  });

  it('should display container type when present', () => {
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Container:')).toBeInTheDocument();
    expect(screen.getByText('default')).toBeInTheDocument();
  });

  it('should not display container type when not present', () => {
    const nodeWithoutContainer = {
      ...mockNode,
      data: { ...mockNode.data, containerType: undefined },
    };
    render(GenericOptionsWrapper, {
      props: { node: nodeWithoutContainer, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.queryByText('Container:')).not.toBeInTheDocument();
  });

  it('should display position rounded to nearest integer', () => {
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Position:')).toBeInTheDocument();
    expect(screen.getByText('100, 200')).toBeInTheDocument();
  });

  it('should have Raw Data details section', () => {
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Raw Data')).toBeInTheDocument();
  });

  it('should call onUpdate when label is changed', async () => {
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    await fireEvent.input(labelInput, { target: { value: 'New Label' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalledWith({ label: 'New Label' });
  });

  it('should call onUpdate when description is changed', async () => {
    render(GenericOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const descriptionTextarea = screen.getByPlaceholderText('Enter description...');
    await fireEvent.input(descriptionTextarea, { target: { value: 'New description' } });
    await fireEvent.blur(descriptionTextarea);

    expect(mockOnUpdate).toHaveBeenCalledWith({ description: 'New description' });
  });

  it('should handle empty initial data', () => {
    const emptyNode = {
      id: 'node-2',
      type: 'action',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(GenericOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('');
  });
});

