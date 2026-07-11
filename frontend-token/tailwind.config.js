/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#0a0a0c',
          900: '#121215',
          800: '#1a1a1f',
          700: '#26262d',
          600: '#33333c',
        },
        metal: { 400: '#8b8d97', 300: '#a8aab3' },
        accent: { 400: '#a855f7', 500: '#9333ea', 600: '#7e22ce' },
      },
      animation: {
        'float-coin': 'float-coin 6s ease-in-out infinite',
        'twinkle': 'twinkle 2.5s ease-in-out infinite',
      },
      keyframes: {
        'float-coin': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};