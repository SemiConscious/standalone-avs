import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import { skeleton } from '@skeletonlabs/tw-plugin';

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Semantic text colors for dark theme
        'text-primary': 'rgb(var(--color-surface-50) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-surface-400) / <alpha-value>)',
        // Background semantic colors
        'bg-primary': 'rgb(var(--color-surface-900) / <alpha-value>)',
        'bg-secondary': 'rgb(var(--color-surface-800) / <alpha-value>)',
        // Border semantic colors  
        'border': 'rgb(var(--color-surface-700) / <alpha-value>)',
        // Accent color
        'accent': 'rgb(var(--color-primary-500) / <alpha-value>)',
        // Status colors
        'success': 'rgb(34, 197, 94)',
        'warning': 'rgb(251, 191, 36)',
        'error': 'rgb(239, 68, 68)',
      },
    },
  },
  plugins: [
    forms,
    typography,
    skeleton({
      themes: {
        preset: [
          {
            name: 'wintry',
            enhancements: true,
          },
          {
            name: 'skeleton',
            enhancements: true,
          },
          {
            name: 'modern',
            enhancements: true,
          },
        ],
      },
    }),
  ],
} satisfies Config;
