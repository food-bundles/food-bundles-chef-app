import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function SearchIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.muted;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx={11} cy={11} r={7} stroke={resolvedColor} strokeWidth={2} />
      <Path d="M21 21l-4-4" stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
