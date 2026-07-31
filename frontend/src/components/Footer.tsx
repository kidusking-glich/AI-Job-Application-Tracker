import { TELEBIRR_PHONE, isTelebirrPlaceholder } from '../constants/support';

export default function Footer() {
  const supportLabel = `Support: ${TELEBIRR_PHONE}`;

  return (
    <footer className="mt-12 border-t border-gray-200 bg-white/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Ethiopian Contract Reader · የኮንትራት ተንታኝ
        </p>
        {isTelebirrPlaceholder ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              ቴ
            </span>
            {supportLabel}
          </span>
        ) : (
          <a
            href={`tel:${TELEBIRR_PHONE.replace(/[^0-9+]/g, '')}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium hover:bg-emerald-100 transition-colors"
            title="Donate via Telebirr"
          >
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              ቴ
            </span>
            {supportLabel}
          </a>
        )}
      </div>
    </footer>
  );
}
