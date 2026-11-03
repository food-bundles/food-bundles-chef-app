import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

/** A rocket glyph, used for "very often" / high-frequency chrome. */
export function RocketIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M12 3c2.5 1.8 4 4.8 4 8.5 0 2-1 4-1 4H9s-1-2-1-4c0-3.7 1.5-6.7 4-8.5Z"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M9 15.5 6.5 18M15 15.5 17.5 18M10 20.5h4" stroke={resolvedColor} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 8.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z" fill={resolvedColor} />
    </Svg>
  );
}
