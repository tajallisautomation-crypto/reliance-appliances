/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EEF3F8',
          100: '#C8D8EA',
          200: '#91B4D5',
          300: '#6294BC',
          400: '#3A6B9E',
          500: '#0F2D52',
          600: '#0C2444',
          700: '#091B35',
          900: '#050E1C',
        },
        accent: {
          50:  '#EEF3F8',
          100: '#C8D8EA',
          400: '#3A6B9E',
          500: '#0F2D52',
          600: '#0C2444',
          700: '#091B35',
        },
        gold: {
          300: '#FFECB3',
          400: '#FFD54F',
          500: '#FFC107',
          600: '#FFA000',
          700: '#FF8F00',
        },
        softgray: '#F2F4F7',
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
          200: '#A5D6A7',
          300: '#81C784',
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
        'brand':      '0 4px 20px rgba(15,45,82,0.35)',
      },
    }
  },
  plugins: [],
}
