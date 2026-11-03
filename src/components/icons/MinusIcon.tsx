import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function MinusIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path d="M5 12h14" stroke={resolvedColor} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}
