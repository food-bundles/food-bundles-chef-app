import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function CloseIcon({ size = 16, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
