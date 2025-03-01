/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base-yellow': '#FFED90',
        'ivory': '#FFFAE0',
        'dark-gray': '#353535',
        'point-yellow': '#FFD600',
      },
      fontFamily: {
        'sans': ['Noto Sans KR', 'Roboto', 'sans-serif'],
      },
      fontWeight: {
        'regular': 400,
        'bold': 700,
      },
    },
  },
  plugins: [],
} 