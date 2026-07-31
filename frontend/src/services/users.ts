import api from './api';
import type { User } from '../types';

export const usersService = {
  async getMe(): Promise<User> {
    const { data } = await api.get<User>('/users/me');
    return data;
  },

  async updateMe(input: { name?: string }): Promise<User> {
    const { data } = await api.patch<User>('/users/me', input);
    return data;
  },
};
