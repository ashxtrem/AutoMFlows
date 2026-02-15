/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-primary)',
        surface: 'var(--node-bg)',
        surfaceHighlight: 'var(--bg-secondary)',
        header: 'var(--header-bg)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        border: 'var(--border-color)',
      },
    },
  },
  plugins: [],
}

