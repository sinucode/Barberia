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
          primary:     'var(--primary-color, #C5A059)',
          primaryDark: 'var(--primary-dark, #A8843A)',
          bg:          'var(--bg-color, #080808)',
          text:        'var(--text-color, #F4F4F4)',
          surface:     'var(--secondary-color, #1A1A1A)',
          border:      'var(--border-color, #2A2A2A)',
          muted:       'var(--muted-color, #6B6B6B)',
        },
      },
      fontFamily: {
        sans: ['var(--font-family, Inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
