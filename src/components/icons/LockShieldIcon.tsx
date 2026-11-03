import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

/** A shield outline with a small padlock glyph, used for data-consent chrome. */
export function LockShieldIcon({ size = 24, color }: IconProps) {
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
      <Path
        d="M9.8 11.2v-1.3a2.2 2.2 0 0 1 4.4 0v1.3"
        stroke={resolvedColor}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M9 11.2h6v3.6a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-3.6z"
        stroke={resolvedColor}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
