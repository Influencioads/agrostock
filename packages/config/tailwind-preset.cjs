/**
 * Shared Tailwind preset for AgroTraders web + admin.
 * Pulls colors / fonts / radii / shadows from @agrotraders/tokens so the whole
 * platform shares one palette (green primary + mango/orange accent).
 */
const { colors, fontFamily, radii, shadows } = require('@agrotraders/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors,
      fontFamily,
      borderRadius: radii,
      boxShadow: shadows,
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg,#249653,#146B3A)',
        'brand-dock': 'linear-gradient(180deg,#177A4B,#0E5233)',
        'mango-gradient': 'linear-gradient(135deg,#FFA000,#FB8C00)',
        // skeleton shimmer sweep
        shimmer: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
