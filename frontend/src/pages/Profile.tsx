import { useState, useEffect, useRef } from 'react';
import { usersService } from '../services/users';
import { authService } from '../services/auth';
import { getErrorMessage } from '../services/api';
import { useToast } from '../components/ToastProvider';
import type { User } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Profile() {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await usersService.getMe();
        setUser(me);
        setName(me.name ?? '');
      } catch (err) {
        toast(getErrorMessage(err, 'Failed to load your profile'), 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await usersService.updateMe({ name: name.trim() });
      setUser(updated);
      setName(updated.name ?? '');
      // Keep localStorage in sync so the navbar reflects the new name.
      const cached = authService.getUser();
      if (cached) {
        localStorage.setItem('user', JSON.stringify({ ...cached, name: updated.name ?? '' }));
      }
      toast('Profile updated', 'success');
      setSavedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      toast(getErrorMessage(err, 'Failed to update profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Clear the saved-flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner size="lg" text="Loading your profile..." />
      </div>
    );
  }

  if (!user) return null;

  const infoRows = [
    { label: 'Email', value: user.email, icon: '✉️' },
    {
      // Email verification is disabled — all accounts are verified on signup.
      label: 'Account status',
      value: '✅ Email verified',
      icon: '🔐',
    },
    {
      label: 'Role',
      value: user.isSuperAdmin ? '👑 Super Admin' : user.isAdmin ? '🛡️ Admin' : '🙂 User',
      icon: '🎭',
    },
    {
      label: 'Two-factor auth',
      value: user.twoFactorEnabled ? '🟢 Enabled' : '⚪ Not enabled',
      icon: '🔑',
    },
    {
      label: 'Member since',
      value: new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      icon: '📅',
    },
  ];

  return (
    <div className="page-container animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h1 className="section-title">Profile</h1>
        <p className="section-subtitle">Manage your account details</p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="h-1 flag-accent" />

        {/* Identity header */}
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ethiopian-green to-ethiopian-red flex items-center justify-center text-white text-2xl font-bold shadow-flag-glow">
            {(user.name || user.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white truncate">{user.name || 'Unnamed'}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Edit name */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Display name</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Your name"
                  maxLength={80}
                />
                <button
                  type="submit"
                  disabled={saving || name.trim() === (user.name ?? '')}
                  className="btn-primary !px-5 !py-2 text-sm whitespace-nowrap flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : savedFlash ? (
                    '✓ Saved'
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Account info */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-500 uppercase tracking-wide">Account information</h3>
            {infoRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base">{row.icon}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
                </div>
                <span className="text-sm text-gray-900 dark:text-gray-100 font-medium text-right break-all">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
