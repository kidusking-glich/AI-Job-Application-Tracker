import { useEffect, useRef, useState } from 'react';
import { TELEBIRR_PHONE, SUPPORT_MESSAGE, isTelebirrPlaceholder } from '../constants/support';

export default function SupportDonation() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copyNumber = async () => {
    if (isTelebirrPlaceholder) return;
    try {
      await navigator.clipboard.writeText(TELEBIRR_PHONE);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — ignore.
    }
  };

  return (
    <div className="mt-10 glass-card rounded-2xl overflow-hidden animate-fade-in relative">
      <div className="h-1 flag-accent" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 sm:p-8">
        {/* Telebirr logo-ish badge */}
        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-emerald-500/40 shadow-flag-glow">
          <span className="text-2xl font-display font-bold text-emerald-400">ቴ</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-white text-lg mb-1">
            Support Us via Telebirr
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">{SUPPORT_MESSAGE}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={copyNumber}
            disabled={isTelebirrPlaceholder}
            aria-label="Copy Telebirr phone number"
            title={isTelebirrPlaceholder ? 'Set VITE_TELEBIRR_PHONE to enable copying' : 'Copy number'}
            className="px-5 py-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold hover:bg-emerald-500 hover:text-white active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/10 disabled:hover:text-emerald-300"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
          <div className="text-center">
            <p className="text-2xl font-bold tracking-wide text-white">{TELEBIRR_PHONE}</p>
            <p className="text-xs text-gray-500 mt-0.5">Telebirr</p>
          </div>
        </div>
      </div>
    </div>
  );
}
