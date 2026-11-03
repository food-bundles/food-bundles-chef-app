import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

/** A plain shield glyph representing the external credit bureau data source. */
export function ShieldIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M12 3.5 5 6v6c0 4.2 3 7.4 7 8.5 4-1.1 7-4.3 7-8.5V6l-7-2.5z"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M9 12.2 11.2 14.4 15.3 10" stroke={resolvedColor} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
