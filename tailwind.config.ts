import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          tertiary: 'var(--color-tertiary)',
          neutral: 'var(--color-neutral)',
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
        },
        text: {
          strong: 'var(--text-strong)',
          muted: 'var(--text-muted)',
        },
        border: {
          soft: 'var(--border-soft)',
        },
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        soft: 'var(--shadow-sm)',
        raised: 'var(--shadow-md)',
      },
      transitionTimingFunction: {
        smooth: 'var(--ease-smooth)',
      },
    },
  },
  plugins: [],
};

export default config;
