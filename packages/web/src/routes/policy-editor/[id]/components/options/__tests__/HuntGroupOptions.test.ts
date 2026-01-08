import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import HuntGroupOptionsWrapper from './helpers/HuntGroupOptionsWrapper.svelte';

describe('HuntGroupOptions', () => {
  const mockNode = {
    id: 'hunt-1',
    type: 'huntGroup',
    position: { x: 0, y: 0 },
    data: {
      label: 'Sales Hunt',
      huntType: 'simultaneous',
      ringTimeout: 30,
      groups: ['group-1'],
      users: ['user-1'],
    },
  };

  const mockContext = {
    groups: [
      { id: 'group-1', name: 'Sales Team' },
      { id: 'group-2', name: 'Support Team' },
    ],
    users: [
      { id: 'user-1', name: 'John Doe' },
      { id: 'user-2', name: 'Jane Smith' },
    ],
    sounds: [],
  };

  let mockOnUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
  });

  it('should render label input with initial value', () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toHaveValue('Sales Hunt');
  });

  it('should render hunt strategy section', () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Hunt Strategy')).toBeInTheDocument();
  });

  it('should display all hunt type options', () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Ring All')).toBeInTheDocument();
    expect(screen.getByText('Sequential')).toBeInTheDocument();
    expect(screen.getByText('Round Robin')).toBeInTheDocument();
    expect(screen.getByText('Random')).toBeInTheDocument();
  });

  it('should show hunt type descriptions', () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Ring all agents at once')).toBeInTheDocument();
    expect(screen.getByText('Ring agents one by one')).toBeInTheDocument();
    expect(screen.getByText('Rotate through agents')).toBeInTheDocument();
    expect(screen.getByText('Ring a random agent')).toBeInTheDocument();
  });

  it('should render ring timeout input', () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Ring Timeout (seconds)')).toBeInTheDocument();
    const timeoutInput = screen.getByRole('spinbutton');
    expect(timeoutInput).toHaveValue(30);
  });

  it('should display groups section with available groups', () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Sales Team')).toBeInTheDocument();
    expect(screen.getByText('Support Team')).toBeInTheDocument();
  });

  it('should display users section with available users', () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should show empty message when no groups available', () => {
    const contextWithNoGroups = { ...mockContext, groups: [] };
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: contextWithNoGroups, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('No groups available')).toBeInTheDocument();
  });

  it('should show empty message when no users available', () => {
    const contextWithNoUsers = { ...mockContext, users: [] };
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: contextWithNoUsers, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('No users available')).toBeInTheDocument();
  });

  it('should call onUpdate when label changes', async () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    await fireEvent.input(labelInput, { target: { value: 'New Hunt Group' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalled();
    expect(mockOnUpdate.mock.calls[0][0]).toHaveProperty('label', 'New Hunt Group');
  });

  it('should call onUpdate when hunt type changes', async () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const sequentialRadio = screen.getByRole('radio', { name: /Sequential/i });
    await fireEvent.click(sequentialRadio);

    expect(mockOnUpdate).toHaveBeenCalled();
    expect(mockOnUpdate.mock.calls[0][0]).toHaveProperty('huntType', 'sequential');
  });

  it('should toggle group selection', async () => {
    render(HuntGroupOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    // Support Team checkbox (not initially selected)
    const checkboxes = screen.getAllByRole('checkbox');
    const supportTeamCheckbox = checkboxes.find(cb => 
      cb.closest('label')?.textContent?.includes('Support Team')
    );
    
    if (supportTeamCheckbox) {
      await fireEvent.click(supportTeamCheckbox);
      expect(mockOnUpdate).toHaveBeenCalled();
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
      expect(lastCall.groups).toContain('group-2');
    }
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'hunt-2',
      type: 'huntGroup',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(HuntGroupOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toHaveValue('Hunt Group');
  });
});

