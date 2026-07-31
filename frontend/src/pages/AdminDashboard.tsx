import { useEffect, useState } from 'react';
import { adminService } from '../services/admin';
import { authService } from '../services/auth';
import type { AdminStats, AdminUser, RequestLog, SystemHealth } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  PATCH: 'bg-orange-100 text-orange-800',
  DELETE: 'bg-red-100 text-red-800',
};

function statusColor(code: number): string {
  if (code < 300) return 'text-emerald-600';
  if (code < 500) return 'text-yellow-600';
  return 'text-red-600';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('requests');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const currentUser = authService.getUser();

  // Create-admin form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await adminService.createUser({
        email: newEmail,
        name: newName || undefined,
        password: newPassword,
      });
      setUsers((prev) => [res.user, ...prev]);
      setNotice({ type: 'success', text: res.message });
      setShowCreateForm(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create admin user.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRole = async (user: AdminUser) => {
    const target = !user.isAdmin;
    setBusyId(user.id);
    setNotice(null);
    try {
      await adminService.updateUserRole(user.id, target);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isAdmin: target } : u)));
      setNotice({
        type: 'success',
        text: target ? `${user.email} is now an admin.` : `${user.email} is no longer an admin.`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update role.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    setBusyId(user.id);
    setConfirmDeleteId(null);
    setNotice(null);
    try {
      const res = await adminService.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setNotice({ type: 'success', text: res.message });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete user.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleResendVerification = async (user: AdminUser) => {
    setBusyId(user.id);
    setNotice(null);
    try {
      const res = await adminService.resendVerification(user.id);
      setNotice({ type: 'success', text: res.message });
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send verification email.',
      });
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [statsData, usersData, requestsData, healthData] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers(),
          adminService.getRequests(50),
          adminService.getHealth(),
        ]);
        setStats(statsData);
        setUsers(usersData);
        setRequests(requestsData);
        setHealth(healthData);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-8 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        {error}
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, emoji: '👥', accent: 'from-emerald-500 to-teal-600' },
    { label: 'Verified Users', value: stats?.verifiedUsers ?? 0, emoji: '✅', accent: 'from-green-500 to-emerald-600' },
    { label: 'Contracts', value: stats?.totalContracts ?? 0, emoji: '📄', accent: 'from-blue-500 to-indigo-600' },
    { label: 'Analyses', value: stats?.totalAnalyses ?? 0, emoji: '🤖', accent: 'from-purple-500 to-violet-600' },
    { label: 'Requests Today', value: stats?.requestsToday ?? 0, emoji: '📈', accent: 'from-orange-500 to-amber-600' },
    { label: 'Requests (Total)', value: stats?.totalRequests ?? 0, emoji: '🌐', accent: 'from-red-500 to-rose-600' },
  ];

  const maxDayCount = Math.max(1, ...(stats?.requestsByDay.map((d) => d.count) ?? [1]));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-lg">🛡️</span>
          Admin Dashboard
        </h1>
        <p className="text-gray-500 mt-2">How many people are using the app and how many requests have been made.</p>
      </div>

      {/* System health card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">🩺 System Health</h2>
          <span className="text-xs text-gray-400">Checked {health ? new Date(health.db.checkedAt).toLocaleTimeString() : '—'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Database */}
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${health?.db.status === 'up' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-500">
                {health?.db.status === 'up' ? `Connected · ${health.db.latencyMs}ms` : 'Unreachable'}
              </p>
            </div>
          </div>
          {/* Last cleanup */}
          <div className="flex items-center gap-3">
            <span className="text-lg">🗑️</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Last cleanup</p>
              <p className="text-xs text-gray-500">
                {health?.cleanup.lastRunAt ? `${timeAgo(health.cleanup.lastRunAt)} · ${health.cleanup.lastDeletedCount} deleted` : 'Not run yet'}
              </p>
            </div>
          </div>
          {/* Cleanup status */}
          <div className="flex items-center gap-3">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Cleanup status</p>
              <p className="text-xs text-gray-500">
                {!health
                  ? '—'
                  : health.cleanup.lastRunSucceeded === null
                    ? 'Pending first run'
                    : health.cleanup.lastRunSucceeded
                      ? 'Last run succeeded'
                      : 'Last run failed'}
              </p>
            </div>
          </div>
          {/* Retention */}
          <div className="flex items-center gap-3">
            <span className="text-lg">⏳</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Retention</p>
              <p className="text-xs text-gray-500">
                {health ? `${health.cleanup.retentionDays} days · every ${health.cleanup.intervalHours}h` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.accent} flex items-center justify-center mb-3`}>
              <span className="text-sm">{card.emoji}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Requests per day chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">📊 Requests — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-40">
            {(stats?.requestsByDay ?? []).map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-xs text-gray-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.count}
                </span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-ethiopian-green/70 to-ethiopian-green group-hover:from-ethiopian-green group-hover:to-ethiopian-yellow transition-colors"
                  style={{ height: `${Math.max(4, (day.count / maxDayCount) * 100)}%` }}
                />
                <span className="text-[10px] text-gray-400">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top endpoints */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">🏆 Top Endpoints (7 days)</h2>
          {(stats?.topEndpoints ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No requests yet</p>
          ) : (
            <ul className="space-y-2">
              {stats?.topEndpoints.map((ep) => (
                <li key={`${ep.method}-${ep.path}`} className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${METHOD_COLORS[ep.method] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ep.method}
                  </span>
                  <span className="flex-1 text-gray-700 font-mono text-xs truncate">{ep.path}</span>
                  <span className="text-gray-400 text-xs">{ep.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create admin user */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-semibold text-gray-900">👑 Create Admin User</h2>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showCreateForm
                ? 'bg-gray-100 text-gray-600'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {showCreateForm ? 'Cancel' : '+ New admin'}
          </button>
        </div>
        {showCreateForm && (
          <form onSubmit={handleCreateAdmin} className="px-6 pb-6 space-y-4 animate-fade-in">
            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {createError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field"
                  placeholder="Their name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-field"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                The account is created as an admin and marked verified — they can sign in immediately but cannot access this dashboard (super-admin only).
              </p>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  '👑 Create admin'
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['requests', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {tab === 'requests' ? '🌐 Recent Requests' : '👥 Users'}
          </button>
        ))}
      </div>

      {/* Requests table */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No requests logged yet</td></tr>
                )}
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${METHOD_COLORS[r.method] ?? 'bg-gray-100 text-gray-700'}`}>
                        {r.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 max-w-[240px] truncate">{r.path}</td>
                    <td className={`px-4 py-2.5 font-bold ${statusColor(r.statusCode)}`}>{r.statusCode}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.responseTimeMs != null ? `${r.responseTimeMs}ms` : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.user?.email ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.ip ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users table */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {notice && (
            <div
              className={`px-4 py-3 text-sm border-b animate-fade-in ${
                notice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}
            >
              {notice.text}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Contracts</th>
                  <th className="px-4 py-3">Analyses</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No users yet</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{u.name || '—'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {u.isSuperAdmin ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-gray-900 text-white">👑 Super Admin</span>
                      ) : u.isAdmin ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800">🛡️ Admin</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600">User</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {u.emailVerifiedAt ? (
                        <span className="text-emerald-600">✅ Verified</span>
                      ) : (
                        <span className="text-yellow-600">⏳ Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{u._count.contracts}</td>
                    <td className="px-4 py-2.5 text-gray-700">{u._count.analyses}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        {currentUser?.id === u.id ? (
                          <span className="px-2 py-1 text-xs text-gray-400 italic">(you — cannot demote yourself)</span>
                        ) : (
                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={busyId === u.id}
                            className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                              u.isAdmin
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                            }`}
                          >
                            {busyId === u.id ? '...' : u.isAdmin ? '⬇ Demote' : '⬆ Promote to admin'}
                          </button>
                        )}
                        {!u.emailVerifiedAt && (
                          <button
                            onClick={() => handleResendVerification(u)}
                            disabled={busyId === u.id}
                            className="px-2 py-1 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {busyId === u.id ? '...' : '📧 Resend verification'}
                          </button>
                        )}
                        {currentUser?.id !== u.id && !u.isSuperAdmin && (
                          <button
                            onClick={() =>
                              confirmDeleteId === u.id ? handleDeleteUser(u) : setConfirmDeleteId(u.id)
                            }
                            onBlur={() => setConfirmDeleteId((v) => (v === u.id ? null : v))}
                            disabled={busyId === u.id}
                            className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                              confirmDeleteId === u.id
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {busyId === u.id
                              ? '...'
                              : confirmDeleteId === u.id
                                ? '⚠️ Confirm delete?'
                                : '🗑 Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
