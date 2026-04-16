import { api } from './api';
import type { Invoice } from '../types';

export const invoiceService = {
  getInvoices: async (): Promise<Invoice[]> => {
    const { data } = await api.get<{ data: Invoice[]; total: number }>('/invoices');
    return data.data;
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const { data } = await api.get<Invoice>(`/invoices/${id}`);
    return data;
  },

  createInvoice: async (payload: {
    clientId: string;
    items: { description: string; quantity: number; unitPrice: number }[];
  }): Promise<Invoice> => {
    const { data } = await api.post<Invoice>('/invoices', payload);
    return data;
  },

  markPaid: async (id: string): Promise<Invoice> => {
    const { data } = await api.put<Invoice>(`/invoices/${id}/mark-paid`);
    return data;
  },
};
