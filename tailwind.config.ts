import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'finally-dark': '#0d1117',
        'finally-card': '#1e2530',
        'finally-border': '#2d3748',
        'accent-yellow': '#ecad0a',
        'accent-blue': '#209dd7',
        'accent-purple': '#753991',
        uptick: '#22c55e',
        downtick: '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'flash-up': 'flashUp 500ms ease-out forwards',
        'flash-down': 'flashDown 500ms ease-out forwards',
      },
      keyframes: {
        flashUp: {
          '0%': { backgroundColor: 'rgba(34, 197, 94, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}

export default config
