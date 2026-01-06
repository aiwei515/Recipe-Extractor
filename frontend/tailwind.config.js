/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['DM Sans', 'sans-serif'],
      },
      colors: {
        'cream': '#FDF8F3',
        'sage': {
          50: '#f4f7f4',
          100: '#e5ebe5',
          200: '#ccd8cc',
          300: '#a8bda8',
          400: '#7d9a7d',
          500: '#5c7d5c',
          600: '#486448',
          700: '#3b513b',
          800: '#324332',
          900: '#2a382a',
        },
        'terracotta': {
          50: '#fdf6f3',
          100: '#fbeae3',
          200: '#f7d5c7',
          300: '#f0b69f',
          400: '#e68e6f',
          500: '#db6b4a',
          600: '#c95438',
          700: '#a8432d',
          800: '#8a3a2a',
          900: '#723427',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
