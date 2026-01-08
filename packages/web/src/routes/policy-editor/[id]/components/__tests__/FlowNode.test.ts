import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FlowNodeWrapper from './helpers/FlowNodeWrapper.svelte';

describe('FlowNode', () => {
  const mockNode = {
    id: 'test-node-1',
    type: 'callQueue',
    position: { x: 100, y: 200 },
    data: {
      label: 'Test Queue',
      description: 'A test call queue',
    },
  };

  describe('Basic Rendering', () => {
    it('should render node with label', () => {
      render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      expect(screen.getByText('Test Queue')).toBeInTheDocument();
    });

    it('should render at correct position', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      const flowNode = container.querySelector('.flow-node');
      expect(flowNode).toHaveStyle('left: 100px');
      expect(flowNode).toHaveStyle('top: 200px');
    });

    it('should have correct width', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: { ...mockNode, width: 200 } },
      });

      const flowNode = container.querySelector('.flow-node');
      expect(flowNode).toHaveStyle('width: 200px');
    });

    it('should use default width when not specified', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      const flowNode = container.querySelector('.flow-node');
      expect(flowNode).toHaveStyle('width: 150px');
    });

    it('should have data-node-id attribute', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      const flowNode = container.querySelector('[data-node-id="test-node-1"]');
      expect(flowNode).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('should apply selected class when selected', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode, selected: true },
      });

      const flowNode = container.querySelector('.flow-node');
      expect(flowNode).toHaveClass('selected');
    });

    it('should not have selected class when not selected', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode, selected: false },
      });

      const flowNode = container.querySelector('.flow-node');
      expect(flowNode).not.toHaveClass('selected');
    });
  });

  describe('Double Click Handler', () => {
    it('should call onDoubleClick when double-clicked', async () => {
      const onDoubleClick = vi.fn();
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode, onDoubleClick },
      });

      const flowNode = container.querySelector('.flow-node');
      await fireEvent.dblClick(flowNode!);

      expect(onDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('should not throw when onDoubleClick is not provided', async () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      const flowNode = container.querySelector('.flow-node');
      expect(() => fireEvent.dblClick(flowNode!)).not.toThrow();
    });
  });

  describe('Node Types', () => {
    describe('Input Handles', () => {
      const noInputHandleTypes = ['init', 'input', 'inboundNumber', 'extensionNumber', 'inboundMessage'];
      const hasInputHandleTypes = ['callQueue', 'huntGroup', 'rule', 'speak', 'output', 'end'];

      noInputHandleTypes.forEach((type) => {
        it(`should NOT have input handle for ${type} node`, () => {
          const { container } = render(FlowNodeWrapper, {
            props: { node: { ...mockNode, type } },
          });

          const inputHandle = container.querySelector('.input-handle');
          expect(inputHandle).not.toBeInTheDocument();
        });
      });

      hasInputHandleTypes.forEach((type) => {
        it(`should have input handle for ${type} node`, () => {
          const { container } = render(FlowNodeWrapper, {
            props: { node: { ...mockNode, type } },
          });

          const inputHandle = container.querySelector('.input-handle');
          expect(inputHandle).toBeInTheDocument();
        });
      });
    });

    describe('Output Handles', () => {
      const noOutputHandleTypes = ['output', 'end'];
      const hasOutputHandleTypes = ['init', 'input', 'callQueue', 'huntGroup', 'speak'];

      noOutputHandleTypes.forEach((type) => {
        it(`should NOT have output handle for ${type} node`, () => {
          const { container } = render(FlowNodeWrapper, {
            props: { node: { ...mockNode, type } },
          });

          const outputHandle = container.querySelector('.output-handle');
          expect(outputHandle).not.toBeInTheDocument();
        });
      });

      hasOutputHandleTypes.forEach((type) => {
        it(`should have output handle for ${type} node`, () => {
          const { container } = render(FlowNodeWrapper, {
            props: { node: { ...mockNode, type } },
          });

          const outputHandle = container.querySelector('.output-handle');
          expect(outputHandle).toBeInTheDocument();
        });
      });
    });

    describe('Rule Node Special Handles', () => {
      it('should have true and false output handles for rule node', () => {
        const { container } = render(FlowNodeWrapper, {
          props: { node: { ...mockNode, type: 'rule' } },
        });

        const trueHandle = container.querySelector('.output-handle-true');
        const falseHandle = container.querySelector('.output-handle-false');
        expect(trueHandle).toBeInTheDocument();
        expect(falseHandle).toBeInTheDocument();
      });

      it('should have correct data-handle-id attributes for rule node', () => {
        const { container } = render(FlowNodeWrapper, {
          props: { node: { ...mockNode, type: 'rule' } },
        });

        const trueHandle = container.querySelector('[data-handle-id="true"]');
        const falseHandle = container.querySelector('[data-handle-id="false"]');
        expect(trueHandle).toBeInTheDocument();
        expect(falseHandle).toBeInTheDocument();
      });

      it('should NOT have true/false handles for non-rule nodes', () => {
        const { container } = render(FlowNodeWrapper, {
          props: { node: mockNode },
        });

        const trueHandle = container.querySelector('.output-handle-true');
        const falseHandle = container.querySelector('.output-handle-false');
        expect(trueHandle).not.toBeInTheDocument();
        expect(falseHandle).not.toBeInTheDocument();
      });
    });
  });

  describe('Sub-Items Display', () => {
    it('should display sub-items when provided', () => {
      const nodeWithSubItems = {
        ...mockNode,
        data: {
          ...mockNode.data,
          subItems: [
            { id: 'sub-1', name: 'Phone 1' },
            { id: 'sub-2', data: { label: 'Phone 2' } },
          ],
        },
      };

      render(FlowNodeWrapper, {
        props: { node: nodeWithSubItems },
      });

      expect(screen.getByText('Phone 1')).toBeInTheDocument();
      expect(screen.getByText('Phone 2')).toBeInTheDocument();
    });

    it('should display outputs when provided', () => {
      const nodeWithOutputs = {
        ...mockNode,
        data: {
          ...mockNode.data,
          outputs: [
            { id: 'out-1', title: 'Output A' },
            { id: 'out-2', data: { name: 'Output B' } },
          ],
        },
      };

      render(FlowNodeWrapper, {
        props: { node: nodeWithOutputs },
      });

      expect(screen.getByText('Output A')).toBeInTheDocument();
      expect(screen.getByText('Output B')).toBeInTheDocument();
    });

    it('should limit displayed items to 5', () => {
      const nodeWithManyItems = {
        ...mockNode,
        data: {
          ...mockNode.data,
          subItems: [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' },
            { id: '3', name: 'Item 3' },
            { id: '4', name: 'Item 4' },
            { id: '5', name: 'Item 5' },
            { id: '6', name: 'Item 6' },
            { id: '7', name: 'Item 7' },
          ],
        },
      };

      render(FlowNodeWrapper, {
        props: { node: nodeWithManyItems },
      });

      // Should show 4 items plus "more" indicator
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 4')).toBeInTheDocument();
      expect(screen.getByText('+3 more...')).toBeInTheDocument();
      expect(screen.queryByText('Item 6')).not.toBeInTheDocument();
      expect(screen.queryByText('Item 7')).not.toBeInTheDocument();
    });

    it('should not show sub-items container when no items', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      const subItemsContainer = container.querySelector('.sub-items-container');
      expect(subItemsContainer).not.toBeInTheDocument();
    });
  });

  describe('Label Fallbacks', () => {
    it('should use label when provided', () => {
      render(FlowNodeWrapper, {
        props: {
          node: {
            ...mockNode,
            data: { label: 'Custom Label' },
          },
        },
      });

      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should use title as fallback', () => {
      render(FlowNodeWrapper, {
        props: {
          node: {
            ...mockNode,
            data: { title: 'Title Fallback' },
          },
        },
      });

      expect(screen.getByText('Title Fallback')).toBeInTheDocument();
    });

    it('should use name as fallback', () => {
      render(FlowNodeWrapper, {
        props: {
          node: {
            ...mockNode,
            data: { name: 'Name Fallback' },
          },
        },
      });

      expect(screen.getByText('Name Fallback')).toBeInTheDocument();
    });
  });

  describe('Description', () => {
    it('should show description when no sub-items', () => {
      const nodeWithDescription = {
        ...mockNode,
        data: {
          label: 'Test Node',
          description: 'This is a description',
        },
      };

      render(FlowNodeWrapper, {
        props: { node: nodeWithDescription },
      });

      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });

    it('should hide description when sub-items present', () => {
      const nodeWithSubItemsAndDescription = {
        ...mockNode,
        data: {
          label: 'Test Node',
          description: 'This is a description',
          subItems: [{ id: '1', name: 'Sub Item' }],
        },
      };

      render(FlowNodeWrapper, {
        props: { node: nodeWithSubItemsAndDescription },
      });

      expect(screen.queryByText('This is a description')).not.toBeInTheDocument();
    });
  });

  describe('Handle Positioning', () => {
    it('should position input handle at vertical center', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: { ...mockNode, type: 'callQueue', height: 100 } },
      });

      const inputHandle = container.querySelector('.input-handle');
      expect(inputHandle).toHaveStyle('top: 50px');
    });

    it('should position output handle at vertical center', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: { ...mockNode, type: 'callQueue', height: 100 } },
      });

      const outputHandle = container.querySelector('.output-handle');
      expect(outputHandle).toHaveStyle('top: 50px');
    });

    it('should position rule node true handle at 25% height', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: { ...mockNode, type: 'rule', height: 100 } },
      });

      const trueHandle = container.querySelector('.output-handle-true');
      expect(trueHandle).toHaveStyle('top: 25px');
    });

    it('should position rule node false handle at 75% height', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: { ...mockNode, type: 'rule', height: 100 } },
      });

      const falseHandle = container.querySelector('.output-handle-false');
      expect(falseHandle).toHaveStyle('top: 75px');
    });
  });

  describe('Node Type Icons', () => {
    const iconNodeTypes = [
      'init', 'input', 'inboundNumber', 'callQueue', 'huntGroup', 
      'rule', 'speak', 'recordCall', 'voicemail', 'natterboxAI',
      'queryObject', 'createRecord', 'manageProperties', 'notify'
    ];

    iconNodeTypes.forEach((type) => {
      it(`should render icon for ${type} node`, () => {
        const { container } = render(FlowNodeWrapper, {
          props: { node: { ...mockNode, type } },
        });

        // All nodes should have an SVG icon
        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      const flowNode = container.querySelector('[role="button"]');
      expect(flowNode).toBeInTheDocument();
    });

    it('should have tabindex for keyboard navigation', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: mockNode },
      });

      const flowNode = container.querySelector('[tabindex="0"]');
      expect(flowNode).toBeInTheDocument();
    });

    it('should have title on rule node handles', () => {
      const { container } = render(FlowNodeWrapper, {
        props: { node: { ...mockNode, type: 'rule' } },
      });

      const trueHandle = container.querySelector('[title="True"]');
      const falseHandle = container.querySelector('[title="False"]');
      expect(trueHandle).toBeInTheDocument();
      expect(falseHandle).toBeInTheDocument();
    });
  });
});
