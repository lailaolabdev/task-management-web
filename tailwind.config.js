/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Lumina Flow brand — Deep Cyan #006782
        primary: {
          50:  '#e6f3f8',
          100: '#cce7f1',
          200: '#99cfe3',
          300: '#66b8d5',
          400: '#33a0c7',
          500: '#0088b9',
          600: '#006782', // ← brand anchor
          700: '#005268',
          800: '#003c4e',
          900: '#002734',
          950: '#001520',
        },
        // Tonal surface palette (tinted backgrounds)
        surface: {
          bg:      '#f2f6f8', // page background
          sidebar: '#e8f3f7', // sidebar zone
          card:    '#ffffff', // card surface
          hover:   '#ddeef5', // nav hover
          active:  '#006782', // nav active fill
        },
        // Semantic
        success:  '#10b981',
        warning:  '#f59e0b',
        danger:   '#ef4444',
        info:     '#0ea5e9',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Lumina Flow uses consistent 8px radius
        DEFAULT: '8px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        card:   '0 1px 3px 0 rgba(0,103,130,0.06), 0 1px 2px -1px rgba(0,103,130,0.04)',
        float:  '0 4px 16px 0 rgba(0,103,130,0.10), 0 2px 6px -1px rgba(0,103,130,0.06)',
        modal:  '0 20px 60px -10px rgba(0,103,130,0.18), 0 8px 24px -6px rgba(0,0,0,0.08)',
        glow:   '0 0 0 3px rgba(0,103,130,0.15)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
