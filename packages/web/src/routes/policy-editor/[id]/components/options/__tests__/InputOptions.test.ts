import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import InputOptionsWrapper from './helpers/InputOptionsWrapper.svelte';

describe('InputOptions', () => {
  const mockNode = {
    id: 'input-1',
    type: 'input',
    position: { x: 0, y: 0 },
    data: {
      label: 'Main Line',
      containerType: 'inboundNumber',
      phoneNumberId: 'phone-1',
      extensionNumber: '',
    },
  };

  const mockContext = {
    groups: [],
    users: [],
    sounds: [],
    phoneNumbers: [
      { id: 'phone-1', name: 'Sales Line', number: '+1-555-0100' },
      { id: 'phone-2', name: 'Support Line', number: '+1-555-0200' },
    ],
  };

  let mockOnUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
  });

  it('should render label input with initial value', () => {
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toHaveValue('Main Line');
  });

  it('should render input type selection buttons', () => {
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Inbound Number')).toBeInTheDocument();
    expect(screen.getByText('Extension Number')).toBeInTheDocument();
    expect(screen.getByText('Inbound Message')).toBeInTheDocument();
  });

  it('should show phone number dropdown when inboundNumber is selected', () => {
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Phone Number')).toBeInTheDocument();
    expect(screen.getByText(/Sales Line/)).toBeInTheDocument();
    expect(screen.getByText(/Support Line/)).toBeInTheDocument();
  });

  it('should display phone numbers with their numbers', () => {
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText(/\+1-555-0100/)).toBeInTheDocument();
    expect(screen.getByText(/\+1-555-0200/)).toBeInTheDocument();
  });

  it('should switch to extension number input when type is changed', async () => {
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const extensionButton = screen.getByText('Extension Number');
    await fireEvent.click(extensionButton);

    expect(mockOnUpdate).toHaveBeenCalled();
    expect(screen.getByPlaceholderText('e.g., 1001')).toBeInTheDocument();
  });

  it('should show extension number input with placeholder', () => {
    const extensionNode = {
      ...mockNode,
      data: { ...mockNode.data, containerType: 'extensionNumber' },
    };
    render(InputOptionsWrapper, {
      props: { node: extensionNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByPlaceholderText('e.g., 1001')).toBeInTheDocument();
    expect(screen.getByText('Enter the extension number that will trigger this policy')).toBeInTheDocument();
  });

  it('should show inbound message info when type is inboundMessage', () => {
    const messageNode = {
      ...mockNode,
      data: { ...mockNode.data, containerType: 'inboundMessage' },
    };
    render(InputOptionsWrapper, {
      props: { node: messageNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText(/This input will receive inbound messages/)).toBeInTheDocument();
  });

  it('should show warning when no phone numbers available', () => {
    const contextWithNoPhones = { ...mockContext, phoneNumbers: [] };
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: contextWithNoPhones, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText(/No phone numbers available/)).toBeInTheDocument();
  });

  it('should call onUpdate when label changes', async () => {
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    await fireEvent.input(labelInput, { target: { value: 'New Input' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalled();
    expect(mockOnUpdate.mock.calls[0][0]).toHaveProperty('label', 'New Input');
  });

  it('should call onUpdate when input type is changed', async () => {
    render(InputOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await fireEvent.click(screen.getByText('Extension Number'));

    expect(mockOnUpdate).toHaveBeenCalled();
    expect(mockOnUpdate.mock.calls[0][0]).toHaveProperty('containerType', 'extensionNumber');
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'input-2',
      type: 'input',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(InputOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toHaveValue('Input');
  });
});

