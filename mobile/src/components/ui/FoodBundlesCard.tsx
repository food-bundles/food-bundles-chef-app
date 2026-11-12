import { StyleSheet, View, Image, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { radius } from '@/lib/theme';

const LOGO = require('../../../assets/fb-logo-raw.png');

export interface FoodBundlesCardProps {
  gradient?: keyof typeof GRADIENT_MAP;
  fromColor?: string;
  toColor?: string;
  children: React.ReactNode;
}

const GRADIENT_MAP = {
  green:   ['#0E8438', '#064E3B'] as [string, string],
  teal:    ['#0D9488', '#134E4A'] as [string, string],
  blue:    ['#2563EB', '#1E3A8A'] as [string, string],
  indigo:  ['#4F46E5', '#1E1B4B'] as [string, string],
  amber:   ['#D97706', '#78350F'] as [string, string],
  violet:  ['#7C3AED', '#4C1D95'] as [string, string],
  rose:    ['#E11D48', '#881337'] as [string, string],
} as const;

const DEFAULT_GRADIENT: [string, string] = ['#0E8438', '#064E3B'];
const CARD_HEIGHT = 140;

function resolveColors(gradient?: keyof typeof GRADIENT_MAP, fromColor?: string, toColor?: string): [string, string] {
  if (fromColor && toColor) return [fromColor, toColor];
  if (gradient && GRADIENT_MAP[gradient]) return GRADIENT_MAP[gradient];
  return DEFAULT_GRADIENT;
}

export function FoodBundlesCard({ gradient, fromColor, toColor, children }: FoodBundlesCardProps) {
  const [from, to] = resolveColors(gradient, fromColor, toColor);
  return (
    <View style={[styles.card, { height: CARD_HEIGHT }]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height={CARD_HEIGHT}>
        <Defs>
          <LinearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} stopOpacity="1" />
            <Stop offset="1" stopColor={to} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={CARD_HEIGHT} rx={radius.lg} fill="url(#cg)" />
        {/* Large decorative circle top-right */}
        <Circle cx="95%" cy="-15%" r="90" fill="white" fillOpacity="0.06" />
        <Circle cx="95%" cy="-15%" r="60" fill="white" fillOpacity="0.05" />
        {/* Small circle bottom-left */}
        <Circle cx="12%" cy="120%" r="55" fill="white" fillOpacity="0.04" />
      </Svg>

      {/* Logo top-left + live pill top-right */}
      <View style={styles.logoRow}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Metric content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 72,
    height: 16,
    tintColor: 'rgba(255,255,255,0.75)',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
