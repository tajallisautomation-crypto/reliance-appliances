/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          900: '#7c2d12',
        },
        accent: {
          50:  '#eff4fb',
          100: '#d6e2f0',
          400: '#4d7cc8',
          500: '#1b3a6e',
          600: '#152d55',
          700: '#0f2040',
        },
        wa: {
          DEFAULT: '#25d366',
          hover:   '#1ebe57',
        },
        fb: {
          DEFAULT: '#1877f2',
          hover:   '#0d65d9',
        },
        eco: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease',
        'slide-up':  'slideUp 0.4s ease',
        'slide-in':  'slideIn 0.35s ease',
        'pulse-eco': 'pulseEco 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' },                                          to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(16px)' },           to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:  { from: { opacity: '0', transform: 'translateX(-12px)' },          to: { opacity: '1', transform: 'translateX(0)' } },
        pulseEco: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
      boxShadow: {
        'apple':      '0 2px 8px rgba(0,0,0,0.08)',
        'apple-lg':   '0 4px 16px rgba(0,0,0,0.10)',
        'apple-xl':   '0 8px 32px rgba(0,0,0,0.12)',
        'apple-2xl':  '0 16px 48px rgba(0,0,0,0.16)',
        'soft':       '0 4px 24px rgba(0,0,0,0.06)',
        'eco':        '0 4px 20px rgba(34,197,94,0.25)',
        'brand':      '0 4px 20px rgba(249,115,22,0.35)',
      },
    }
  },
  plugins: [],
}
