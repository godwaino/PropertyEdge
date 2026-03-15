/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#080e1a',
          light: '#0d1f35',
          lighter: '#112947',
          card: '#0b1828',
          border: '#1a2f47',
        },
        cyan: {
          DEFAULT: '#00D9FF',
          dark: '#00b8d9',
          muted: '#00D9FF26',
        },
        gold: {
          DEFAULT: '#FFD700',
          muted: '#FFD70026',
        },
        'pe-green': {
          DEFAULT: '#00E676',
          muted: '#00E67626',
        },
        'pe-red': {
          DEFAULT: '#FF4444',
          muted: '#FF444426',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(0, 217, 255, 0.25)',
        'glow-cyan-sm': '0 0 12px rgba(0, 217, 255, 0.2)',
        'glow-gold': '0 0 30px rgba(255, 215, 0, 0.2)',
        'glow-red': '0 0 20px rgba(255, 68, 68, 0.2)',
        'glow-green': '0 0 20px rgba(0, 230, 118, 0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-cyan-gold': 'linear-gradient(135deg, #00D9FF, #FFD700)',
        'gradient-card': 'linear-gradient(145deg, rgba(13,31,53,0.95), rgba(8,14,26,0.98))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.4s ease-out forwards',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'progress': 'progress 1.2s ease-out forwards',
        'count-up': 'countUp 0.6s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)' },
          '50%': { boxShadow: '0 0 45px rgba(0, 217, 255, 0.5)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
};
