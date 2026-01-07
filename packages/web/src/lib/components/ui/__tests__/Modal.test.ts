/**
 * Tests for Modal Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ModalWrapper from './helpers/ModalWrapper.svelte';

describe('Modal Component', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    content: 'Modal content',
  };

  describe('Rendering', () => {
    it('should render when open is true', () => {
      render(ModalWrapper, { props: defaultProps });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(ModalWrapper, { props: { ...defaultProps, open: false } });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render children content', () => {
      render(ModalWrapper, { props: defaultProps });
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(ModalWrapper, { props: { ...defaultProps, title: 'My Modal' } });
      expect(screen.getByText('My Modal')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(ModalWrapper, { props: defaultProps });
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby when title is provided', () => {
      render(ModalWrapper, { props: { ...defaultProps, title: 'Test Modal' } });
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });
  });

  describe('Sizes', () => {
    it('should render with medium size by default', () => {
      const { container } = render(ModalWrapper, { props: defaultProps });
      expect(container.querySelector('.max-w-md')).toBeInTheDocument();
    });

    it('should render with small size', () => {
      const { container } = render(ModalWrapper, { props: { ...defaultProps, size: 'sm' } });
      expect(container.querySelector('.max-w-sm')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      const { container } = render(ModalWrapper, { props: { ...defaultProps, size: 'lg' } });
      expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
    });

    it('should render with extra large size', () => {
      const { container } = render(ModalWrapper, { props: { ...defaultProps, size: 'xl' } });
      expect(container.querySelector('.max-w-xl')).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      const { container } = render(ModalWrapper, { props: { ...defaultProps, onClose, title: 'Modal' } });
      
      // Get the actual button element (not the backdrop div with role=button)
      const closeButton = container.querySelector('button.btn');
      await fireEvent.click(closeButton!);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      render(ModalWrapper, { props: { ...defaultProps, onClose } });
      
      const backdrop = screen.getByRole('button', { name: /close modal/i });
      await fireEvent.click(backdrop);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const onClose = vi.fn();
      render(ModalWrapper, { props: { ...defaultProps, onClose } });
      
      await fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Footer', () => {
    it('should render footer when provided', () => {
      render(ModalWrapper, { 
        props: { 
          ...defaultProps, 
          footerContent: 'Footer content'
        } 
      });
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should render footer container when footer is provided', () => {
      const { container } = render(ModalWrapper, { 
        props: { 
          ...defaultProps, 
          footerContent: 'Footer content'
        } 
      });
      expect(container.querySelector('.rounded-b-base')).toBeInTheDocument();
    });
  });

  describe('Without Title', () => {
    it('should render close button in absolute position when no title', () => {
      const { container } = render(ModalWrapper, { props: defaultProps });
      // Get the actual close button (not the backdrop)
      const closeButton = container.querySelector('button[aria-label="Close"]');
      expect(closeButton).toHaveClass('absolute');
    });
  });
});
