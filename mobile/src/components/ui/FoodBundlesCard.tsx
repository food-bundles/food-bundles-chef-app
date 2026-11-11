import { StyleSheet, View, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';
import { radius } from '@/lib/theme';

export interface FoodBundlesCardProps {
  /** Gradient preset key */
  gradient?: keyof typeof GRADIENT_MAP;
  /** Override start color (hex) */
  fromColor?: string;
  /** Override end color (hex) */
  toColor?: string;
  children: React.ReactNode;
}

const GRADIENT_MAP = {
  green:   ['#059669', '#166534'] as [string, string],
  teal:    ['#0D9488', '#164E63'] as [string, string],
  blue:    ['#2563EB', '#1E3A8A'] as [string, string],
  indigo:  ['#4F46E5', '#1E1B4B'] as [string, string],
  amber:   ['#F59E0B', '#C2410C'] as [string, string],
  violet:  ['#7C3AED', '#4C1D95'] as [string, string],
  rose:    ['#F43F5E', '#B91C1C'] as [string, string],
} as const;

const DEFAULT_GRADIENT: [string, string] = ['#059669', '#166534'];

const LOGO_URI =
  'https://res.cloudinary.com/dzxyelclu/image/upload/v1760111270/Food_bundle_logo_cfsnsw.png';

const CARD_HEIGHT = 148;

function resolveColors(
  gradient?: keyof typeof GRADIENT_MAP,
  fromColor?: string,
  toColor?: string,
): [string, string] {
  if (fromColor && toColor) return [fromColor, toColor];
  if (gradient && GRADIENT_MAP[gradient]) return GRADIENT_MAP[gradient];
  return DEFAULT_GRADIENT;
}

export function FoodBundlesCard({ gradient, fromColor, toColor, children }: FoodBundlesCardProps) {
  const [from, to] = resolveColors(gradient, fromColor, toColor);

  return (
    <View style={styles.card}>
      {/* Gradient via SVG so it works on both iOS and Android */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height={CARD_HEIGHT}>
        <Defs>
          <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} stopOpacity="1" />
            <Stop offset="1" stopColor={to} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={CARD_HEIGHT} rx={radius.lg} fill="url(#cardGrad)" />
        {/* Decorative circles */}
        <Circle cx="90%" cy="-5%" r="80" fill="white" fillOpacity="0.07" />
        <Circle cx="85%" cy="110%" r="65" fill="white" fillOpacity="0.07" />
      </Svg>

      {/* Top row: logo + contactless icon */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={{ uri: LOGO_URI }} style={styles.logo} resizeMode="contain" />
        </View>
        {/* Contactless icon */}
        <Svg width={22} height={18} viewBox="0 0 22 18">
          <Circle cx="11" cy="17" r="2" fill="white" fillOpacity="0.85" />
          {[{ r: 5, op: 0.5 }, { r: 9, op: 0.35 }, { r: 13, op: 0.2 }].map(({ r: sr, op }) => (
            <Circle
              key={sr}
              cx="11"
              cy="17"
              r={sr}
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              strokeOpacity={op}
            />
          ))}
        </Svg>
      </View>

      {/* EMV chip */}
      <View style={styles.chipRow}>
        <View style={styles.chip} />
      </View>

      {/* Consumer content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 80,
    height: 20,
    tintColor: 'rgba(255,255,255,0.9)',
  },
  chipRow: {
    marginTop: 6,
  },
  chip: {
    width: 28,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
});
