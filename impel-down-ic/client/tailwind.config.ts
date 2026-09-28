// Tailwind config — Seastone/Marine palette from tech-stack.md
// Follows docs/tech-stack.md
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        seastone: '#1b2430',
        marine: '#1e3a8a',
        magma: '#ff6b1a',
        buster: '#f5c542',
        alert: '#e11d48',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        pirata: ['"Pirata One"', 'cursive'],
        display: ['"Pirata One"', 'cursive'],
      },
      keyframes: {
        'wave-slow': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'wave-medium': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'wave-fast': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'wave-slow': 'wave-slow 25s linear infinite',
        'wave-medium': 'wave-medium 15s linear infinite',
        'wave-fast': 'wave-fast 10s linear infinite',
      }
    },
  },
  plugins: [],
};

export default config;
