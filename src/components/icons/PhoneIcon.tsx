import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function PhoneIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.5-.36c1.1.36 2.3.56 3.5.56a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-1.5 1.5C10.9 21.5 2.5 13.1 2.5 3.5A1.5 1.5 0 0 1 4 2h3.1a1.5 1.5 0 0 1 1.5 1.5c0 1.2.2 2.4.56 3.5a1.5 1.5 0 0 1-.37 1.5z"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
