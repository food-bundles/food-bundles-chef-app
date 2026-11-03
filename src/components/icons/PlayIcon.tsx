import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function PlayIcon({ size = 18, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.paper;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path d="M7 4.5v15l13-7.5-13-7.5z" fill={resolvedColor} />
    </Svg>
  );
}
