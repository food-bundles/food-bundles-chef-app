import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function VoucherIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M4 9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v1.5a1.8 1.8 0 0 0 0 3V15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1.5a1.8 1.8 0 0 0 0-3V9z"
        stroke={resolvedColor}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M13 8.5v7" stroke={resolvedColor} strokeWidth={1.9} strokeDasharray="2 2" />
    </Svg>
  );
}
