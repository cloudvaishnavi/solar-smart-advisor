/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        solar: {
          50:  '#fefce8',
          100: '#fef9c3',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        energy: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        grid: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        },
        battery: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        surface: {
          900: '#0f172a', // Slate 900 Background
          800: '#1e293b', // Slate 800 Card Base
          750: '#334155', // Slate 700 Borders / Accents
          700: '#475569', // Slate 600 Highlight Borders
          600: '#64748b', // Slate 500 Midtext / Borders
          500: '#10b981', // Emerald 500 Accent
        },
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-in':      'slideIn 0.4s ease-out',
        'fade-up':       'fadeUp 0.5s ease-out',
        'glow':          'glow 2s ease-in-out infinite alternate',
        'spin-slow':     'spin 8s linear infinite',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%':   { boxShadow: '0 0 5px rgba(34,197,94,0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(34,197,94,0.7)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'glow-green':  '0 0 20px rgba(34,197,94,0.4)',
        'glow-blue':   '0 0 20px rgba(59,130,246,0.4)',
        'glow-yellow': '0 0 20px rgba(234,179,8,0.4)',
        'glow-purple': '0 0 20px rgba(139,92,246,0.4)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover':  '0 8px 32px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}
