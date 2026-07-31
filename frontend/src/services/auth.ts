import api from './api';
import type { AuthResponse, User, SignupResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
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
