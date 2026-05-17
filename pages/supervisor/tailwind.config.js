/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FDF8EC',
          100: '#FAF0D4',
          200: '#F5E0A6',
          300: '#EFCD6F',
          400: '#E8B83A',
          500: '#D4A843',
          600: '#B8892A',
          700: '#8C6720',
          800: '#5F4616',
          900: '#3D2D0E',
        },
        brand: {
          50: '#EEF4FA',
          100: '#D4E4F2',
          200: '#A9C9E5',
          300: '#7EAED8',
          400: '#5393CB',
          500: '#2D5F8B',
          600: '#254D71',
          700: '#1C3A55',
          800: '#132839',
          900: '#0A151D',
        },
      },
    },
  },
  plugins: [],
}
