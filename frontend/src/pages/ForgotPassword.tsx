import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      setError('');
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-gray-400 mt-2">We'll email you a link to choose a new one</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <div className="h-1 flag-accent rounded-full mb-6 -mt-2 w-24 mx-auto" />
          {sent ? (
            <div className="text-center animate-fade-in">
              <div className="text-5xl mb-4">📬</div>
              <p className="text-gray-400 mb-6">
                If that email is registered and verified, a password reset link has been sent to
                your inbox. Check your email (and spam folder).
              </p>
              <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-ethiopian-red/10 border border-ethiopian-red/30 rounded-xl text-sm text-[#fb7185] animate-fade-in">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm text-[#4ade80] font-semibold hover:underline transition-colors">
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
