/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      /**
       * Design System Color Tokens
       *
       * Maps semantic color tokens from CSS variables to Tailwind utilities.
       * Usage: bg-fp-surface-base, text-fp-text-primary, border-fp-border-default
       */
      colors: {
        fp: {
          // Surface colors (backgrounds)
          surface: {
            base: 'var(--fp-surface-base)',
            elevated: 'var(--fp-surface-elevated)',
            sunken: 'var(--fp-surface-sunken)',
            hover: 'var(--fp-surface-hover)',
            active: 'var(--fp-surface-active)',
            overlay: 'var(--fp-surface-overlay)',
          },
          // Border colors
          border: {
            default: 'var(--fp-border-default)',
            subtle: 'var(--fp-border-subtle)',
            strong: 'var(--fp-border-strong)',
            focus: 'var(--fp-border-focus)',
          },
          // Text colors
          text: {
            primary: 'var(--fp-text-primary)',
            secondary: 'var(--fp-text-secondary)',
            muted: 'var(--fp-text-muted)',
            disabled: 'var(--fp-text-disabled)',
            inverse: 'var(--fp-text-inverse)',
          },
          // Accent colors (brand/action)
          accent: {
            primary: 'var(--fp-accent-primary)',
            'primary-hover': 'var(--fp-accent-primary-hover)',
            'primary-active': 'var(--fp-accent-primary-active)',
            secondary: 'var(--fp-accent-secondary)',
            'secondary-hover': 'var(--fp-accent-secondary-hover)',
            'secondary-active': 'var(--fp-accent-secondary-active)',
            text: 'var(--fp-accent-text)',
            'text-hover': 'var(--fp-accent-text-hover)',
            subtle: 'var(--fp-accent-subtle)',
            'subtle-hover': 'var(--fp-accent-subtle-hover)',
          },
          // Feedback colors (status)
          success: {
            DEFAULT: 'var(--fp-feedback-success)',
            text: 'var(--fp-feedback-success-text)',
            bg: 'var(--fp-feedback-success-bg)',
            border: 'var(--fp-feedback-success-border)',
          },
          warning: {
            DEFAULT: 'var(--fp-feedback-warning)',
            text: 'var(--fp-feedback-warning-text)',
            bg: 'var(--fp-feedback-warning-bg)',
            border: 'var(--fp-feedback-warning-border)',
          },
          error: {
            DEFAULT: 'var(--fp-feedback-error)',
            text: 'var(--fp-feedback-error-text)',
            bg: 'var(--fp-feedback-error-bg)',
            border: 'var(--fp-feedback-error-border)',
          },
          info: {
            DEFAULT: 'var(--fp-feedback-info)',
            text: 'var(--fp-feedback-info-text)',
            bg: 'var(--fp-feedback-info-bg)',
            border: 'var(--fp-feedback-info-border)',
          },
          // Severity colors (for risk findings)
          severity: {
            high: 'var(--fp-severity-high)',
            'high-text': 'var(--fp-severity-high-text)',
            'high-bg': 'var(--fp-severity-high-bg)',
            medium: 'var(--fp-severity-medium)',
            'medium-text': 'var(--fp-severity-medium-text)',
            'medium-bg': 'var(--fp-severity-medium-bg)',
            low: 'var(--fp-severity-low)',
            'low-text': 'var(--fp-severity-low-text)',
            'low-bg': 'var(--fp-severity-low-bg)',
          },
          // Special purpose
          code: {
            bg: 'var(--fp-code-bg)',
          },
        },
      },
      /**
       * Opacity scale for consistent border/background alphas.
       * Usage: bg-*-/[var(--fp-opacity-subtle)] or border-*-/[var(--fp-opacity-default)]
       */
      opacity: {
        'fp-subtle': 'var(--fp-opacity-subtle)',
        'fp-default': 'var(--fp-opacity-default)',
        'fp-medium': 'var(--fp-opacity-medium)',
        'fp-prominent': 'var(--fp-opacity-prominent)',
      },
      // Ring color for focus states
      ringColor: {
        fp: {
          focus: 'var(--fp-border-focus)',
          accent: 'var(--fp-accent-primary)',
        },
      },
      // Box shadow with semantic colors
      boxShadow: {
        'fp-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'fp-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'fp-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
        'fp-glow': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      /**
       * Design System Typography Tokens
       *
       * Custom font families, sizes, and text utilities.
       * Usage: font-fp-sans, text-fp-lg, leading-fp-normal
       */
      fontFamily: {
        'fp-sans': 'var(--fp-font-sans)',
        'fp-mono': 'var(--fp-font-mono)',
      },
      fontSize: {
        'fp-xs': ['var(--fp-text-xs)', { lineHeight: 'var(--fp-leading-normal)' }],
        'fp-sm': ['var(--fp-text-sm)', { lineHeight: 'var(--fp-leading-normal)' }],
        'fp-base': ['var(--fp-text-base)', { lineHeight: 'var(--fp-leading-normal)' }],
        'fp-lg': ['var(--fp-text-lg)', { lineHeight: 'var(--fp-leading-snug)' }],
        'fp-xl': ['var(--fp-text-xl)', { lineHeight: 'var(--fp-leading-snug)' }],
        'fp-2xl': ['var(--fp-text-2xl)', { lineHeight: 'var(--fp-leading-snug)' }],
        'fp-3xl': ['var(--fp-text-3xl)', { lineHeight: 'var(--fp-leading-tight)' }],
        'fp-4xl': ['var(--fp-text-4xl)', { lineHeight: 'var(--fp-leading-tight)' }],
        'fp-5xl': ['var(--fp-text-5xl)', { lineHeight: 'var(--fp-leading-none)' }],
      },
      fontWeight: {
        'fp-normal': 'var(--fp-font-normal)',
        'fp-medium': 'var(--fp-font-medium)',
        'fp-semibold': 'var(--fp-font-semibold)',
        'fp-bold': 'var(--fp-font-bold)',
      },
      lineHeight: {
        'fp-none': 'var(--fp-leading-none)',
        'fp-tight': 'var(--fp-leading-tight)',
        'fp-snug': 'var(--fp-leading-snug)',
        'fp-normal': 'var(--fp-leading-normal)',
        'fp-relaxed': 'var(--fp-leading-relaxed)',
        'fp-loose': 'var(--fp-leading-loose)',
      },
      letterSpacing: {
        'fp-tighter': 'var(--fp-tracking-tighter)',
        'fp-tight': 'var(--fp-tracking-tight)',
        'fp-normal': 'var(--fp-tracking-normal)',
        'fp-wide': 'var(--fp-tracking-wide)',
        'fp-wider': 'var(--fp-tracking-wider)',
        'fp-widest': 'var(--fp-tracking-widest)',
        'fp-caps': 'var(--fp-tracking-caps)',
      },
      /**
       * Design System Spacing Tokens
       *
       * Custom spacing scale for consistent layouts.
       * Usage: p-fp-4, gap-fp-stack-md, rounded-fp-lg
       */
      spacing: {
        'fp-0': 'var(--fp-space-0)',
        'fp-px': 'var(--fp-space-px)',
        'fp-0.5': 'var(--fp-space-0-5)',
        'fp-1': 'var(--fp-space-1)',
        'fp-1.5': 'var(--fp-space-1-5)',
        'fp-2': 'var(--fp-space-2)',
        'fp-2.5': 'var(--fp-space-2-5)',
        'fp-3': 'var(--fp-space-3)',
        'fp-3.5': 'var(--fp-space-3-5)',
        'fp-4': 'var(--fp-space-4)',
        'fp-5': 'var(--fp-space-5)',
        'fp-6': 'var(--fp-space-6)',
        'fp-7': 'var(--fp-space-7)',
        'fp-8': 'var(--fp-space-8)',
        'fp-9': 'var(--fp-space-9)',
        'fp-10': 'var(--fp-space-10)',
        'fp-11': 'var(--fp-space-11)',
        'fp-12': 'var(--fp-space-12)',
        'fp-14': 'var(--fp-space-14)',
        'fp-16': 'var(--fp-space-16)',
        'fp-20': 'var(--fp-space-20)',
        'fp-24': 'var(--fp-space-24)',
        'fp-28': 'var(--fp-space-28)',
        'fp-32': 'var(--fp-space-32)',
        // Semantic spacing
        'fp-inset-xs': 'var(--fp-space-inset-xs)',
        'fp-inset-sm': 'var(--fp-space-inset-sm)',
        'fp-inset-md': 'var(--fp-space-inset-md)',
        'fp-inset-lg': 'var(--fp-space-inset-lg)',
        'fp-inset-xl': 'var(--fp-space-inset-xl)',
        'fp-stack-xs': 'var(--fp-space-stack-xs)',
        'fp-stack-sm': 'var(--fp-space-stack-sm)',
        'fp-stack-md': 'var(--fp-space-stack-md)',
        'fp-stack-lg': 'var(--fp-space-stack-lg)',
        'fp-stack-xl': 'var(--fp-space-stack-xl)',
      },
      borderRadius: {
        'fp-none': 'var(--fp-radius-none)',
        'fp-sm': 'var(--fp-radius-sm)',
        'fp-md': 'var(--fp-radius-md)',
        'fp-lg': 'var(--fp-radius-lg)',
        'fp-xl': 'var(--fp-radius-xl)',
        'fp-2xl': 'var(--fp-radius-2xl)',
        'fp-3xl': 'var(--fp-radius-3xl)',
        'fp-full': 'var(--fp-radius-full)',
      },
      maxWidth: {
        'fp-prose': 'var(--fp-content-prose)',
        'fp-narrow': 'var(--fp-content-narrow)',
        'fp-wide': 'var(--fp-content-wide)',
        'fp-container-xs': 'var(--fp-container-xs)',
        'fp-container-sm': 'var(--fp-container-sm)',
        'fp-container-md': 'var(--fp-container-md)',
        'fp-container-lg': 'var(--fp-container-lg)',
        'fp-container-xl': 'var(--fp-container-xl)',
        'fp-container-2xl': 'var(--fp-container-2xl)',
        'fp-container-3xl': 'var(--fp-container-3xl)',
        'fp-container-4xl': 'var(--fp-container-4xl)',
        'fp-container-5xl': 'var(--fp-container-5xl)',
        'fp-container-6xl': 'var(--fp-container-6xl)',
        'fp-container-7xl': 'var(--fp-container-7xl)',
      },
      zIndex: {
        'fp-base': 'var(--fp-z-base)',
        'fp-dropdown': 'var(--fp-z-dropdown)',
        'fp-sticky': 'var(--fp-z-sticky)',
        'fp-fixed': 'var(--fp-z-fixed)',
        'fp-modal-backdrop': 'var(--fp-z-modal-backdrop)',
        'fp-modal': 'var(--fp-z-modal)',
        'fp-popover': 'var(--fp-z-popover)',
        'fp-tooltip': 'var(--fp-z-tooltip)',
        'fp-toast': 'var(--fp-z-toast)',
        'fp-max': 'var(--fp-z-max)',
      },
      /**
       * Design System Motion Tokens
       *
       * Animation durations and easing functions.
       * Usage: duration-fp-normal, ease-fp-spring
       */
      transitionDuration: {
        'fp-instant': 'var(--fp-duration-instant)',
        'fp-fast': 'var(--fp-duration-fast)',
        'fp-normal': 'var(--fp-duration-normal)',
        'fp-slow': 'var(--fp-duration-slow)',
        'fp-slower': 'var(--fp-duration-slower)',
        'fp-slowest': 'var(--fp-duration-slowest)',
      },
      transitionTimingFunction: {
        'fp-linear': 'var(--fp-ease-linear)',
        'fp-in': 'var(--fp-ease-in)',
        'fp-out': 'var(--fp-ease-out)',
        'fp-in-out': 'var(--fp-ease-in-out)',
        'fp-spring': 'var(--fp-ease-spring)',
        'fp-bounce': 'var(--fp-ease-bounce)',
      },
      animation: {
        'fp-fade-in': 'fp-fade-in var(--fp-duration-normal) var(--fp-ease-out)',
        'fp-fade-out': 'fp-fade-out var(--fp-duration-fast) var(--fp-ease-in)',
        'fp-slide-in-up': 'fp-slide-in-up var(--fp-duration-normal) var(--fp-ease-out)',
        'fp-slide-in-down': 'fp-slide-in-down var(--fp-duration-normal) var(--fp-ease-out)',
        'fp-scale-in': 'fp-scale-in var(--fp-duration-normal) var(--fp-ease-spring)',
        'fp-spin': 'fp-spin 1s linear infinite',
        'fp-pulse': 'fp-pulse 2s var(--fp-ease-in-out) infinite',
      },
      keyframes: {
        'fp-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fp-fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'fp-slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fp-slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fp-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fp-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fp-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
