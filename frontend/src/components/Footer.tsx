import { TELEBIRR_PHONE, isTelebirrPlaceholder, GITHUB_URL } from '../constants/support';

export default function Footer() {
  const supportLabel = `Support: ${TELEBIRR_PHONE}`;

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-black/30">
      <div className="h-1 flag-accent" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand + copyright */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2">
            <div className="w-7 h-7 rounded-lg ethiopian-flag-gradient flex items-center justify-center">
              <span className="text-white text-xs font-bold">ኢ</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} Ethiopian Contract Reader · የኮንትራት ተንታኝ
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            AI-powered contract analysis for English & Amharic documents
          </p>
        </div>

        {/* GitHub + support */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="View the developer's GitHub"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400 transition-all duration-200 dark:bg-white/5 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white dark:hover:border-white/30"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            github.com/kidusking-glich
          </a>

          {isTelebirrPlaceholder ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium">
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                ቴ
              </span>
              {supportLabel}
            </span>
          ) : (
            <a
              href={`tel:${TELEBIRR_PHONE.replace(/[^0-9+]/g, '')}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium hover:bg-emerald-500/20 transition-colors"
              title="Donate via Telebirr"
            >
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                ቴ
              </span>
              {supportLabel}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
