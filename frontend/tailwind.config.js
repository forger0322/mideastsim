/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0A0C10',
        'gold': '#F0B90B',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
      }
    },
  },
  plugins: [],
}