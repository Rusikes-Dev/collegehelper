import type { Config } from 'tailwindcss';

/**
 * Palette rationale: green / amber / red are reserved exclusively for the
 * predictor's Good chance / Possible / Reach bands, so they always mean one
 * thing. The brand accent is therefore a deep institutional blue and never
 * competes with a result colour.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#12141A', muted: '#5A6272', faint: '#8A91A0' },
        brand: {
          DEFAULT: '#143C8C',
          hover: '#0F2F70',
          tint: '#EDF2FC',
          ring: '#A9BEE6',
        },
        rule: '#E4E7EC',
        surface: '#F7F8FA',
        good: { DEFAULT: '#0E7A4F', tint: '#E6F4ED' },
        possible: { DEFAULT: '#B45309', tint: '#FDF3E4' },
        reach: { DEFAULT: '#B42318', tint: '#FDECEA' },
      },
      fontFamily: {
        sans: ['var(--font-plex-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-plex-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-lg': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
      },
      maxWidth: { content: '68rem' },
      borderRadius: { card: '10px' },
      boxShadow: {
        card: '0 1px 2px rgba(18,20,26,0.04), 0 1px 8px rgba(18,20,26,0.04)',
        pop: '0 4px 16px rgba(18,20,26,0.10)',
      },
    },
  },
  plugins: [],
};
export default config;
