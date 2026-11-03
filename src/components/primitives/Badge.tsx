import { StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme, type ColorPalette } from '@/theme';

export type BadgeTone = 'neutral' | 'leaf' | 'ripe' | 'marigold' | 'chili';

export interface BadgeProps {
  tone: BadgeTone;
  label: string;
  dashed?: boolean;
}

const TONE_BG: Record<BadgeTone, keyof ColorPalette> = {
  neutral: 'neutral',
  leaf: 'tintLeaf',
  ripe: 'tintRipe',
  marigold: 'tintMarigold',
  chili: 'tintChili',
};

const TONE_TEXT: Record<BadgeTone, keyof ColorPalette> = {
  neutral: 'secondary',
  leaf: 'pine',
  ripe: 'tintedGreenText',
  marigold: 'tintedAmberText',
  chili: 'tintedRedText',
};

export function Badge({ tone, label, dashed = false }: BadgeProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors[TONE_BG[tone]] },
        dashed && [styles.dashed, { borderColor: colors.refundedDashed }],
      ]}
    >
      <Text style={[styles.label, { color: colors[TONE_TEXT[tone]] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md - 1,
    paddingVertical: space.xs + 1,
    alignSelf: 'flex-start',
  },
  dashed: { borderWidth: 1, borderStyle: 'dashed' },
  label: { ...text.overline },
});
