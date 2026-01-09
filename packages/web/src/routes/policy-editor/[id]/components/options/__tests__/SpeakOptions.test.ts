import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SpeakOptionsWrapper from './helpers/SpeakOptionsWrapper.svelte';

describe('SpeakOptions', () => {
  const mockNode = {
    id: 'speak-1',
    type: 'speak',
    position: { x: 0, y: 0 },
    data: {
      label: 'Welcome Message',
      message: 'Hello, welcome to our service.',
      voice: 'en-US-Neural2-C',
      speed: 1.0,
      soundId: '',
      useSound: false,
    },
  };

  const mockContext = {
    groups: [],
    users: [],
    sounds: [
      { id: 'sound-1', name: 'Welcome Sound' },
      { id: 'sound-2', name: 'Hold Music' },
    ],
  };

  let mockOnUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUpdate = vi.fn();
  });

  it('should render label input with initial value', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toHaveValue('Welcome Message');
  });

  it('should render Text-to-Speech and Audio File toggle buttons', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Text-to-Speech')).toBeInTheDocument();
    expect(screen.getByText('Audio File')).toBeInTheDocument();
  });

  it('should show TTS options by default when useSound is false', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Voice')).toBeInTheDocument();
  });

  it('should display message textarea with initial value', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const messageTextarea = screen.getByPlaceholderText('Enter the message to speak...');
    expect(messageTextarea).toHaveValue('Hello, welcome to our service.');
  });

  it('should show voice dropdown with options', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('English (US) - Female')).toBeInTheDocument();
    expect(screen.getByText('English (UK) - Male')).toBeInTheDocument();
    expect(screen.getByText('German - Female')).toBeInTheDocument();
  });

  it('should show speed slider', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText(/Speed:/)).toBeInTheDocument();
    expect(screen.getByText('0.5x')).toBeInTheDocument();
    expect(screen.getByText('2.0x')).toBeInTheDocument();
  });

  it('should show Preview button when message is present', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('should not show Preview button when message is empty', () => {
    const nodeWithNoMessage = {
      ...mockNode,
      data: { ...mockNode.data, message: '' },
    };
    render(SpeakOptionsWrapper, {
      props: { node: nodeWithNoMessage, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
  });

  it('should switch to Audio File mode when button is clicked', async () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    await fireEvent.click(screen.getByText('Audio File'));

    expect(screen.getByText('Select Sound')).toBeInTheDocument();
    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it('should show audio file options when useSound is true', () => {
    const nodeWithSound = {
      ...mockNode,
      data: { ...mockNode.data, useSound: true, soundId: 'sound-1' },
    };
    render(SpeakOptionsWrapper, {
      props: { node: nodeWithSound, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Select Sound')).toBeInTheDocument();
    expect(screen.getByText('Welcome Sound')).toBeInTheDocument();
    expect(screen.getByText('Hold Music')).toBeInTheDocument();
  });

  it('should show Preview Sound button when soundId is selected', () => {
    const nodeWithSound = {
      ...mockNode,
      data: { ...mockNode.data, useSound: true, soundId: 'sound-1' },
    };
    render(SpeakOptionsWrapper, {
      props: { node: nodeWithSound, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText('Preview Sound')).toBeInTheDocument();
  });

  it('should call onUpdate when label changes', async () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    await fireEvent.input(labelInput, { target: { value: 'New Label' } });
    await fireEvent.blur(labelInput);

    expect(mockOnUpdate).toHaveBeenCalled();
    expect(mockOnUpdate.mock.calls[0][0]).toHaveProperty('label', 'New Label');
  });

  it('should show macro hint text', () => {
    render(SpeakOptionsWrapper, {
      props: { node: mockNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    expect(screen.getByText(/Use.*macros.*for dynamic values/)).toBeInTheDocument();
  });

  it('should have default values when node data is empty', () => {
    const emptyNode = {
      id: 'speak-2',
      type: 'speak',
      position: { x: 0, y: 0 },
      data: {},
    };
    render(SpeakOptionsWrapper, {
      props: { node: emptyNode, context: mockContext, onUpdate: mockOnUpdate },
    });

    const inputs = screen.getAllByRole('textbox');
    const labelInput = inputs[0];
    expect(labelInput).toHaveValue('Speak');
  });
});

