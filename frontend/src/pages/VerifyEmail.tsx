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
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
          <div className="text-5xl mb-4">
            {status === 'loading' && <div className="w-12 h-12 mx-auto border-4 border-ethiopian-green/20 border-t-ethiopian-green rounded-full animate-spin" />}
            {status === 'success' && '✅'}
            {status === 'error' && '⚠️'}
          </div>

          <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </h1>

          <p className="text-gray-600 mb-6">{message}</p>

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
