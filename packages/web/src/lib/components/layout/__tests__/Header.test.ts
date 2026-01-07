/**
 * Tests for Header Component
 * 
 * Note: Store mocking in Svelte 5 requires careful handling.
 * These tests focus on structural elements and interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { readable, writable } from 'svelte/store';
import Header from '../Header.svelte';

// Create a mock user for authenticated tests
const mockUser = {
  id: 'user-123',
  email: 'john.doe@example.com',
  name: 'John Doe',
  organizationId: 'org-456',
};

// Mock the auth store
vi.mock('$lib/stores/auth', () => {
  const store = writable(null);
  return {
    currentUser: {
      subscribe: store.subscribe,
      set: store.set,
    },
    _setUser: (user: typeof mockUser | null) => store.set(user),
  };
});

describe('Header Component', () => {
  beforeEach(async () => {
    // Reset to unauthenticated state
    const { _setUser } = await import('$lib/stores/auth');
    _setUser(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render app title', () => {
      render(Header);
      expect(screen.getByText('Natterbox AVS')).toBeInTheDocument();
    });

    it('should render menu toggle button', () => {
      render(Header);
      expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
    });

    it('should render notifications button', () => {
      render(Header);
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });

    it('should render notification dot', () => {
      const { container } = render(Header);
      expect(container.querySelector('.notification-dot')).toBeInTheDocument();
    });

    it('should render header content', () => {
      const { container } = render(Header);
      expect(container.querySelector('.header-content')).toBeInTheDocument();
    });

    it('should render logo icon', () => {
      const { container } = render(Header);
      expect(container.querySelector('.logo-icon')).toBeInTheDocument();
    });
  });

  describe('Menu Click Handler', () => {
    it('should call onMenuClick when menu button is clicked', async () => {
      const onMenuClick = vi.fn();
      render(Header, { props: { onMenuClick } });
      
      await fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }));
      expect(onMenuClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Structure', () => {
    it('should have header-left section', () => {
      const { container } = render(Header);
      expect(container.querySelector('.header-left')).toBeInTheDocument();
    });

    it('should have header-right section', () => {
      const { container } = render(Header);
      expect(container.querySelector('.header-right')).toBeInTheDocument();
    });

    it('should render icon buttons', () => {
      const { container } = render(Header);
      const iconBtns = container.querySelectorAll('.icon-btn');
      expect(iconBtns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on menu toggle', () => {
      render(Header);
      expect(screen.getByRole('button', { name: /toggle menu/i })).toHaveAttribute('aria-label');
    });

    it('should have aria-label on notifications button', () => {
      render(Header);
      expect(screen.getByRole('button', { name: /notifications/i })).toHaveAttribute('aria-label');
    });
  });

  describe('Unauthenticated State', () => {
    it('should show sign in link when not authenticated', () => {
      render(Header);
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should not show user menu when not authenticated', () => {
      const { container } = render(Header);
      expect(container.querySelector('.user-menu-container')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(async () => {
      const { _setUser } = await import('$lib/stores/auth');
      _setUser(mockUser);
    });

    it('should show user menu container when authenticated', async () => {
      const { container } = render(Header);
      await vi.waitFor(() => {
        expect(container.querySelector('.user-menu-container')).toBeInTheDocument();
      });
    });

    it('should display user initials when authenticated', async () => {
      render(Header);
      await vi.waitFor(() => {
        // JD for "John Doe"
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });

    it('should display user name when authenticated', async () => {
      render(Header);
      await vi.waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should not show sign in link when authenticated', async () => {
      render(Header);
      await vi.waitFor(() => {
        expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
      });
    });

    it('should show user menu button', async () => {
      render(Header);
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
      });
    });

    it('should have aria-haspopup on user menu button', async () => {
      render(Header);
      await vi.waitFor(() => {
        const menuBtn = screen.getByRole('button', { name: /user menu/i });
        expect(menuBtn).toHaveAttribute('aria-haspopup', 'menu');
      });
    });

    it('should toggle user dropdown when menu button is clicked', async () => {
      const { container } = render(Header);
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
      });

      // Click to open dropdown
      await fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      expect(container.querySelector('.user-dropdown')).toBeInTheDocument();

      // Click again to close (or the effect will handle it)
      await fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      expect(container.querySelector('.user-dropdown')).not.toBeInTheDocument();
    });

    it('should show dropdown with user info when opened', async () => {
      render(Header);
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /my profile/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should have correct links in dropdown', async () => {
      render(Header);
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
      
      expect(screen.getByRole('menuitem', { name: /my profile/i }).closest('a')).toHaveAttribute('href', '/my-profile');
      expect(screen.getByRole('menuitem', { name: /settings/i }).closest('a')).toHaveAttribute('href', '/settings');
    });

    it('should mark dropdown open with aria-expanded', async () => {
      render(Header);
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
      });

      const menuBtn = screen.getByRole('button', { name: /user menu/i });
      expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

      await fireEvent.click(menuBtn);
      expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('User with Email Only', () => {
    beforeEach(async () => {
      const { _setUser } = await import('$lib/stores/auth');
      _setUser({
        id: 'user-456',
        email: 'alice.bob@example.com',
        name: '',
        organizationId: 'org-789',
      });
    });

    it('should display initials from email when name is empty', async () => {
      render(Header);
      await vi.waitFor(() => {
        // AB for "alice.bob" email local part
        expect(screen.getByText('AB')).toBeInTheDocument();
      });
    });

    it('should display email when name is empty', async () => {
      render(Header);
      await vi.waitFor(() => {
        // Should show email in user-name span
        expect(screen.getByText('alice.bob@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('User with Simple Email', () => {
    beforeEach(async () => {
      const { _setUser } = await import('$lib/stores/auth');
      _setUser({
        id: 'user-789',
        email: 'admin@example.com',
        name: '',
        organizationId: 'org-123',
      });
    });

    it('should display initials from simple email', async () => {
      render(Header);
      await vi.waitFor(() => {
        // AD for "admin" (first 2 chars)
        expect(screen.getByText('AD')).toBeInTheDocument();
      });
    });
  });

  describe('User with Single Word Name', () => {
    beforeEach(async () => {
      const { _setUser } = await import('$lib/stores/auth');
      _setUser({
        id: 'user-single',
        email: 'single@example.com',
        name: 'Admin',
        organizationId: 'org-single',
      });
    });

    it('should display two-character initials from single word name', async () => {
      render(Header);
      await vi.waitFor(() => {
        // AD for "Admin" (first 2 chars)
        expect(screen.getByText('AD')).toBeInTheDocument();
      });
    });
  });
});

