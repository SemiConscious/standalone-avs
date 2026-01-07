import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import DigitalInboundOptionsWrapper from './helpers/DigitalInboundOptionsWrapper.svelte';

describe('DigitalInboundOptions', () => {
  const mockNode = {
    id: 'digital-1',
    type: 'digitalInbound',
    position: { x: 0, y: 0 },
    data: {
      label: 'WhatsApp Channel',
      selectedChannels: ['wa-1'],
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
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('WhatsApp Channel');
  });

  it('should show digital channels section', () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Digital Channels')).toBeInTheDocument();
  });

  it('should show refresh button', () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByTitle('Refresh channels')).toBeInTheDocument();
  });

  it('should show search input', () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByPlaceholderText('Search channels...')).toBeInTheDocument();
  });

  it('should show select all and deselect all buttons', () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Select all')).toBeInTheDocument();
    expect(screen.getByText('Deselect all')).toBeInTheDocument();
  });

  it('should load and display channels', async () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Main WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Support WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Marketing SMS')).toBeInTheDocument();
    });
  });

  it('should show channel types with badges', async () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getAllByText('WHATSAPP').length).toBeGreaterThan(0);
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('EMAIL')).toBeInTheDocument();
    });
  });

  it('should show channel addresses', async () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('+1 555 0100')).toBeInTheDocument();
      expect(screen.getByText('support@example.com')).toBeInTheDocument();
    });
  });

  it('should show selected channel count', async () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText(/channel.*selected/i)).toBeInTheDocument();
    });
  });

  it('should call onUpdate when label changes', async () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    await fireEvent.input(labelInput, { target: { value: 'New Digital' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalledWith({ label: 'New Digital' });
  });

  it('should filter channels based on search', async () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await waitFor(() => {
      expect(screen.getByText('Main WhatsApp')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search channels...');
    await fireEvent.input(searchInput, { target: { value: 'SMS' } });

    await waitFor(() => {
      expect(screen.getByText('Marketing SMS')).toBeInTheDocument();
      expect(screen.queryByText('Main WhatsApp')).not.toBeInTheDocument();
    });
  });

  it('should show node info section', () => {
    render(DigitalInboundOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Node Info')).toBeInTheDocument();
    expect(screen.getByText('digital-1')).toBeInTheDocument();
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'digital-2',
      type: 'digitalInbound',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(DigitalInboundOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const labelInput = screen.getByPlaceholderText('Enter label...');
    expect(labelInput).toHaveValue('Inbound Digital Address');
  });
});

