/**
 * Centralized design tokens for Food Bundles Chef App.
 * Use these in StyleSheet-based components and NativeWind class extensions.
 * All color values match tailwind.config.js tokens.
 */

export const colors = {
  // Brand — deep kitchen green
  brand: {
    50: '#E6F9F4',
    100: '#C0F0E2',
    300: '#56D4B4',
    400: '#1DB954',
    500: '#1DB954',
    600: '#0E8438',
    700: '#0A6A2C',
  },
  // Neutrals — warm charcoal
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
    850: '#242220',
    900: '#1A1916',
    950: '#0F0E0C',
  },
  // Semantic
  success: '#1DB954',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Minimum touch target size per accessibility guidelines */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TOUCH_SIZE = 44;

/** Semantic color sets for StyleSheet-based components */
export const lightColors = {
  bg: colors.surface[50],
  bgCard: colors.surface[100],
  bgInput: colors.surface[200],
  textPrimary: colors.surface[900],
  textSecondary: colors.surface[600],
  textMuted: colors.surface[500],
  border: colors.surface[200],
  borderInner: colors.surface[200],
};

export const darkColors = {
  bg: colors.surface[900],
  bgCard: colors.surface[800],
  bgInput: colors.surface[800],
  textPrimary: '#FFFFFF',
  textSecondary: colors.surface[300],
  textMuted: colors.surface[500],
  border: colors.surface[700],
  borderInner: colors.surface[700],
};
