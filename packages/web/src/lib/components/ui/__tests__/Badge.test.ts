/**
 * Tests for Badge Component
 * 
 * Uses wrapper component to provide children snippet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BadgeWrapper from './helpers/BadgeWrapper.svelte';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('should render badge element', () => {
      const { container } = render(BadgeWrapper);
      expect(container.querySelector('.badge')).toBeInTheDocument();
    });

    it('should render text content', () => {
      render(BadgeWrapper, { props: { text: 'Test Badge' } });
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should render with neutral variant by default', () => {
      const { container } = render(BadgeWrapper);
      expect(container.querySelector('.badge-neutral')).toBeInTheDocument();
    });

    it('should render with medium size by default', () => {
      const { container } = render(BadgeWrapper);
      expect(container.querySelector('.badge-size-md')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render success variant', () => {
      const { container } = render(BadgeWrapper, { props: { variant: 'success' } });
      expect(container.querySelector('.badge-success')).toBeInTheDocument();
    });

    it('should render warning variant', () => {
      const { container } = render(BadgeWrapper, { props: { variant: 'warning' } });
      expect(container.querySelector('.badge-warning')).toBeInTheDocument();
    });

    it('should render error variant', () => {
      const { container } = render(BadgeWrapper, { props: { variant: 'error' } });
      expect(container.querySelector('.badge-error')).toBeInTheDocument();
    });

    it('should render neutral variant', () => {
      const { container } = render(BadgeWrapper, { props: { variant: 'neutral' } });
      expect(container.querySelector('.badge-neutral')).toBeInTheDocument();
    });

    it('should render accent variant', () => {
      const { container } = render(BadgeWrapper, { props: { variant: 'accent' } });
      expect(container.querySelector('.badge-accent')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { container } = render(BadgeWrapper, { props: { size: 'sm' } });
      expect(container.querySelector('.badge-size-sm')).toBeInTheDocument();
    });

    it('should render medium size', () => {
      const { container } = render(BadgeWrapper, { props: { size: 'md' } });
      expect(container.querySelector('.badge-size-md')).toBeInTheDocument();
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom class', () => {
      const { container } = render(BadgeWrapper, { props: { class: 'custom-class' } });
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should combine custom class with default classes', () => {
      const { container } = render(BadgeWrapper, { props: { class: 'my-badge' } });
      const badge = container.querySelector('.badge');
      expect(badge).toHaveClass('badge');
      expect(badge).toHaveClass('badge-neutral');
      expect(badge).toHaveClass('my-badge');
    });
  });

  describe('Structure', () => {
    it('should render as span element', () => {
      const { container } = render(BadgeWrapper);
      expect(container.querySelector('span.badge')).toBeInTheDocument();
    });
  });
});

