import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function LocationPinIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={2.5} stroke={resolvedColor} strokeWidth={1.8} />
    </Svg>
  );
}
