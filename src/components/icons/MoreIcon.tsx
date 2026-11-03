import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function MoreIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Rect x={4} y={4} width={7} height={7} rx={1.6} stroke={resolvedColor} strokeWidth={1.9} />
      <Rect x={13} y={4} width={7} height={7} rx={1.6} stroke={resolvedColor} strokeWidth={1.9} />
      <Rect x={4} y={13} width={7} height={7} rx={1.6} stroke={resolvedColor} strokeWidth={1.9} />
      <Rect x={13} y={13} width={7} height={7} rx={1.6} stroke={resolvedColor} strokeWidth={1.9} />
    </Svg>
  );
}
