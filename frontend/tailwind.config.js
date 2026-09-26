/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // This is the correct v3 syntax to disable OS-level dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}