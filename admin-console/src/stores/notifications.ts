import { createStore, useStore } from 'zustand';

export type Notification = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  /** Auto-dismiss after this many ms; omit to keep until dismissed. */
  duration?: number;
};

type NotificationsState = {
  notifications: Notification[];
  showNotification: (n: Omit<Notification, 'id'>) => string;
  dismissNotification: (id: string) => void;
  clear: () => void;
};

let counter = 0;
const nextId = () => {
  counter += 1;
  return `n_${counter}`;
};

// Usable outside React (via `getState()`) so the API client's error interceptor
// can raise notifications without a hook.
export const notificationsStore = createStore<NotificationsState>((set, get) => ({
  notifications: [],
  showNotification: (n) => {
    const id = nextId();
    set((s) => ({ notifications: [...s.notifications, { id, ...n }] }));
    if (n.duration) {
      setTimeout(() => get().dismissNotification(id), n.duration);
    }
    return id;
  },
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) })),
  clear: () => set({ notifications: [] }),
}));

export const useNotifications = () => useStore(notificationsStore);
