import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function PersonIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx={12} cy={8} r={3.2} stroke={resolvedColor} strokeWidth={1.9} />
      <Path
        d="M5 20a7 7 0 0 1 14 0"
        stroke={resolvedColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
