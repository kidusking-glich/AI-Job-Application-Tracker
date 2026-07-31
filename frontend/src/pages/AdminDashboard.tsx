import { useEffect, useState } from 'react';
import { adminService } from '../services/admin';
import type { AdminStats, AdminUser, RequestLog } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('requests');

  useEffect(() => {
    (async () => {
      try {
        const [statsData, usersData, requestsData] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers(),
          adminService.getRequests(50),
        ]);
        setStats(statsData);
        setUsers(usersData);
        setRequests(requestsData);
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
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No users yet</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900">{u.name || '—'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {u.isAdmin ? (
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
