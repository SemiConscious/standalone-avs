import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RuleOptionsWrapper from './helpers/RuleOptionsWrapper.svelte';

describe('RuleOptions', () => {
  const mockNode = {
    id: 'rule-1',
    type: 'rule',
    position: { x: 0, y: 0 },
    data: {
      label: 'Business Hours',
      conditions: [
        {
          id: 'cond-1',
          field: 'time.hour',
          operator: 'greaterThan',
          value: '9',
          logicalOperator: 'AND',
        },
        {
          id: 'cond-2',
          field: 'time.hour',
          operator: 'lessThan',
          value: '17',
          logicalOperator: 'AND',
        },
      ],
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

  it('should render label input', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toBeInTheDocument();
    expect(labelInput).toHaveValue('Business Hours');
  });

  it('should render Conditions heading', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Conditions')).toBeInTheDocument();
  });

  it('should render Add button', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('should display existing conditions', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    // Should have 2 condition blocks with field selects
    const fieldSelects = screen.getAllByRole('combobox');
    expect(fieldSelects.length).toBeGreaterThanOrEqual(2);
  });

  it('should show empty state when no conditions', () => {
    const nodeWithNoConditions = {
      ...mockNode,
      data: { ...mockNode.data, conditions: [] },
    };
    render(RuleOptionsWrapper, {
      props: { node: nodeWithNoConditions, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('No conditions defined')).toBeInTheDocument();
    expect(screen.getByText('Add a condition to create branching logic')).toBeInTheDocument();
  });

  it('should render output info section', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Outputs')).toBeInTheDocument();
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
  });

  it('should call onUpdate when label changes', async () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    await fireEvent.input(labelInput, { target: { value: 'New Rule' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalled();
    expect(mockOnUpdate.mock.calls[0][0]).toHaveProperty('label', 'New Rule');
  });

  it('should add a new condition when Add is clicked', async () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const addButton = screen.getByText('Add');
    await fireEvent.click(addButton);

    expect(mockOnUpdate).toHaveBeenCalled();
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    expect(lastCall.conditions).toHaveLength(3);
  });

  it('should show logical operator dropdown between conditions', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    // There should be an AND/OR select between conditions
    expect(screen.getByDisplayValue('AND')).toBeInTheDocument();
  });

  it('should have field options', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    // Check for field option - may have multiple if there are multiple conditions
    expect(screen.getAllByText('Caller Number').length).toBeGreaterThan(0);
  });

  it('should have operator options', () => {
    render(RuleOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    // Check for operator options - may have multiple if there are multiple conditions
    expect(screen.getAllByText('Equals').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contains').length).toBeGreaterThan(0);
  });

  it('should handle empty initial data', () => {
    const emptyNode = {
      id: 'rule-2',
      type: 'rule',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(RuleOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toHaveValue('Rule');
  });
});

