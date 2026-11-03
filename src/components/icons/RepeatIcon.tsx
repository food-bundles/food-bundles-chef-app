import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

/** A repeat/cycle glyph, used for recurring or weekly-frequency chrome. */
export function RepeatIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M4 12a8 8 0 0 1 8-8h6M18 4v4M18 4h-4M20 12a8 8 0 0 1-8 8H6M6 20v-4M6 20h4"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
