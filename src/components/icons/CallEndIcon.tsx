import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function CallEndIcon({ size = 22, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.paper;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M2.5 12.5c4-4.2 15-4.2 19 0a1.4 1.4 0 0 1 0 2l-2.6 2.5a1.4 1.4 0 0 1-1.9.06l-1.7-1.5a1.4 1.4 0 0 0-1.7-.1 6.4 6.4 0 0 1-5.4 0 1.4 1.4 0 0 0-1.7.1l-1.7 1.5a1.4 1.4 0 0 1-1.9-.06L2.5 14.5a1.4 1.4 0 0 1 0-2z"
        fill={resolvedColor}
      />
    </Svg>
  );
}
