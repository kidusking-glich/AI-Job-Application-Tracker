import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    if (!token) {
      setStatus('error');
      setMessage('Missing reset token. Please use the link from your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.resetPassword(token, password);
      setStatus('success');
      setMessage(res.message);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ethiopian-green/20 blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-ethiopian-red/20 blur-3xl animate-pulse-soft [animation-delay:1s]" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl ethiopian-flag-gradient shadow-flag-glow mx-auto mb-4 flex items-center justify-center animate-float">
            <span className="text-white text-2xl font-bold drop-shadow">ኢ</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">Choose a New Password</h1>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="h-1 flag-accent rounded-full mb-6 -mt-2 w-24 mx-auto" />
          {status === 'success' ? (
            <div className="text-center animate-fade-in">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
              <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                Go to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {status === 'error' && (
                <div className="p-4 bg-ethiopian-red/10 border border-ethiopian-red/30 rounded-xl text-sm text-[#fb7185] animate-fade-in">
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-field"
                  placeholder="Re-enter your new password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm text-emerald-700 dark:text-[#4ade80] font-semibold hover:underline transition-colors">
                  ← Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
