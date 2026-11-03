import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function SunIcon({ size = 24, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.marigold;
  const rays = Array.from({ length: 8 }, (_, index) => index * 45);

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx={12} cy={12} r={5} fill={resolvedColor} />
      {rays.map((angle) => (
        <Line
          key={angle}
          x1={12}
          y1={2.5}
          x2={12}
          y2={5}
          stroke={resolvedColor}
          strokeWidth={2}
          strokeLinecap="round"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </Svg>
  );
}
