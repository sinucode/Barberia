/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        xinuco: {
          primary:    'var(--primary-color, #C5A059)',
          primaryDark:'var(--primary-dark, #A8843A)',
          bg:         'var(--bg-color, #080808)',
          text:       'var(--text-color, #F4F4F4)',
          surface:    'var(--secondary-color, #1A1A1A)',
          border:     'var(--border-color, #2A2A2A)',
          muted:      'var(--muted-color, #6B6B6B)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family, Inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in':      'fadeIn 0.3s ease-in-out',
        'slide-up':     'slideUp 0.4s ease-out',
        'pulse-soft':   'pulseSoft 2s ease-in-out infinite',
        'shimmer':      'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
