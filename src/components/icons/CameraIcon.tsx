import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function CameraIcon({ size = 14, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.paper;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Path
        d="M4 8h3l1.6-2.4A2 2 0 0 1 10.3 4.6h3.4a2 2 0 0 1 1.7 1L16.8 8H20a1 1 0 0 1 1 1v9.5A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5V9a1 1 0 0 1 1-1z"
        stroke={resolvedColor}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13.2} r={3.4} stroke={resolvedColor} strokeWidth={1.8} />
    </Svg>
  );
}
