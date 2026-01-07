/**
 * Tests for Button Component
 * 
 * Uses wrapper component to provide children snippet.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ButtonWrapper from './helpers/ButtonWrapper.svelte';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button element', () => {
      render(ButtonWrapper);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render text content', () => {
      render(ButtonWrapper, { props: { text: 'Click Me' } });
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should render with primary variant by default', () => {
      render(ButtonWrapper);
      expect(screen.getByRole('button')).toHaveClass('btn-primary');
    });

    it('should render with medium size by default', () => {
      render(ButtonWrapper);
      expect(screen.getByRole('button')).toHaveClass('btn-size-md');
    });

    it('should have type="button" by default', () => {
      render(ButtonWrapper);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('Variants', () => {
    it('should render primary variant', () => {
      render(ButtonWrapper, { props: { variant: 'primary' } });
      expect(screen.getByRole('button')).toHaveClass('btn-primary');
    });

    it('should render secondary variant', () => {
      render(ButtonWrapper, { props: { variant: 'secondary' } });
      expect(screen.getByRole('button')).toHaveClass('btn-secondary');
    });

    it('should render ghost variant', () => {
      render(ButtonWrapper, { props: { variant: 'ghost' } });
      expect(screen.getByRole('button')).toHaveClass('btn-ghost');
    });

    it('should render danger variant', () => {
      render(ButtonWrapper, { props: { variant: 'danger' } });
      expect(screen.getByRole('button')).toHaveClass('btn-danger');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      render(ButtonWrapper, { props: { size: 'sm' } });
      expect(screen.getByRole('button')).toHaveClass('btn-size-sm');
    });

    it('should render medium size', () => {
      render(ButtonWrapper, { props: { size: 'md' } });
      expect(screen.getByRole('button')).toHaveClass('btn-size-md');
    });

    it('should render large size', () => {
      render(ButtonWrapper, { props: { size: 'lg' } });
      expect(screen.getByRole('button')).toHaveClass('btn-size-lg');
    });
  });

  describe('Types', () => {
    it('should render button type', () => {
      render(ButtonWrapper, { props: { type: 'button' } });
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should render submit type', () => {
      render(ButtonWrapper, { props: { type: 'submit' } });
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should render reset type', () => {
      render(ButtonWrapper, { props: { type: 'reset' } });
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  describe('Disabled State', () => {
    it('should be enabled by default', () => {
      render(ButtonWrapper);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(ButtonWrapper, { props: { disabled: true } });
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Click Handler', () => {
    it('should call onclick when clicked', async () => {
      const handleClick = vi.fn();
      render(ButtonWrapper, { props: { onclick: handleClick } });
      
      await fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is set', () => {
      const handleClick = vi.fn();
      render(ButtonWrapper, { props: { onclick: handleClick, disabled: true } });
      
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom class', () => {
      render(ButtonWrapper, { props: { class: 'custom-class' } });
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('should combine custom class with default classes', () => {
      render(ButtonWrapper, { props: { class: 'my-class' } });
      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn');
      expect(button).toHaveClass('btn-primary');
      expect(button).toHaveClass('my-class');
    });
  });
});

