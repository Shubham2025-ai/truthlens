/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        ink: '#0d0d0d',
        surface: '#fafaf8',
        accent: '#c0392b',
        'accent-light': '#e74c3c',
      }
    },
  },
  plugins: [],
}
