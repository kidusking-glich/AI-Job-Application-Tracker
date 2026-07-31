import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import type { SignupResponse } from '../types';

export default function Signup() {
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
      setSignupResult(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success screen: tell the user to verify their email
  if (signupResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">
              Verify Your Email
            </h1>
            <p className="text-gray-600 mb-4">{signupResult.message}</p>

            {signupResult.devVerificationUrl && (
              <div className="mb-5 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
                <p className="text-yellow-800 font-medium mb-2">
                  ⚠️ Development mode: email service not configured.
                </p>
                <p className="text-gray-700 mb-2">Use this link to verify:</p>
                <a
                  href={signupResult.devVerificationUrl}
                  className="text-ethiopian-green font-semibold hover:underline break-all"
                >
                  {signupResult.devVerificationUrl}
                </a>
              </div>
            )}

            <p className="text-sm text-gray-500 mb-6">
              Already verified?{' '}
              <Link to="/login" className="text-ethiopian-green font-semibold hover:underline">
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
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-ethiopian-green/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-ethiopian-red/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl ethiopian-flag-gradient shadow-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">ኢ</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900">
            Create Account
          </h1>
          <p className="text-gray-500 mt-2">
            Start analyzing your contracts with AI
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 animate-fade-in">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-gray-400">(optional)</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-ethiopian-green font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
