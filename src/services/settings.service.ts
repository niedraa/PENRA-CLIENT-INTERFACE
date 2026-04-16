import { api } from './api';

export interface AppSettings {
  webhookUrl: string;
  calendlyUrl: string;
  twilioToken: string;
  elevenLabsKey: string;
  defaultSystemPrompt: string;
}

export const settingsService = {
  get: async (): Promise<AppSettings> => {
    const { data } = await api.get<AppSettings>('/settings');
    return data;
  },

  update: async (payload: Partial<AppSettings>): Promise<AppSettings> => {
    const { data } = await api.put<AppSettings>('/settings', payload);
    return data;
  },

  getIntegrationStatus: async () => {
    const { data } = await api.get('/integrations/status');
    return data;
  },
};
