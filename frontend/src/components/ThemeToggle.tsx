import { useState } from 'react';
import { applyTheme, isDarkTheme } from '../theme';

export default function ThemeToggle() {
  const [dark, setDark] = useState(isDarkTheme);

  const toggle = () => {
    const next = !dark;
    applyTheme(next ? 'dark' : 'light');
    setDark(next);
  };

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-5 right-5 z-[70] w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-flag-glow border border-gray-300 bg-white hover:bg-gray-100 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/20"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
