import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

/** A calendar glyph, used for repayment/settlement notification chrome. */
export function CalendarIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Rect x={4} y={5.5} width={16} height={14.5} rx={2} stroke={resolvedColor} strokeWidth={1.8} />
      <Path d="M4 9.5h16" stroke={resolvedColor} strokeWidth={1.8} />
      <Path d="M8 3.5v4M16 3.5v4" stroke={resolvedColor} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
