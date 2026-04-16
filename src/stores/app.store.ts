import { create } from 'zustand';
import type {
  Client,
  VocalAgent,
  Invoice,
  Commission,
  IGAutomation,
  AppSettings,
} from '../types';

interface AppStore {
  clients: Client[];
  agents: VocalAgent[];
  invoices: Invoice[];
  commissions: Commission[];
  igAutomations: IGAutomation[];
  settings: AppSettings | null;
  initialized: boolean;

  init: (data: Partial<AppStore>) => void;
  reset: () => void;

  setClients: (clients: Client[]) => void;
  createClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  clients: [],
  agents: [],
  invoices: [],
  commissions: [],
  igAutomations: [],
  settings: null,
  initialized: false,

  init: (data) => set({ ...data, initialized: true }),
  reset: () =>
    set({
      clients: [],
      agents: [],
      invoices: [],
      commissions: [],
      igAutomations: [],
      settings: null,
      initialized: false,
    }),

  setClients: (clients) => set({ clients }),
  createClient: (client) =>
    set((state) => ({ clients: [...state.clients, client] })),
  updateClient: (id, client) =>
    set((state) => ({
      clients: state.clients.map((c) => (c.id === id ? { ...c, ...client } : c)),
    })),
  deleteClient: (id) =>
    set((state) => ({
      clients: state.clients.filter((c) => c.id !== id),
    })),
}));
