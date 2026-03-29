/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Backgrounds & surfaces ────────────────────────────────────────
        navy: {
          DEFAULT: '#EAE6E1',   // main page background (warm cream)
          light:   '#F5F3F0',   // hover states, subtle fills
          lighter: '#FAFAF9',   // near-white areas
          card:    '#FFFFFF',   // card surfaces
          border:  '#E2DDD8',   // warm light borders
          300:     '#78716C',   // muted/secondary text
        },
        // ── Brand accent ─────────────────────────────────────────────────
        cyan: {
          DEFAULT: '#0369A1',   // deep sky blue — ~5.4:1 contrast on white
          dark:    '#075985',   // hover / pressed
          muted:   '#0369A115', // very light tint for backgrounds
        },
        // ── Text & dark UI ────────────────────────────────────────────────
        charcoal: {
          DEFAULT: '#1A1A1A',   // primary text + dark buttons
          800:     '#2D2D2D',   // slightly lighter dark
          600:     '#4B5563',   // medium text
        },
        ink: '#1A1A1A',         // alias for primary text
        // ── Status / data indicators (unchanged) ──────────────────────────
        gold: {
          DEFAULT: '#D97706',
          muted:   '#D9770620',
        },
        'pe-green': {
          DEFAULT: '#16A34A',
          muted:   '#16A34A20',
        },
        'pe-red': {
          DEFAULT: '#DC2626',
          muted:   '#DC262620',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        // Clean card shadows (light theme)
        'card':       '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.10), 0 8px 32px rgba(0,0,0,0.08)',
        'card-lg':    '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        // Blue glow for brand highlights
        'glow-cyan':    '0 0 24px rgba(3,105,161,0.20)',
        'glow-cyan-sm': '0 0 10px rgba(3,105,161,0.15)',
        'glow-gold':    '0 0 20px rgba(217,119,6,0.18)',
        'glow-red':     '0 0 20px rgba(220,38,38,0.18)',
        'glow-green':   '0 0 20px rgba(22,163,74,0.18)',
      },
      backgroundImage: {
        'gradient-radial':    'radial-gradient(var(--tw-gradient-stops))',
        'gradient-cyan-gold': 'linear-gradient(135deg, #0D9E76, #D97706)',
        'gradient-card':      'linear-gradient(145deg, #FFFFFF, #F5F3F0)',
      },
      animation: {
        'fade-in':        'fadeIn 0.5s ease-out forwards',
        'slide-up':       'slideUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'scale-in':       'scaleIn 0.4s ease-out forwards',
        'pulse-glow':     'pulseGlow 2.5s ease-in-out infinite',
        'shimmer':        'shimmer 2.5s linear infinite',
        'progress':       'progress 1.2s ease-out forwards',
        'count-up':       'countUp 0.6s ease-out forwards',
        'spin-slow':      'spin 3s linear infinite',
        'bounce-subtle':  'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:      { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:     { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight:{ '0%': { opacity: '0', transform: 'translateX(16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:     { '0%': { opacity: '0', transform: 'scale(0.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseGlow:   { '0%, 100%': { boxShadow: '0 0 16px rgba(3,105,161,0.15)' }, '50%': { boxShadow: '0 0 32px rgba(3,105,161,0.35)' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        progress:    { '0%': { width: '0%' }, '100%': { width: 'var(--progress-width)' } },
        countUp:     { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        bounceSubtle:{ '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
    },
  },
  plugins: [],
};
