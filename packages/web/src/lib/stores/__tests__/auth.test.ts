/**
 * Tests for Auth Store
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { auth, currentUser, isAuthenticated, isAuthLoading, authError, type AuthUser } from '../auth';

describe('Auth Store', () => {
  const mockUser: AuthUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    organizationId: 'org-456',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    // Reset auth store to initial state
    auth.reset();
  });

  describe('Initial State', () => {
    it('should start with null user', () => {
      const state = get(auth);
      expect(state.user).toBeNull();
    });

    it('should start with loading state', () => {
      const state = get(auth);
      expect(state.isLoading).toBe(true);
    });

    it('should start with no error', () => {
      const state = get(auth);
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set the user', () => {
      auth.setUser(mockUser);
      const state = get(auth);
      expect(state.user).toEqual(mockUser);
    });

    it('should set loading to false when setting user', () => {
      auth.setUser(mockUser);
      const state = get(auth);
      expect(state.isLoading).toBe(false);
    });

    it('should clear error when setting user', () => {
      auth.setError('Some error');
      auth.setUser(mockUser);
      const state = get(auth);
      expect(state.error).toBeNull();
    });

    it('should allow setting user to null', () => {
      auth.setUser(mockUser);
      auth.setUser(null);
      const state = get(auth);
      expect(state.user).toBeNull();
    });

    it('should handle user without avatarUrl', () => {
      const userWithoutAvatar: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        organizationId: 'org-456',
      };
      auth.setUser(userWithoutAvatar);
      const state = get(auth);
      expect(state.user?.avatarUrl).toBeUndefined();
    });
  });

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      auth.setUser(mockUser); // Sets loading to false
      auth.setLoading(true);
      const state = get(auth);
      expect(state.isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      auth.setLoading(false);
      const state = get(auth);
      expect(state.isLoading).toBe(false);
    });

    it('should preserve user when changing loading state', () => {
      auth.setUser(mockUser);
      auth.setLoading(true);
      const state = get(auth);
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      auth.setError('Authentication failed');
      const state = get(auth);
      expect(state.error).toBe('Authentication failed');
    });

    it('should set loading to false when setting error', () => {
      auth.setError('Error');
      const state = get(auth);
      expect(state.isLoading).toBe(false);
    });

    it('should allow clearing error', () => {
      auth.setError('Some error');
      auth.setError(null);
      const state = get(auth);
      expect(state.error).toBeNull();
    });

    it('should preserve user when setting error', () => {
      auth.setUser(mockUser);
      auth.setError('Some error');
      const state = get(auth);
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should clear user on logout', () => {
      auth.setUser(mockUser);
      auth.logout();
      const state = get(auth);
      expect(state.user).toBeNull();
    });

    it('should set loading to false on logout', () => {
      auth.logout();
      const state = get(auth);
      expect(state.isLoading).toBe(false);
    });

    it('should clear error on logout', () => {
      auth.setError('Some error');
      auth.logout();
      const state = get(auth);
      expect(state.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      auth.setUser(mockUser);
      auth.setError('Some error');
      auth.reset();
      const state = get(auth);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('currentUser derived store', () => {
    it('should return null when not authenticated', () => {
      auth.logout();
      expect(get(currentUser)).toBeNull();
    });

    it('should return user when authenticated', () => {
      auth.setUser(mockUser);
      expect(get(currentUser)).toEqual(mockUser);
    });
  });

  describe('isAuthenticated derived store', () => {
    it('should return false when no user', () => {
      auth.logout();
      expect(get(isAuthenticated)).toBe(false);
    });

    it('should return true when user exists', () => {
      auth.setUser(mockUser);
      expect(get(isAuthenticated)).toBe(true);
    });
  });

  describe('isAuthLoading derived store', () => {
    it('should return initial loading state', () => {
      auth.reset();
      expect(get(isAuthLoading)).toBe(true);
    });

    it('should return false after user is set', () => {
      auth.setUser(mockUser);
      expect(get(isAuthLoading)).toBe(false);
    });

    it('should reflect loading state changes', () => {
      auth.setLoading(false);
      expect(get(isAuthLoading)).toBe(false);
      auth.setLoading(true);
      expect(get(isAuthLoading)).toBe(true);
    });
  });

  describe('authError derived store', () => {
    it('should return null when no error', () => {
      auth.logout();
      expect(get(authError)).toBeNull();
    });

    it('should return error message when error exists', () => {
      auth.setError('Test error');
      expect(get(authError)).toBe('Test error');
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of state changes', () => {
      const callback = vi.fn();
      const unsubscribe = auth.subscribe(callback);

      auth.setUser(mockUser);
      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should call subscriber with initial value', () => {
      const callback = vi.fn();
      auth.subscribe(callback);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        user: null,
        isLoading: true,
        error: null,
      }));
    });
  });
});

