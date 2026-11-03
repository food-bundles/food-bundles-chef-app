import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function OrdersIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M6 3h12v18l-2.2-1.4L13.5 21l-1.5-1.4L10.5 21l-2.3-1.4L6 21V3z"
        stroke={resolvedColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 8h6M9 12h6M9 16h3.5" stroke={resolvedColor} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
