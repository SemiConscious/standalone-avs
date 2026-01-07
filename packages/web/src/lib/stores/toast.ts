import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  description?: string;
  duration?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(toast: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    const newToast: Toast = { ...toast, id };
    
    update((toasts) => [...toasts, newToast]);

    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        remove(id);
      }, toast.duration ?? 5000);
    }

    return id;
  }

  function remove(id: string) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }

  function clear() {
    update(() => []);
  }

  return {
    subscribe,
    add,
    remove,
    clear,
    success: (message: string, description?: string) =>
      add({ type: 'success', message, description }),
    error: (message: string, description?: string) =>
      add({ type: 'error', message, description }),
    warning: (message: string, description?: string) =>
      add({ type: 'warning', message, description }),
    info: (message: string, description?: string) =>
      add({ type: 'info', message, description }),
  };
}

export const toasts = createToastStore();

