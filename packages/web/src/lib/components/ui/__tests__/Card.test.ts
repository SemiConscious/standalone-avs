/**
 * Tests for Card Component
 * 
 * Uses wrapper component to provide children snippet.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CardWrapper from './helpers/CardWrapper.svelte';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render card element', () => {
      const { container } = render(CardWrapper);
      expect(container.querySelector('.card')).toBeInTheDocument();
    });

    it('should render text content', () => {
      render(CardWrapper, { props: { text: 'My Card Content' } });
      expect(screen.getByText('My Card Content')).toBeInTheDocument();
    });

    it('should render with medium padding by default', () => {
      const { container } = render(CardWrapper);
      expect(container.querySelector('.p-4')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      const { container } = render(CardWrapper);
      expect(container.querySelector('div.card')).toBeInTheDocument();
    });
  });

  describe('Padding', () => {
    it('should render with no padding', () => {
      const { container } = render(CardWrapper, { props: { padding: 'none' } });
      const card = container.querySelector('.card');
      expect(card).not.toHaveClass('p-3');
      expect(card).not.toHaveClass('p-4');
      expect(card).not.toHaveClass('p-6');
    });

    it('should render with small padding', () => {
      const { container } = render(CardWrapper, { props: { padding: 'sm' } });
      expect(container.querySelector('.p-3')).toBeInTheDocument();
    });

    it('should render with medium padding', () => {
      const { container } = render(CardWrapper, { props: { padding: 'md' } });
      expect(container.querySelector('.p-4')).toBeInTheDocument();
    });

    it('should render with large padding', () => {
      const { container } = render(CardWrapper, { props: { padding: 'lg' } });
      expect(container.querySelector('.p-6')).toBeInTheDocument();
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom class', () => {
      const { container } = render(CardWrapper, { props: { class: 'custom-card' } });
      expect(container.querySelector('.custom-card')).toBeInTheDocument();
    });

    it('should combine custom class with default classes', () => {
      const { container } = render(CardWrapper, { props: { class: 'my-card' } });
      const card = container.querySelector('.card');
      expect(card).toHaveClass('card');
      expect(card).toHaveClass('my-card');
    });
  });
});

