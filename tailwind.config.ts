import type { Config } from 'tailwindcss';

/**
 * Design tokens.
 *
 * Green / amber / red belong to the predictor's three chance bands and are
 * used for nothing else, so a colour on this site always means one thing.
 * The brand colour is therefore a deep navy: it reads as an official
 * admissions document rather than competing with a result.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0E1116', muted: '#5A6472', faint: '#8B93A1' },
        brand: {
          DEFAULT: '#10346B',
          hover: '#0B2650',
          tint: '#EDF2F9',
          ring: '#B3C6E1',
        },
        line: '#E4E7EC',
        wash: '#F6F7F9',
        good: { DEFAULT: '#0B6B4E', tint: '#E7F2ED' },
        possible: { DEFAULT: '#8F5203', tint: '#FBF1E1' },
        reach: { DEFAULT: '#A32B1F', tint: '#FBECEA' },
        // Older names kept as aliases so the admin panel keeps its styling.
        rule: '#E4E7EC',
        surface: '#F6F7F9',
      },
      fontFamily: {
        sans: ['var(--font-public-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-public-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-lg': ['1.9rem', { lineHeight: '1.12', letterSpacing: '-0.021em' }],
        'display-sm': ['1.4rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
      },
      spacing: { 13: '3.25rem', 15: '3.75rem' },
      maxWidth: { screen: '34rem', wide: '64rem' },
      borderRadius: { card: '12px' },
      boxShadow: {
        card: '0 1px 2px rgba(14,17,22,0.05)',
        bar: '0 -1px 0 rgba(14,17,22,0.06), 0 -8px 24px rgba(14,17,22,0.05)',
      },
    },
  },
  plugins: [],
};
export default config;
