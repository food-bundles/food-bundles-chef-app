/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand — deep teal/green kitchen palette
        brand: {
          50: '#E6F9F4',
          100: '#C0F0E2',
          200: '#8BE3CC',
          300: '#56D4B4',
          400: '#1DB954',
          500: '#159E45',
          600: '#0E8438',
          700: '#0A6A2C',
          800: '#075122',
          900: '#043817',
        },
        // Neutrals — warm off-white / charcoal for kitchen feel
        surface: {
          50: '#FAFAF8',
          100: '#F5F4F0',
          200: '#EAE9E4',
          300: '#D4D2CB',
          400: '#B3B0A6',
          500: '#8C897E',
          600: '#6B6860',
          700: '#4D4B45',
          800: '#32302C',
          900: '#1A1916',
        },
        // Semantic
        success: '#1DB954',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['System'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
