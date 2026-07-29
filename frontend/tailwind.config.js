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
          cream: '#F5F0E8',
          dark: '#1a1a2e',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
