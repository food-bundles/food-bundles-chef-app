import Svg, { Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function MicOffIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Rect x={9} y={2} width={6} height={12} rx={3} stroke={resolvedColor} strokeWidth={1.8} />
      <Path
        d="M5 11a7 7 0 0 0 14 0M12 18v4m-3 0h6M3 3l18 18"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
