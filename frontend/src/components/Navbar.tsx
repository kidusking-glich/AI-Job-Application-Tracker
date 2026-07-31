import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';
import { GITHUB_URL } from '../constants/support';

export default function Navbar() {
  const location = useLocation();
  const user = authService.getUser();
  const isAuth = authService.isAuthenticated();

  // Don't show navbar on login/signup
  if (location.pathname === '/login' || location.pathname === '/signup') return null;

  const navLinks = [
    { to: '/', label: 'Dashboard', emoji: '📋' },
    { to: '/new', label: 'New Contract', emoji: '📄' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl ethiopian-flag-gradient shadow-flag-glow flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <span className="text-white text-lg font-bold drop-shadow">ኢ</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-bold text-white leading-tight">
                Contract Reader
              </h1>
              <p className="text-xs text-gray-400">የኮንትራት ተንታኝ</p>
            </div>
          </Link>

          {/* Right side */}
          {isAuth ? (
            <div className="flex items-center gap-1">
              {/* GitHub link */}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="View on GitHub"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span className="hidden lg:inline">GitHub</span>
              </a>

              {user?.isSuperAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    location.pathname === '/admin'
                      ? 'bg-white/15 text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>🛡️</span>
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-ethiopian-green/25 text-[#4ade80] shadow-flag-glow'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{link.emoji}</span>
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                );
              })}

              {/* User Menu */}
              <div className="ml-4 pl-4 border-l border-white/15 flex items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ethiopian-green to-ethiopian-red flex items-center justify-center text-white text-sm font-bold shadow-flag-glow">
                    {(user?.name || user?.email || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300 hidden md:block">
                    {user?.name || user?.email}
                  </span>
                </div>
                <button
                  onClick={() => authService.logout()}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-[#fb7185] hover:bg-ethiopian-red/10 rounded-lg transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="View on GitHub"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span className="hidden lg:inline">GitHub</span>
              </a>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary !px-5 !py-2 text-sm">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Ethiopian flag accent line */}
      <div className="h-1 flag-accent" />
    </nav>
  );
}
