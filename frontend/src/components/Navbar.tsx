import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/auth';

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
    <nav className="sticky top-0 z-50 glass-card border-b border-ethiopian-yellow/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl ethiopian-flag-gradient shadow-md flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <span className="text-white text-lg font-bold">ኢ</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-bold text-gray-900 leading-tight">
                Contract Reader
              </h1>
              <p className="text-xs text-gray-500">የኮንትራት ተንታኝ</p>
            </div>
          </Link>

          {/* Navigation Links */}
          {isAuth && (
            <div className="flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-ethiopian-green/10 text-ethiopian-green shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{link.emoji}</span>
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                );
              })}

              {/* User Menu */}
              <div className="ml-4 pl-4 border-l border-gray-200 flex items-center gap-3">
                <span className="text-sm text-gray-500 hidden sm:block">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={() => authService.logout()}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-ethiopian-red hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ethiopian flag accent line */}
      <div className="h-1 ethiopian-flag-gradient-horizontal" />
    </nav>
  );
}
