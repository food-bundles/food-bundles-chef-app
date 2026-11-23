/**
 * Centralized design tokens for Food Bundles Chef App.
 * Use these in StyleSheet-based components and NativeWind class extensions.
 * All color values match tailwind.config.js tokens.
 */

export const colors = {
  // Brand — Food Bundles green (web uses green-600; #0E8438 is the AA-safe sibling for white text)
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
  /** Bright action green — always paired with near-black text (onAction). */
  action: '#22C55E',
  onAction: '#0B0F0C',
  // Neutrals — green-tinted greys (keep in sync with tailwind.config.js)
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
  success: '#0E8438',
  warning: '#F59E0B',
  /** Icons/borders on either theme (≥3:1). For red TEXT use tokens.danger. */
  danger: '#DC2626',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Decorative product-category palette (icon tint background + icon colour). */
export const categoryPalette = {
  leaf: { tint: '#D1FAE5', icon: '#059669' },
  fruit: { tint: '#FEE2E2', icon: '#DC2626' },
  meat: { tint: '#FEE2E2', icon: '#B91C1C' },
  poultry: { tint: '#FEF3C7', icon: '#D97706' },
  seafood: { tint: '#DBEAFE', icon: '#2563EB' },
  dairy: { tint: '#F5F3FF', icon: '#7C3AED' },
  egg: { tint: '#FEF9C3', icon: '#CA8A04' },
  grain: { tint: '#FEF3C7', icon: '#B45309' },
  bean: { tint: '#D1FAE5', icon: '#065F46' },
  spice: { tint: '#FEE2E2', icon: '#EF4444' },
  herb: { tint: '#D1FAE5', icon: '#16A34A' },
  oil: { tint: '#FEF3C7', icon: '#D97706' },
  sauce: { tint: '#E0E7FF', icon: '#4338CA' },
  beverage: { tint: '#DBEAFE', icon: '#3B82F6' },
  coffee: { tint: '#FEF3C7', icon: '#92400E' },
  frozen: { tint: '#E0F2FE', icon: '#0284C7' },
  root: { tint: '#FEF3C7', icon: '#EA580C' },
  other: { tint: '#EDF2EF', icon: '#4B5A52' },
} as const;

/** Branded forest-green look for the sign-in flow (intentionally single-theme). */
export const authPalette = {
  bg: '#091A0D',
  bgAlt: '#0A1F10',
  card: '#112B18',
  cardAlt: '#132E1A',
  border: '#1E4028',
  input: '#0E2516',
  inputBorder: '#1C3D24',
  ctaBar: '#1A3522',
  divider: '#2E5229',
  muted: '#6B9966',
  mutedDim: '#4D7549',
  highlight: '#4ADE80',
  paleText: '#E8F5E5',
  placeholder: '#6B7280',
  error: '#EF4444',
} as const;

/** Status colours for badges: solid fill with white text, all ≥ 4.5:1. */
export const statusPalette = {
  success: '#0E8438',
  warning: '#B45309',
  danger: '#C62828',
  info: '#1D4ED8',
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
  /** Large bold numbers on Home cards (spec: numbers first). */
  '4xl': 34,
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

/** Motion timing constants — respect Reduce Motion at the component level */
export const motion = {
  duration: {
    fast: 150,
    base: 200,
    slow: 300,
  },
  /** Standard material easing — use with Animated.timing */
  easing: { bezier: [0.2, 0, 0, 1] as [number, number, number, number] },
} as const;

/** Semantic tokens. Read them through `useTheme()`; never branch on hex values in screens. */
export interface ThemeTokens {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textMuted: string;
  placeholder: string;
  primary: string;
  onPrimary: string;
  primaryTint: string;
  onPrimaryTint: string;
  /** Green text links and accents on the screen background. */
  link: string;
  action: string;
  onAction: string;
  danger: string;
  onDanger: string;
  dangerTint: string;
  warning: string;
  warningText: string;
  warningTint: string;
  info: string;
  overlay: string;
  shadow: string;
  /** Glow under the keyboard action bar: white in dark, soft black in light. */
  actionShadow: string;
  actionShadowOpacity: number;
}

export const lightTheme: ThemeTokens = {
  scheme: 'light',
  bg: colors.white,
  surface: colors.surface[50],
  surfaceRaised: colors.white,
  surfaceSunken: colors.surface[100],
  border: colors.surface[200],
  text: '#0F1A14',
  textMuted: colors.surface[600],
  placeholder: colors.surface[500],
  primary: colors.brand[500],
  onPrimary: colors.white,
  primaryTint: colors.brand[50],
  onPrimaryTint: colors.brand[700],
  link: colors.brand[600],
  action: colors.action,
  onAction: colors.onAction,
  danger: '#C62828',
  onDanger: colors.white,
  dangerTint: '#FDECEC',
  warning: colors.warning,
  warningText: '#92400E',
  warningTint: '#FEF3C7',
  info: '#1D4ED8',
  overlay: 'rgba(11, 15, 12, 0.5)',
  shadow: colors.black,
  actionShadow: colors.black,
  actionShadowOpacity: 0.18,
};

export const darkTheme: ThemeTokens = {
  scheme: 'dark',
  bg: colors.surface[950],
  surface: colors.surface[900],
  surfaceRaised: colors.surface[800],
  surfaceSunken: colors.surface[850],
  border: colors.surface[700],
  text: '#F3F7F4',
  textMuted: '#A9B5AD',
  placeholder: colors.surface[400],
  primary: colors.brand[500],
  onPrimary: colors.white,
  primaryTint: '#12301D',
  onPrimaryTint: '#86EFAC',
  link: '#4ADE80',
  action: colors.action,
  onAction: colors.onAction,
  danger: '#F87171',
  onDanger: colors.onAction,
  dangerTint: '#3B1717',
  warning: '#FBBF24',
  warningText: '#FCD34D',
  warningTint: '#3A2A0A',
  info: '#60A5FA',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: colors.black,
  actionShadow: colors.white,
  actionShadowOpacity: 0.35,
};
