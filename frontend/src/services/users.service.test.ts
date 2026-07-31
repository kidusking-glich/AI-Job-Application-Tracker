import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '../types';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

import api from './api';
import { usersService } from './users';

const mockGet = vi.mocked(api.get);
const mockPatch = vi.mocked(api.patch);

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('usersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMe', () => {
    it('fetches the current user from /users/me', async () => {
      mockGet.mockResolvedValue({ data: mockUser });

      const result = await usersService.getMe();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/users/me');
      expect(result).toEqual(mockUser);
    });

    it('rejects when the API call fails', async () => {
      mockGet.mockRejectedValue(new Error('Server error'));

      await expect(usersService.getMe()).rejects.toThrow('Server error');
    });
  });

  describe('updateMe', () => {
    it('sends the updated fields to /users/me via PATCH and returns the user', async () => {
      const updated = { ...mockUser, name: 'New Name' };
      mockPatch.mockResolvedValue({ data: updated });

      const result = await usersService.updateMe({ name: 'New Name' });

      expect(mockPatch).toHaveBeenCalledTimes(1);
      expect(mockPatch).toHaveBeenCalledWith('/users/me', { name: 'New Name' });
      expect(result).toEqual(updated);
    });

    it('propagates an empty payload unchanged', async () => {
      mockPatch.mockResolvedValue({ data: mockUser });

      await usersService.updateMe({});

      expect(mockPatch).toHaveBeenCalledWith('/users/me', {});
    });

    it('rejects when the API call fails', async () => {
      mockPatch.mockRejectedValue(new Error('Network error'));

      await expect(usersService.updateMe({ name: 'x' })).rejects.toThrow('Network error');
    });
  });
});
