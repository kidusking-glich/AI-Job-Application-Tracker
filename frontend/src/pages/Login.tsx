import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { getErrorMessage } from '../services/api';
import { useToast } from '../components/ToastProvider';
import { GITHUB_URL } from '../constants/support';

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA step
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authService.login(email, password);
      if ('requiresTwoFactor' in res && res.requiresTwoFactor) {
        setMfaToken(res.mfaToken);
        setLoading(false);
        return;
      }
      toast('Welcome back!', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Login failed. Please try again.');
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.verify2fa(mfaToken as string, mfaCode);
      toast('Signed in successfully', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Invalid two-factor code. Please try again.');
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ethiopian-green/20 blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-ethiopian-red/20 blur-3xl animate-pulse-soft [animation-delay:1s]" />
        <div className="absolute top-1/3 -left-24 w-72 h-72 rounded-full bg-ethiopian-yellow/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl ethiopian-flag-gradient shadow-flag-glow mx-auto mb-5 flex items-center justify-center animate-float">
            <span className="text-white text-3xl font-bold drop-shadow-lg">ኢ</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sign in to analyze your contracts
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card rounded-2xl p-8">
          <div className="h-1 flag-accent rounded-full mb-6 -mt-2 w-24 mx-auto" />
          {mfaToken && (
            <div className="mb-6 p-4 bg-ethiopian-green/10 border border-ethiopian-green/30 rounded-xl text-sm text-emerald-300">
              🔐 Enter the 6-digit code from your authenticator app.
            </div>
          )}
          <form onSubmit={mfaToken ? handleVerify2fa : handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-ethiopian-red/10 border border-ethiopian-red/30 rounded-xl text-sm text-[#fb7185] animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex justify-end -mt-2">
              <Link to="/forgot-password" className="text-sm text-emerald-700 dark:text-[#4ade80] font-semibold hover:underline hover:text-emerald-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            {mfaToken && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Two-factor code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center tracking-[0.4em] font-bold text-lg"
                  placeholder="••••••"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mfaToken ? 'Verifying...' : 'Signing in...'}
                </>
              ) : mfaToken ? (
                'Verify & Sign In'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-emerald-700 dark:text-[#4ade80] font-semibold hover:underline transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            github.com/kidusking-glich
          </a>
        </div>
      </div>
    </div>
  );
}
