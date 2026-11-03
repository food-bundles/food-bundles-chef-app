import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function SendIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.paper;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
