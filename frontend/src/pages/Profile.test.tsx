import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from './Profile';
import type { User } from '../types';

const { getMeMock, updateMeMock, getUserMock, toastMock, getErrorMessageMock } = vi.hoisted(() => ({
  getMeMock: vi.fn(),
  updateMeMock: vi.fn(),
  getUserMock: vi.fn(),
  toastMock: vi.fn(),
  getErrorMessageMock: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock('../services/users', () => ({
  usersService: {
    getMe: getMeMock,
    updateMe: updateMeMock,
  },
}));

vi.mock('../services/auth', () => ({
  authService: {
    getUser: getUserMock,
  },
}));

vi.mock('../services/api', () => ({
  getErrorMessage: getErrorMessageMock,
}));

vi.mock('../components/ToastProvider', () => ({
  useToast: () => toastMock,
}));

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('Profile page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getErrorMessageMock.mockImplementation((_err: unknown, fallback: string) => fallback);
    localStorage.clear();
    getMeMock.mockResolvedValue(mockUser);
  });

  describe('loading & display', () => {
    it('shows a loading spinner while the profile is being fetched', () => {
      // A never-resolving promise keeps the component in the loading state
      // (a bare mock would resolve undefined and crash setName(me.name)).
      getMeMock.mockReturnValue(new Promise(() => {}));
      render(<Profile />);

      expect(screen.getByText('Loading your profile...')).toBeInTheDocument();
    });

    it('renders the user details after a successful fetch', async () => {
      render(<Profile />);

      expect(await screen.findByText('Test User')).toBeInTheDocument();
      // The email appears in the identity header and in the account info row.
      expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
      expect(screen.getByText('✅ Email verified')).toBeInTheDocument();
      expect(screen.getByText('🙂 User')).toBeInTheDocument();
      expect(screen.getByText('⚪ Not enabled')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      expect(getMeMock).toHaveBeenCalledTimes(1);
    });

    it('shows an error toast when the profile fails to load', async () => {
      getMeMock.mockRejectedValue(new Error('boom'));
      render(<Profile />);

      await waitFor(() =>
        expect(toastMock).toHaveBeenCalledWith('Failed to load your profile', 'error'),
      );
      expect(getErrorMessageMock).toHaveBeenCalledWith(expect.any(Error), 'Failed to load your profile');
    });
  });

  describe('updating the display name', () => {
    it('disables the save button when the name is unchanged', async () => {
      render(<Profile />);
      await screen.findByText('Test User');

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('submits the trimmed name, updates state, localStorage and shows success feedback', async () => {
      const updated: User = { ...mockUser, name: 'Updated Name' };
      updateMeMock.mockResolvedValue(updated);
      getUserMock.mockReturnValue(mockUser);

      render(<Profile />);
      await screen.findByText('Test User');

      const input = screen.getByDisplayValue('Test User');
      await userEvent.clear(input);
      await userEvent.type(input, '  Updated Name  ');

      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(updateMeMock).toHaveBeenCalledWith({ name: 'Updated Name' });
      await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Profile updated', 'success'));

      // localStorage is kept in sync for the navbar
      const cached = localStorage.getItem('user');
      expect(cached).not.toBeNull();
      expect(JSON.parse(cached as string)).toMatchObject({ name: 'Updated Name' });

      // Inline "saved" feedback replaces the button label
      expect(await screen.findByText('✓ Saved')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
    });

    it('does not touch localStorage when there is no cached user', async () => {
      const updated: User = { ...mockUser, name: 'Solo' };
      updateMeMock.mockResolvedValue(updated);
      getUserMock.mockReturnValue(null);

      render(<Profile />);
      await screen.findByText('Test User');

      const input = screen.getByDisplayValue('Test User');
      await userEvent.clear(input);
      await userEvent.type(input, 'Solo');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Profile updated', 'success'));
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('shows an error toast when the update fails', async () => {
      updateMeMock.mockRejectedValue(new Error('nope'));
      render(<Profile />);
      await screen.findByText('Test User');

      const input = screen.getByDisplayValue('Test User');
      await userEvent.clear(input);
      await userEvent.type(input, 'Failing');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() =>
        expect(toastMock).toHaveBeenCalledWith('Failed to update profile', 'error'),
      );
      expect(getErrorMessageMock).toHaveBeenCalledWith(expect.any(Error), 'Failed to update profile');
    });
  });
});
