import { api } from './api';

export interface IgAccount {
  username: string;
  displayName: string;
  profilePicUrl: string;
  followers: number;
  following: number;
  postsCount: number;
  bio: string;
  connectedAt: string;
}

export interface IgPost {
  id: string;
  imageUrl: string;
  caption: string;
  likes: number;
  commentsCount: number;
  timestamp: string;
  permalink: string;
}

export interface IgAutomation {
  id: string;
  clientId: string;
  postId: string;
  postUrl: string;
  triggerKeyword: string;
  dmMessage: string;
  enabled: boolean;
  createdAt: string;
  commentsSeen: number;
  dmsSent: number;
  webhookUrl?: string;
}

export interface IgStats {
  commentsProcessed: number;
  dmSent: number;
  responseRate: number;
}

export interface CreateAutomationPayload {
  postId: string;
  postUrl: string;
  triggerKeyword: string;
  dmMessage: string;
  enabled: boolean;
}

export const instagramService = {
  getOAuthUrl: async () => {
    const { data } = await api.get<{ url: string; state: string }>('/instagram/oauth/url');
    return data;
  },

  connectAccount: async (code: string) => {
    const { data } = await api.post<IgAccount>('/instagram/connect', { code });
    return data;
  },

  getAccount: async (): Promise<IgAccount | null> => {
    const { data } = await api.get<IgAccount | null>('/instagram/account');
    return data;
  },

  disconnectAccount: async () => {
    await api.delete('/instagram/account');
  },

  getPosts: async (): Promise<IgPost[]> => {
    const { data } = await api.get<{ data: IgPost[] }>('/instagram/posts');
    return data.data;
  },

  getAutomations: async (): Promise<IgAutomation[]> => {
    const { data } = await api.get<{ data: IgAutomation[] }>('/instagram/automations');
    return data.data;
  },

  createAutomation: async (payload: CreateAutomationPayload): Promise<IgAutomation> => {
    const { data } = await api.post<IgAutomation>('/instagram/automations', payload);
    return data;
  },

  updateAutomation: async (
    id: string,
    payload: Partial<Pick<IgAutomation, 'triggerKeyword' | 'dmMessage' | 'postUrl' | 'enabled'>>
  ): Promise<IgAutomation> => {
    const { data } = await api.put<IgAutomation>(`/instagram/automations/${id}`, payload);
    return data;
  },

  toggleAutomation: async (id: string): Promise<IgAutomation> => {
    const { data } = await api.post<IgAutomation>(`/instagram/automations/${id}/toggle`);
    return data;
  },

  deleteAutomation: async (id: string) => {
    await api.delete(`/instagram/automations/${id}`);
  },

  getStats: async (): Promise<IgStats> => {
    const { data } = await api.get<IgStats>('/instagram/stats');
    return data;
  },

  getLogs: async () => {
    const { data } = await api.get<{ data: unknown[] }>('/instagram/logs');
    return data.data;
  },
};
