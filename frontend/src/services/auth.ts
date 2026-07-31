import api from './api';
import type { AuthResponse, User, SignupResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse | { requiresTwoFactor: true; mfaToken: string }> {
    const { data } = await api.post<AuthResponse | { requiresTwoFactor: true; mfaToken: string }>('/auth/login', { email, password });
    if ('requiresTwoFactor' in data) {
      return data;
    }
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async verify2fa(mfaToken: string, code: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/2fa/verify', { mfaToken, code });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async setup2fa(): Promise<{ secret: string; otpauthUrl: string }> {
    const { data } = await api.post('/auth/2fa/setup');
    return data;
  },

  async enable2fa(code: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/2fa/enable', { code });
    return data;
  },

  async disable2fa(code: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/2fa/disable', { code });
    return data;
  },

  async signup(email: string, password: string, name?: string): Promise<SignupResponse> {
    const { data } = await api.post<SignupResponse>('/auth/signup', { email, password, name });
    return data;
  },

  async verifyEmail(token: string): Promise<{ message: string; user: User }> {
    const { data } = await api.post('/auth/verify-email', { token });
    return data;
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data;
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const { data } = await api.post('/auth/reset-password', { token, password });
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },
};
