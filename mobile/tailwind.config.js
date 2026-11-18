/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'media' follows Appearance, which ThemeProvider overrides from the in-app preference
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
        // Neutrals — green-tinted greys (keep in sync with src/lib/theme.ts)
        surface: {
          50: '#F4F7F5',
          100: '#EDF2EF',
          200: '#DDE5E0',
          300: '#C4CFC8',
          400: '#97A59C',
          500: '#66746B',
          600: '#4B5A52',
          700: '#33403A',
          800: '#1D2621',
          850: '#18201B',
          900: '#111813',
          950: '#0B0F0C',
        },
        // Semantic
        action: '#22C55E',
        success: '#0E8438',
        warning: '#F59E0B',
        danger: '#DC2626',
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
