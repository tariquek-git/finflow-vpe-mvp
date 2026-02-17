/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          app: 'var(--ff-surface-app)',
          panel: 'var(--ff-surface-panel)',
          canvas: 'var(--ff-surface-canvas)',
          muted: 'var(--ff-surface-muted)',
          elevated: 'var(--ff-surface-elevated)'
        },
        divider: {
          DEFAULT: 'var(--ff-divider)',
          subtle: 'var(--ff-divider-subtle)',
          strong: 'var(--ff-divider-strong)'
        },
        text: {
          primary: 'var(--ff-text-primary)',
          secondary: 'var(--ff-text-secondary)',
          muted: 'var(--ff-text-muted)'
        },
        accent: {
          DEFAULT: 'var(--ff-accent-primary)',
          strong: 'var(--ff-accent-strong)',
          soft: 'var(--ff-accent-soft)'
        }
      },
      borderRadius: {
        sm: 'var(--ff-radius-sm)',
        md: 'var(--ff-radius-md)',
        lg: 'var(--ff-radius-lg)',
        xl: 'var(--ff-radius-xl)'
      },
      boxShadow: {
        soft: 'var(--ff-shadow-soft)',
        panel: 'var(--ff-shadow-panel)',
        elevated: 'var(--ff-shadow-elevated)'
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)']
      },
      fontSize: {
        uiTitle: ['15px', { lineHeight: '1.35' }],
        uiSection: ['12.5px', { lineHeight: '1.35' }],
        ui: ['13px', { lineHeight: '1.4' }],
        uiSm: ['12px', { lineHeight: '1.35' }],
        uiXs: ['11px', { lineHeight: '1.3' }]
      }
    },
  },
  plugins: [],
}
