/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Brand — deep teal/green kitchen palette
        brand: {
          50: '#E8F5EE',
          100: '#C3E6D2',
          200: '#8FCFAA',
          300: '#4DB87A',
          400: '#0E8438',
          500: '#0E8438',
          600: '#0A6A2C',
          700: '#064E20',
          800: '#043817',
          900: '#022510',
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
        success: '#0E8438',
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
