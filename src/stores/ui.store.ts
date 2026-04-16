import { create } from 'zustand';

type Notification = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
};

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  modals: Record<string, boolean>;
  openModal: (name: string) => void;
  closeModal: (name: string) => void;

  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  modals: {},
  openModal: (name) => set((state) => ({ modals: { ...state.modals, [name]: true } })),
  closeModal: (name) => set((state) => ({ modals: { ...state.modals, [name]: false } })),

  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: new Date().toISOString() }],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
