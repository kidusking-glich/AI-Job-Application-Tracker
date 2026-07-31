const THEME_KEY = 'theme';
export type Theme = 'dark' | 'light';

/** Colors matching the body backgrounds in index.css (dark: #0a100d, light: #f4f6f3). */
const THEME_COLOR_META = 'theme-color';
const THEME_COLORS: Record<Theme, string> = {
  dark: '#0a100d',
  light: '#f4f6f3',
};

export function getStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Keep the browser chrome (mobile status bar / address bar) in sync with the theme. */
export function applyThemeColor(theme: Theme) {
  document
    .querySelector(`meta[name="${THEME_COLOR_META}"]`)
    ?.setAttribute('content', THEME_COLORS[theme]);
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  applyThemeColor(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage errors (e.g. private mode)
  }
}

/** Dark mode is the default unless the user explicitly opted into light. */
export function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark');
}
