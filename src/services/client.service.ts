import { api } from './api';
import type { Client } from '../types';

export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  mrr: number;
}

export const clientService = {
  getClients: async (search?: string): Promise<Client[]> => {
    const params = search ? { search } : {};
    const { data } = await api.get<{ data: Client[]; total: number }>('/clients', { params });
    return data.data;
  },

  getClient: async (id: string): Promise<Client> => {
    const { data } = await api.get<Client>(`/clients/${id}`);
    return data;
  },

  getStats: async (): Promise<ClientStats> => {
    const { data } = await api.get<ClientStats>('/clients/stats');
    return data;
  },

  createClient: async (payload: Partial<Client>): Promise<Client> => {
    const { data } = await api.post<Client>('/clients', payload);
    return data;
  },

  updateClient: async (id: string, payload: Partial<Client>): Promise<Client> => {
    const { data } = await api.put<Client>(`/clients/${id}`, payload);
    return data;
  },

  deleteClient: async (id: string) => {
    await api.delete(`/clients/${id}`);
  },
};
