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
        metal: {
          400: '#8b8d97',
          300: '#a8aab3',
        },
        accent: {
          400: '#a855f7',
          500: '#9333ea',
          600: '#7e22ce',
        },
      },
      animation: {
        'drift-rotate': 'drift-rotate 60s linear infinite',
      },
      keyframes: {
        'drift-rotate': {
          '0%': { transform: 'rotate(0deg) translate(0, 0) scale(1)' },
          '50%': { transform: 'rotate(180deg) translate(20px, -15px) scale(1.05)' },
          '100%': { transform: 'rotate(360deg) translate(0, 0) scale(1)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
