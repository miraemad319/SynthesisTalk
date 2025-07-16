/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultConfig';
export default {
  presets: [defaultTheme],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Calm pastels color palette
        pastel: {
          blue: "#E6F3FF",
          'blue-light': "#F0F8FF",
          'blue-dark': "#B3D9FF",
          lavender: "#F0EBFF",
          'lavender-light': "#F8F5FF",
          'lavender-dark': "#D6C7FF",
          pink: "#FFE6F2",
          'pink-light': "#FFF0F8",
          'pink-dark': "#FFB3D9",
          mint: "#E6FFF0",
          'mint-light': "#F0FFF5",
          'mint-dark': "#B3FFD1",
          peach: "#FFF0E6",
          'peach-light': "#FFF8F0",
          'peach-dark': "#FFD1B3",
          sage: "#E8F5E8",
          'sage-light': "#F2F9F2",
          'sage-dark': "#C8E6C8",
          cream: "#FFFEF7",
          'cream-light': "#FFFEF9",
          'cream-dark': "#FFF8E1"
        },
        // Accent colors for interactive elements
        accent: {
          primary: "#7B68EE",
          'primary-dark': "#6A5ACD",
          secondary: "#FF69B4",
          'secondary-dark': "#FF1493",
          success: "#98FB98",
          'success-dark': "#90EE90",
          warning: "#FFB347",
          'warning-dark': "#FFA500"
        },
        // Neutral colors with warm undertones
        neutral: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E8E8E8",
          300: "#D6D6D6",
          400: "#A8A8A8",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717"
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Poppins"', '"Segoe UI"', 'sans-serif']
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }]
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem'
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem'
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
        'pastel': '0 4px 20px -2px rgba(123, 104, 238, 0.1)'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        }
      }
    },
  },
  plugins: [],
}