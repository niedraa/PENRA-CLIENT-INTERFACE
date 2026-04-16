import { api } from './api';
import type { VocalAgent } from '../types';

export interface CallRecord {
  id: string;
  agentId: string;
  date: string;
  duration: string;
  summary: string;
  transcription: string;
  status: string;
}

export interface AgentStats {
  callsThisMonth: number;
  totalCalls: number;
  averageDuration: string;
  resolutionRate: number;
}

export interface ChartDataPoint {
  date: string;
  calls: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
}

export interface CreateAgentPayload {
  clientId: string;
  name: string;
  phoneNumber?: string;
  voice?: string;
  sector?: string;
  language?: string;
  systemPrompt?: string;
  tone?: string;
}

export const agentService = {
  getAgents: async (clientId?: string): Promise<VocalAgent[]> => {
    const params = clientId ? { clientId } : {};
    const { data } = await api.get<{ data: VocalAgent[]; total: number }>('/agents', { params });
    return data.data;
  },

  getAgent: async (id: string): Promise<VocalAgent> => {
    const { data } = await api.get<VocalAgent>(`/agents/${id}`);
    return data;
  },

  createAgent: async (payload: CreateAgentPayload): Promise<VocalAgent> => {
    const { data } = await api.post<VocalAgent>('/agents', payload);
    return data;
  },

  updateAgent: async (id: string, payload: Partial<CreateAgentPayload>): Promise<VocalAgent> => {
    const { data } = await api.put<VocalAgent>(`/agents/${id}`, payload);
    return data;
  },

  deleteAgent: async (id: string) => {
    await api.delete(`/agents/${id}`);
  },

  provisionPhone: async (id: string): Promise<VocalAgent & { warning?: string; code?: string }> => {
    const { data } = await api.post<VocalAgent & { warning?: string; code?: string }>(
      `/agents/${id}/provision-phone`
    );
    return data;
  },

  getCalls: async (agentId: string): Promise<CallRecord[]> => {
    const { data } = await api.get<{ data: CallRecord[]; total: number }>(`/agents/${agentId}/calls`);
    return data.data;
  },

  getStats: async (agentId: string): Promise<AgentStats> => {
    const { data } = await api.get<AgentStats>(`/agents/${agentId}/stats`);
    return data;
  },

  getChartData: async (agentId: string): Promise<ChartDataPoint[]> => {
    const { data } = await api.get<ChartDataPoint[]>(`/agents/${agentId}/chart-data`);
    return data;
  },

  getElevenLabsVoices: async (): Promise<ElevenLabsVoice[]> => {
    const { data } = await api.get<{ data: ElevenLabsVoice[] }>('/elevenlabs/voices');
    return data.data;
  },

  getIntegrationStatus: async () => {
    const { data } = await api.get('/integrations/status');
    return data;
  },
};
