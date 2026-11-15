import { StyleSheet, View, Image, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Line, Ellipse } from 'react-native-svg';
import { radius } from '@/lib/theme';

const LOGO = require('../../../assets/fb-logo-raw.png');

export interface FoodBundlesCardProps {
  gradient?: keyof typeof GRADIENT_MAP;
  fromColor?: string;
  toColor?: string;
  children: React.ReactNode;
}

const GRADIENT_MAP = {
  green:   ['#0C7A32', '#033818'] as [string, string],
  teal:    ['#0D9488', '#134E4A'] as [string, string],
  blue:    ['#2563EB', '#1E3A8A'] as [string, string],
  indigo:  ['#4F46E5', '#1E1B4B'] as [string, string],
  amber:   ['#D97706', '#78350F'] as [string, string],
  violet:  ['#7C3AED', '#4C1D95'] as [string, string],
  rose:    ['#E11D48', '#881337'] as [string, string],
  red:     ['#B91C1C', '#7F1D1D'] as [string, string],
} as const;

const DEFAULT_GRADIENT: [string, string] = ['#0C7A32', '#033818'];
export const CARD_HEIGHT = 162;

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
        {/* Base gradient fill */}
        <Rect width="100%" height={CARD_HEIGHT} rx={radius.lg} fill="url(#cg)" />

        {/* Large decorative circle — top-right corner burst */}
        <Circle cx="92%" cy="-15%" r="130" fill="white" fillOpacity="0.045" />
        <Circle cx="92%" cy="-15%" r="90" fill="white" fillOpacity="0.045" />
        <Circle cx="92%" cy="-15%" r="52" fill="white" fillOpacity="0.06" />
        <Circle cx="92%" cy="-15%" r="24" fill="white" fillOpacity="0.07" />

        {/* Bottom-left accent bubble */}
        <Ellipse cx="-8%" cy="118%" rx="90" ry="80" fill="white" fillOpacity="0.035" />
        <Ellipse cx="-8%" cy="118%" rx="55" ry="48" fill="white" fillOpacity="0.03" />

        {/* Horizontal shimmer lines for depth */}
        <Line x1="0" y1={CARD_HEIGHT * 0.65} x2="100%" y2={CARD_HEIGHT * 0.65} stroke="white" strokeOpacity="0.055" strokeWidth="1" />
        <Line x1="0" y1={CARD_HEIGHT * 0.82} x2="100%" y2={CARD_HEIGHT * 0.82} stroke="white" strokeOpacity="0.035" strokeWidth="1" />

        {/* Top shimmer line */}
        <Line x1="10%" y1="1" x2="80%" y2="1" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
      </Svg>

      {/* Logo top-left + live pill top-right */}
      <View style={styles.logoRow}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Metric content — pushed to bottom for maximum number prominence */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  logo: {
    width: 84,
    height: 18,
    tintColor: 'rgba(255,255,255,0.65)',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    letterSpacing: 1.2,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
