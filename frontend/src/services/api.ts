import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip the redirect for auth endpoints: a 401 from login means invalid
    // credentials or an unverified email, and the page must stay put so the
    // error message and "resend verification" flow can be shown.
    const url: string = error.config?.url ?? '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/**
 * Extract a human-readable message from an API/axios error.
 * Backend responses can carry `{ message: string | string[] }` or a plain string.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  const err = error as any;
  const data = err.response?.data;
  const message = data?.message;

  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof err.message === 'string' && err.message.trim()) return err.message;
  return fallback;
}

export default api;
