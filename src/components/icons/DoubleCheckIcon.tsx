import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function DoubleCheckIcon({ size = 16, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.paper;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path d="m1 12 4.5 4.5L15 7" stroke={resolvedColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m9 12 4.5 4.5L23 7" stroke={resolvedColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
