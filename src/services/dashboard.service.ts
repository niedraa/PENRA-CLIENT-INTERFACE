import { api } from './api';

export interface AdminDashboard {
  mrr: number;
  activeClients: number;
  totalCalls: number;
  activeAutomations: number;
  mrrChange: number;
  clientsChange: number;
  callsChange: number;
  automationsChange: number;
  revenueChart: { month: string; revenue: number }[];
  recentActivity: { id: string; type: string; message: string; timestamp: string }[];
}

export interface ClientDashboard {
  dmsThisMonth: number;
  commentsThisMonth: number;
  callsThisMonth: number;
  responseRate: number;
  dmsChange: number;
  commentsChange: number;
  callsChange: number;
  responseRateChange: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export const dashboardService = {
  getAdminDashboard: async (): Promise<AdminDashboard> => {
    const { data } = await api.get<AdminDashboard>('/dashboard/admin');
    return data;
  },

  getClientDashboard: async (clientId: string): Promise<ClientDashboard> => {
    const { data } = await api.get<ClientDashboard>(`/dashboard/client/${clientId}`);
    return data;
  },

  getRecentActivity: async (limit = 10): Promise<ActivityItem[]> => {
    const { data } = await api.get<ActivityItem[]>(`/dashboard/recent-activity?limit=${limit}`);
    return data;
  },
};
