import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function DocumentIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M14 2v5h5M8 13h8M8 17h5" stroke={resolvedColor} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
