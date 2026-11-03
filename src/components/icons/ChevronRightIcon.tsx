import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function ChevronRightIcon({ size = 17, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.muted;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path d="M9 6l6 6-6 6" stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
