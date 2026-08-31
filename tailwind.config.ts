import type { Config } from 'tailwindcss';

/**
 * Design tokens.
 *
 * Green, amber and red belong to the predictor's three chance bands and are
 * used for nothing else, so a colour on this site always means one thing. That
 * rule puts the brand colour outside those hues: it is a deep indigo-violet,
 * taken from Paithani silk — the cloth woven at Paithan in Maharashtra, whose
 * peacock motifs sit in indigo and violet. Specific to the place, and never
 * mistakable for a result.
 *
 * The neutrals carry the same violet cast so the palette reads as one family
 * rather than colour dropped onto grey.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#14121F', muted: '#5B5670', faint: '#8E89A3' },
        brand: {
          DEFAULT: '#4C3AA8',
          hover: '#3E2E8D',
          deep: '#2E2270',
          tint: '#F0EDFB',
          edge: '#DAD3F4',
          ring: '#BDB1EC',
        },
        line: '#E5E2EF',
        wash: '#F7F6FB',
        good: { DEFAULT: '#0A6B4A', tint: '#E4F2EC', edge: '#BFE0D2' },
        possible: { DEFAULT: '#8A5200', tint: '#FBF0DE', edge: '#EDD5A8' },
        reach: { DEFAULT: '#A3231B', tint: '#FBEAE8', edge: '#EFC7C3' },
        // Older names kept as aliases so the admin panel keeps its styling.
        rule: '#E5E2EF',
        surface: '#F7F6FB',
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        display: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      /**
       * One family doing every job, so the scale carries the hierarchy.
       * Tracking tightens as size grows, which is what stops a large weight-700
       * line from reading as a default h1.
       */
      fontSize: {
        'display-xl': ['2.375rem', { lineHeight: '1.05', letterSpacing: '-0.031em' }],
        'display-lg': ['1.875rem', { lineHeight: '1.1', letterSpacing: '-0.026em' }],
        'display-md': ['1.4375rem', { lineHeight: '1.18', letterSpacing: '-0.02em' }],
        'display-sm': ['1.1875rem', { lineHeight: '1.28', letterSpacing: '-0.013em' }],
      },
      spacing: { 13: '3.25rem', 15: '3.75rem', 18: '4.5rem' },
      maxWidth: { screen: '34rem', wide: '64rem' },
      /** Radius encodes scale: the bigger the surface, the softer the corner. */
      borderRadius: { chip: '8px', card: '12px', panel: '16px', hero: '22px' },
      boxShadow: {
        // Used only where something genuinely floats above the page.
        card: '0 1px 2px rgba(20,18,31,0.04)',
        lift: '0 2px 8px rgba(20,18,31,0.06), 0 1px 2px rgba(20,18,31,0.04)',
        bar: '0 -1px 0 rgba(20,18,31,0.06), 0 -10px 28px rgba(20,18,31,0.06)',
      },
      keyframes: {
        'bar-grow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
      },
      animation: { 'bar-grow': 'bar-grow 0.5s cubic-bezier(0.22,1,0.36,1) both' },
    },
  },
  plugins: [],
};
export default config;
