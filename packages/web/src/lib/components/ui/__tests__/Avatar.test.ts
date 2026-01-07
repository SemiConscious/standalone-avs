/**
 * Tests for Avatar Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Avatar from '../Avatar.svelte';

describe('Avatar Component', () => {
  describe('Rendering with Image', () => {
    it('should render image when src is provided', () => {
      render(Avatar, { props: { name: 'John Doe', src: '/avatar.jpg' } });
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatar.jpg');
    });

    it('should use name as alt text for image', () => {
      render(Avatar, { props: { name: 'Jane Smith', src: '/avatar.jpg' } });
      expect(screen.getByAltText('Jane Smith')).toBeInTheDocument();
    });

    it('should apply size classes to image', () => {
      render(Avatar, { props: { name: 'User', src: '/avatar.jpg', size: 'lg' } });
      const img = screen.getByRole('img');
      expect(img).toHaveClass('w-12');
      expect(img).toHaveClass('h-12');
    });
  });

  describe('Rendering with Initials', () => {
    it('should render initials when no src is provided', () => {
      render(Avatar, { props: { name: 'John Doe' } });
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render single initial for single-word name', () => {
      render(Avatar, { props: { name: 'John' } });
      // getInitials returns first char of each word, so single word = single initial
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should render initials for multi-word name', () => {
      render(Avatar, { props: { name: 'John Michael Smith' } });
      expect(screen.getByText('JM')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render with medium size by default', () => {
      const { container } = render(Avatar, { props: { name: 'User' } });
      const avatar = container.querySelector('.w-10');
      expect(avatar).toBeInTheDocument();
    });

    it('should render with xs size', () => {
      const { container } = render(Avatar, { props: { name: 'User', size: 'xs' } });
      expect(container.querySelector('.w-6')).toBeInTheDocument();
      expect(container.querySelector('.h-6')).toBeInTheDocument();
    });

    it('should render with sm size', () => {
      const { container } = render(Avatar, { props: { name: 'User', size: 'sm' } });
      expect(container.querySelector('.w-8')).toBeInTheDocument();
      expect(container.querySelector('.h-8')).toBeInTheDocument();
    });

    it('should render with md size', () => {
      const { container } = render(Avatar, { props: { name: 'User', size: 'md' } });
      expect(container.querySelector('.w-10')).toBeInTheDocument();
      expect(container.querySelector('.h-10')).toBeInTheDocument();
    });

    it('should render with lg size', () => {
      const { container } = render(Avatar, { props: { name: 'User', size: 'lg' } });
      expect(container.querySelector('.w-12')).toBeInTheDocument();
      expect(container.querySelector('.h-12')).toBeInTheDocument();
    });

    it('should render with xl size', () => {
      const { container } = render(Avatar, { props: { name: 'User', size: 'xl' } });
      expect(container.querySelector('.w-16')).toBeInTheDocument();
      expect(container.querySelector('.h-16')).toBeInTheDocument();
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom class to image avatar', () => {
      const { container } = render(Avatar, { props: { name: 'User', src: '/avatar.jpg', class: 'custom-avatar' } });
      expect(container.querySelector('.custom-avatar')).toBeInTheDocument();
    });

    it('should apply custom class to initials avatar', () => {
      const { container } = render(Avatar, { props: { name: 'User', class: 'custom-avatar' } });
      expect(container.querySelector('.custom-avatar')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have rounded-full class for circular shape', () => {
      const { container } = render(Avatar, { props: { name: 'User' } });
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('should have accent background for initials avatar', () => {
      const { container } = render(Avatar, { props: { name: 'User' } });
      expect(container.querySelector('.bg-accent\\/10')).toBeInTheDocument();
    });
  });
});

