import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function PauseIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.paper;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Rect x={6} y={4} width={4} height={16} rx={1} fill={resolvedColor} />
      <Rect x={14} y={4} width={4} height={16} rx={1} fill={resolvedColor} />
    </Svg>
  );
}
