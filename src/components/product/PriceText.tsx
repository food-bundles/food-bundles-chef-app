import { Text, type TextStyle } from 'react-native';
import { text, useTheme } from '@/theme';
import { formatRwf } from '@/lib';

export type PriceSize = 'hero' | 'lg' | 'md';

export interface PriceTextProps {
  amount: number;
  size?: PriceSize;
  suffix?: string;
  colorOverride?: string;
}

const SIZE_STYLE: Record<PriceSize, TextStyle> = {
  hero: text.priceHero,
  lg: text.priceLg,
  md: text.priceMd,
};

export function PriceText({ amount, size = 'md', suffix, colorOverride }: PriceTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        SIZE_STYLE[size],
        { color: colorOverride ?? colors.ink, fontVariant: ['tabular-nums'] },
      ]}
    >
      {formatRwf(amount)}
      {suffix ? ` ${suffix}` : ''}
    </Text>
  );
}
