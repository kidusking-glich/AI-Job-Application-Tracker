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

  async updateUserRole(id: string, isAdmin: boolean): Promise<{ id: string; email: string; name?: string; isAdmin: boolean }> {
    const { data } = await api.patch(`/admin/users/${id}/role`, { isAdmin });
    return data;
  },

  async resendVerification(id: string): Promise<{ message: string }> {
    const { data } = await api.post(`/admin/users/${id}/resend-verification`);
    return data;
  },
};
