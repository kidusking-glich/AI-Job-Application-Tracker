import api from './api';
import type { Contract, PaginatedContracts } from '../types';

export const contractsService = {
  async create(data: { title: string; content: string; language?: string }): Promise<Contract> {
    const { data: contract } = await api.post<Contract>('/contracts', data);
    return contract;
  },

  async upload(file: File, title?: string, language?: string): Promise<Contract> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (language) formData.append('language', language);
    const { data: contract } = await api.post<Contract>('/contracts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return contract;
  },

  async getAll(params?: { search?: string; page?: number; limit?: number }): Promise<PaginatedContracts> {
    const { data } = await api.get<PaginatedContracts>('/contracts', { params });
    return data;
  },

  async getOne(id: string): Promise<Contract> {
    const { data } = await api.get<Contract>(`/contracts/${id}`);
    return data;
  },

  async update(id: string, data: { title?: string; language?: string }): Promise<Contract> {
    const { data: contract } = await api.patch<Contract>(`/contracts/${id}`, data);
    return contract;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/contracts/${id}`);
  },
};
