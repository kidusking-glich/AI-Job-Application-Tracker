import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token. Please use the link from your email.');
        return;
      }
      try {
        const res = await authService.verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
          setMessage(res.message);
        }
      } catch (err: any) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.response?.data?.message || 'Verification failed. Please try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-ethiopian-green/20 blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-ethiopian-red/20 blur-3xl animate-pulse-soft [animation-delay:1s]" />
      </div>
      <div className="w-full max-w-md animate-fade-in relative">
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl ethiopian-flag-gradient shadow-flag-glow mx-auto mb-5 flex items-center justify-center">
            <span className="text-white text-2xl font-bold drop-shadow">ኢ</span>
          </div>
          <div className="text-5xl mb-4">
            {status === 'loading' && <div className="w-12 h-12 mx-auto border-4 border-white/10 border-t-ethiopian-green rounded-full animate-spin" />}
            {status === 'success' && '✅'}
            {status === 'error' && '⚠️'}
          </div>

          <h1 className="text-2xl font-display font-bold text-white mb-3">
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </h1>

          <p className="text-gray-400 mb-6">{message}</p>

          {status !== 'loading' && (
            <Link
              to="/login"
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Go to Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
