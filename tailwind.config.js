/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#bc36ad',
          light: '#d896d0',
          dark: '#8e2a82',
          50: '#faf5f9',
          100: '#f5ebf3',
          200: '#ead7e7',
          300: '#d896d0',
          400: '#c965bb',
          500: '#bc36ad',
          600: '#8e2a82',
          700: '#6d2165',
          800: '#5a1c54',
          900: '#4b1a47',
        },
      },
    },
  },
  plugins: [],
};
