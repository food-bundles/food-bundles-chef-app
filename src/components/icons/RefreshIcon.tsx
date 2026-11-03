import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function RefreshIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.leaf;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"
        stroke={resolvedColor}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M18 4v4h-4M6 20v-4h4" stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
