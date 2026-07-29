import api from './api';
import type { Analysis } from '../types';

export const analysisService = {
  async analyze(contractId: string): Promise<{ analysisId: string; status: string; message: string }> {
    const { data } = await api.post('/analysis/analyze', { contractId });
    return data;
  },

  async getAll(): Promise<Analysis[]> {
    const { data } = await api.get<Analysis[]>('/analysis');
    return data;
  },

  async getStatus(id: string): Promise<Analysis> {
    const { data } = await api.get<Analysis>(`/analysis/${id}`);
    return data;
  },

  async getFull(id: string): Promise<Analysis> {
    const { data } = await api.get<Analysis>(`/analysis/${id}/full`);
    return data;
  },
};
