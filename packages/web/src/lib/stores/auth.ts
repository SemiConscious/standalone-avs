import { writable, derived } from 'svelte/store';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });

  return {
    subscribe,
    setUser: (user: AuthUser | null) => {
      update((state) => ({ ...state, user, isLoading: false, error: null }));
    },
    setLoading: (isLoading: boolean) => {
      update((state) => ({ ...state, isLoading }));
    },
    setError: (error: string | null) => {
      update((state) => ({ ...state, error, isLoading: false }));
    },
    logout: () => {
      set({ user: null, isLoading: false, error: null });
    },
    reset: () => {
      set({ user: null, isLoading: true, error: null });
    },
  };
}

export const auth = createAuthStore();

// Derived stores for convenience
export const currentUser = derived(auth, ($auth) => $auth.user);
export const isAuthenticated = derived(auth, ($auth) => !!$auth.user);
export const isAuthLoading = derived(auth, ($auth) => $auth.isLoading);
export const authError = derived(auth, ($auth) => $auth.error);

