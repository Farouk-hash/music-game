/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand: muted violet that reads well on dark ──────
        brand: {
          50:  '#1e1b3a',   // deepest — used for subtle backgrounds
          100: '#2a2547',
          200: '#3b3566',
          300: '#5a52a5',
          400: '#7c6ee0',
          500: '#9082f0',   // primary — buttons, links
          600: '#a89bff',   // hover — lighter, not darker
          700: '#c4baff',
          800: '#ddd8ff',
          900: '#f0edff',
        },

        // ── Surfaces: layered darks ──────────────────────────
        surface: {
          DEFAULT: '#0f1117',   // page background — deepest
          muted:   '#161822',   // slightly raised — cards sit on this
          subtle:  '#1e2029',   // elevated — inputs, hover states
          border:  '#2a2d38',   // subtle dividers
        },

        // ── Ink: text colors, light-on-dark ──────────────────
        ink: {
          DEFAULT: '#e8e9ee',   // primary text — near-white
          muted:   '#9ca0ad',   // secondary — descriptions
          subtle:  '#6b7280',   // tertiary — hints, timestamps
        },

        // ── Status colors (dark-tuned) ───────────────────────
        success: {
          DEFAULT: '#34d399',   // text/icon
          subtle:  '#0d2e24',   // background
        },
        warning: {
          DEFAULT: '#fbbf24',
          subtle:  '#332512',
        },
        danger: {
          DEFAULT: '#f87171',
          subtle:  '#331a1a',
        },

        // ── Info (if you need it) ────────────────────────────
        info: {
          DEFAULT: '#60a5fa',
          subtle:  '#152a44',
        },
      },

      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },

      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },

      boxShadow: {
        // Dark theme needs deeper shadows with lower opacity
        card: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(144,130,240,0.15)',   // optional, for accent elements
      },
    },
  },
  plugins: [],
};