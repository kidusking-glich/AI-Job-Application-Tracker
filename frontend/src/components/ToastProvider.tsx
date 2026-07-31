import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export const TOAST_DURATION_MS = 4500;

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastType, { icon: string; bar: string; box: string }> = {
  success: {
    icon: '✅',
    bar: 'bg-gradient-to-r from-ethiopian-green to-emerald-500',
    box: 'border-emerald-500/30',
  },
  error: {
    icon: '❌',
    bar: 'bg-gradient-to-r from-ethiopian-red to-rose-500',
    box: 'border-ethiopian-red/30',
  },
  info: {
    icon: '💡',
    bar: 'bg-gradient-to-r from-ethiopian-yellow to-amber-400',
    box: 'border-ethiopian-yellow/30',
  },
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const style = TOAST_STYLES[item.type];
  return (
    <div
      role="status"
      className={`toast-animate glass-card rounded-xl border ${style.box} overflow-hidden pointer-events-auto`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-base leading-none mt-0.5">{style.icon}</span>
        <p className="flex-1 text-sm text-gray-800 dark:text-gray-200 leading-snug">{item.message}</p>
        <button
          onClick={() => onDismiss(item.id)}
          className="text-gray-500 hover:text-white transition-colors text-sm leading-none px-1"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
      {/* Auto-dismiss progress bar */}
      <div
        className={`h-0.5 ${style.bar}`}
        style={{ animation: `toast-progress ${TOAST_DURATION_MS}ms linear forwards` }}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  // Clear any pending timers on unmount
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++nextId.current;
      setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
      const timer = setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, type?: ToastType) => void {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx.toast;
}
