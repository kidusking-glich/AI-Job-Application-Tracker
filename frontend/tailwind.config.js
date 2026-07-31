/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ethiopian: {
          green: '#009640',
          yellow: '#EFCD2E',
          red: '#DA092F',
          gold: '#B8860B',
          dark: '#0a100d',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'Noto Sans Ethiopic', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'flag-glow': '0 0 40px -8px rgba(0,150,64,0.45)',
        'flag-glow-yellow': '0 0 40px -8px rgba(239,205,46,0.4)',
        'flag-glow-red': '0 0 40px -8px rgba(218,9,47,0.4)',
        'card-dark': '0 8px 32px -12px rgba(0,0,0,0.55)',
        'card-dark-lg': '0 20px 60px -20px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'flag-wave': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        float: 'float 5s ease-in-out infinite',
        'flag-wave': 'flag-wave 8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
