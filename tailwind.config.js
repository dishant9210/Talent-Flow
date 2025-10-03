// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    // This tells Tailwind which files to scan for class names
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}