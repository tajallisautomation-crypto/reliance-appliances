/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f7ff',
          100: '#e0efff',
          200: '#b9d9ff',
          400: '#3b94ff',
          500: '#0070f3',
          600: '#0058d0',
          700: '#0044a8',
          800: '#003585',
        },
        surface: {
          secondary: '#f5f5f7',
        },
      },
      borderRadius: {
        apple:    '12px',
        'apple-lg': '18px',
        'apple-xl': '24px',
      },
      boxShadow: {
        apple:    '0 2px 8px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)',
        'apple-lg': '0 8px 24px rgba(0,0,0,0.10), 0 0 1px rgba(0,0,0,0.04)',
        'apple-xl': '0 20px 48px rgba(0,0,0,0.14), 0 0 1px rgba(0,0,0,0.04)',
        blue:     '0 4px 14px rgba(0,112,243,0.30)',
        gold:     '0 4px 14px rgba(245,200,66,0.35)',
      },
      animation: {
        'fade-up':  'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':  'fadeIn 0.3s ease both',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        shimmer:    'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeUp:  { from:{ opacity:'0', transform:'translateY(20px)' }, to:{ opacity:'1', transform:'translateY(0)' } },
        fadeIn:  { from:{ opacity:'0' }, to:{ opacity:'1' } },
        scaleIn: { from:{ opacity:'0', transform:'scale(0.95)' }, to:{ opacity:'1', transform:'scale(1)' } },
        shimmer: { from:{ backgroundPosition:'-200% 0' }, to:{ backgroundPosition:'200% 0' } },
      },
    },
  },
  plugins: [],
};
