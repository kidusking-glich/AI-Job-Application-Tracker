import api from './api';
import type { AdminStats, AdminUser, RequestLog } from '../types';

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/admin/stats');
    return data;
  },

  async getUsers(limit = 100): Promise<AdminUser[]> {
    const { data } = await api.get<AdminUser[]>('/admin/users', { params: { limit } });
    return data;
  },

  async getRequests(limit = 50): Promise<RequestLog[]> {
    const { data } = await api.get<RequestLog[]>('/admin/requests', { params: { limit } });
    return data;
  },
};
