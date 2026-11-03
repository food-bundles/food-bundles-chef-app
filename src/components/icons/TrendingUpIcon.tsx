import Svg, { Path, Polyline } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function TrendingUpIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.leaf;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Polyline
        points="3 17 9 11 13 15 21 7"
        stroke={resolvedColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M15 7h6v6" stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
