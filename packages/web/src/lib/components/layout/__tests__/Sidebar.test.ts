/**
 * Tests for Sidebar Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { readable } from 'svelte/store';
import Sidebar from '../Sidebar.svelte';

// Mock $app/stores
vi.mock('$app/stores', () => ({
  page: readable({
    url: new URL('http://localhost/routing-policies'),
  }),
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render navigation', () => {
      render(Sidebar);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(Sidebar);
      expect(screen.getByText('Admin Home')).toBeInTheDocument();
      expect(screen.getByText('User Home')).toBeInTheDocument();
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Natterbox Users')).toBeInTheDocument();
      expect(screen.getByText('AI Advisor')).toBeInTheDocument();
      expect(screen.getByText('Phone Numbers')).toBeInTheDocument();
      expect(screen.getByText('Devices')).toBeInTheDocument();
      expect(screen.getByText('Groups')).toBeInTheDocument();
      expect(screen.getByText('Routing Policies')).toBeInTheDocument();
      expect(screen.getByText('Call Logs and Recordings')).toBeInTheDocument();
    });

    it('should render navigation items as links', () => {
      render(Sidebar);
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should have correct href for Admin Home', () => {
      render(Sidebar);
      const link = screen.getByText('Admin Home').closest('a');
      expect(link).toHaveAttribute('href', '/admin');
    });

    it('should have correct href for Routing Policies', () => {
      render(Sidebar);
      const link = screen.getByText('Routing Policies').closest('a');
      expect(link).toHaveAttribute('href', '/routing-policies');
    });

    it('should have correct href for AI Advisor', () => {
      render(Sidebar);
      const link = screen.getByText('AI Advisor').closest('a');
      expect(link).toHaveAttribute('href', '/ai-advisor');
    });
  });

  describe('Active State', () => {
    it('should mark current page as selected', async () => {
      // The mock sets the page to /routing-policies
      render(Sidebar);
      const routingPoliciesLink = screen.getByText('Routing Policies').closest('a');
      expect(routingPoliciesLink).toHaveClass('selected');
    });

    it('should not mark other pages as selected', () => {
      render(Sidebar);
      const adminHomeLink = screen.getByText('Admin Home').closest('a');
      expect(adminHomeLink).not.toHaveClass('selected');
    });
  });

  describe('onClose Callback', () => {
    it('should call onClose when a nav item is clicked', async () => {
      const onClose = vi.fn();
      render(Sidebar, { props: { onClose } });

      await fireEvent.click(screen.getByText('Admin Home'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not throw when onClose is not provided', async () => {
      render(Sidebar);
      await expect(fireEvent.click(screen.getByText('Admin Home'))).resolves.not.toThrow();
    });
  });

  describe('Navigation Items', () => {
    it('should have nav-item class on all links', () => {
      render(Sidebar);
      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveClass('nav-item');
      });
    });

    it('should have icons for all navigation items', () => {
      const { container } = render(Sidebar);
      const icons = container.querySelectorAll('.nav-icon');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Props', () => {
    it('should accept isOpen prop', () => {
      const { container } = render(Sidebar, { props: { isOpen: true } });
      expect(container.querySelector('nav')).toBeInTheDocument();
    });

    it('should accept onClose prop', () => {
      const onClose = vi.fn();
      render(Sidebar, { props: { onClose } });
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});

