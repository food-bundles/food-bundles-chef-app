import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function SpeakerIcon({ size = 20, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.ink;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M4 9v6h4l5 4V5L8 9H4z"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M17.5 8.5a5 5 0 0 1 0 7" stroke={resolvedColor} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M20 6a9 9 0 0 1 0 12" stroke={resolvedColor} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
