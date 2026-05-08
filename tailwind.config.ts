import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fafaf7',
        ink: '#0a0a0a',
        'ink-muted': '#5b5b5b',
        'ink-faint': '#9a9a92',
        rule: '#e6e3da',
        surface: '#ffffff',
        accent: '#16a34a',
        'accent-soft': '#e7f7ec',
        danger: '#b91c1c',
        warn: '#b45309',
      },
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        wider2: '0.08em',
      },
    },
  },
  plugins: [],
};

export default config;
