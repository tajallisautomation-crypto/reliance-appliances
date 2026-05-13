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
          50:  '#EBF2FA',
          100: '#C4D5EC',
          200: '#99B6DD',
          300: '#6A94CC',
          400: '#3F74B8',
          500: '#123F73',
          600: '#0F3560',
          700: '#0B2545',
          900: '#06152A',
        },
        accent: {
          50:  '#E8EDF3',
          100: '#C7D3E1',
          400: '#5B84B1',
          500: '#123F73',
          600: '#0B2545',
          700: '#06152A',
        },
        gold: {
          300: '#FFE566',
          400: '#FFD200',
          500: '#F6C400',
          600: '#C9A000',
          700: '#9B7A00',
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
          50:  '#E8F5E9',
          100: '#C8E6C9',
          400: '#4CAF50',
          500: '#2E7D32',
          600: '#1F8A4C',
          700: '#1B5E20',
          900: '#0A2E0A',
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
        'eco':        '0 4px 20px rgba(46,125,50,0.25)',
        'brand':      '0 4px 20px rgba(18,63,115,0.35)',
      },
    }
  },
  plugins: [],
}
