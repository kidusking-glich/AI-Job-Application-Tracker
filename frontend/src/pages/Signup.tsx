import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { getErrorMessage } from '../services/api';
import { useToast } from '../components/ToastProvider';
import type { SignupResponse } from '../types';

export default function Signup() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupResult, setSignupResult] = useState<SignupResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.signup(email, password, name || undefined);
      toast('Account created! Check your email to verify.', 'success');
      setSignupResult(result);
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Signup failed. Please try again.');
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Success screen: tell the user to verify their email
  if (signupResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ethiopian-green/20 blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-ethiopian-red/20 blur-3xl animate-pulse-soft [animation-delay:1s]" />
        </div>
        <div className="w-full max-w-md animate-fade-in relative">
          <div className="glass-card rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-2xl ethiopian-flag-gradient shadow-flag-glow mx-auto mb-5 flex items-center justify-center animate-float">
              <span className="text-white text-2xl font-bold drop-shadow">ኢ</span>
            </div>
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-3">
              Verify Your Email
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{signupResult.message}</p>

            {signupResult.devVerificationUrl && (
              <div className="mb-5 p-4 bg-ethiopian-yellow/10 border border-ethiopian-yellow/30 rounded-xl text-sm">
                <p className="text-yellow-700 dark:text-ethiopian-yellow font-medium mb-2">
                  ⚠️ Development mode: email service not configured.
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-2">Use this link to verify:</p>
                <a
                  href={signupResult.devVerificationUrl}
                  className="text-emerald-700 dark:text-[#4ade80] font-semibold hover:underline break-all"
                >
                  {signupResult.devVerificationUrl}
                </a>
              </div>
            )}

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Already verified?{' '}
              <Link to="/login" className="text-emerald-700 dark:text-[#4ade80] font-semibold hover:underline transition-colors">
                Sign in
              </Link>
            </p>

            <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ethiopian-green/20 blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-ethiopian-red/20 blur-3xl animate-pulse-soft [animation-delay:1s]" />
        <div className="absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-ethiopian-yellow/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl ethiopian-flag-gradient shadow-flag-glow mx-auto mb-5 flex items-center justify-center animate-float">
            <span className="text-white text-3xl font-bold drop-shadow-lg">ኢ</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
            Create Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Start analyzing your contracts with AI
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="h-1 flag-accent rounded-full mb-6 -mt-2 w-24 mx-auto" />
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-ethiopian-red/10 border border-ethiopian-red/30 rounded-xl text-sm text-[#fb7185] animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Name <span className="text-gray-600 dark:text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Your name"
              />
            </div>

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
                placeholder="At least 6 characters"
                required
                minLength={6}
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-700 dark:text-[#4ade80] font-semibold hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
