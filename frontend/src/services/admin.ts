import api from './api';
import type { AdminStats, AdminUser, CreateAdminUserInput, RequestLog, SuperAdminStatus, SystemHealth } from '../types';

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

  async getHealth(): Promise<SystemHealth> {
    const { data } = await api.get<SystemHealth>('/admin/health');
    return data;
  },

  async getSuperAdminStatus(): Promise<SuperAdminStatus> {
    const { data } = await api.get<SuperAdminStatus>('/admin/super-admin-status');
    return data;
  },

  async createUser(input: CreateAdminUserInput): Promise<{ message: string; user: AdminUser }> {
    const { data } = await api.post('/admin/users', input);
    return data;
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data;
  },

  async transferSuperAdmin(id: string): Promise<{ message: string }> {
    const { data } = await api.post(`/admin/users/${id}/transfer-super-admin`);
    return data;
  },
};
