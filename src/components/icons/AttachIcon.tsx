import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function AttachIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M17.5 8.5 9.9 16.1a3 3 0 0 1-4.24-4.24l7.6-7.6a2 2 0 0 1 2.83 2.83l-7.25 7.25a1 1 0 0 1-1.41-1.42l6.36-6.36"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
