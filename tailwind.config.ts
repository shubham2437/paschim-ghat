import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        cream: 'var(--cream)',
        forest: 'var(--forest)',
        saffron: 'var(--saffron)',
        gold: 'var(--gold)',
        terra: 'var(--terra)',
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        wrap: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
