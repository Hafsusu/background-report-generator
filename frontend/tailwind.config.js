/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        neonCard: '#1a1a2e',
        neonGreen: {
          50: '#ebffe4',
          100: '#d3ffc4',
          200: '#a9ff90',
          300: '#72ff50',
          400: '#39ff14',
          500: '#1ee600',
          600: '#14b800',
          700: '#0f8b00',
          800: '#116d07',
          900: '#115c0b',
          950: '#023400',
        },
        neonBlue: '#00f3ff',
        neonPurple: '#bc13fe',
        neonPink: '#ff006e',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
