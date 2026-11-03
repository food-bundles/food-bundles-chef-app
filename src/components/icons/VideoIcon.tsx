import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function VideoIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Rect x={2} y={6} width={13} height={12} rx={2.5} stroke={resolvedColor} strokeWidth={1.8} />
      <Path d="m15 10 5.2-3.1a1 1 0 0 1 1.3.96v8.28a1 1 0 0 1-1.3.96L15 14" stroke={resolvedColor} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}
