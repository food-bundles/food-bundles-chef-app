import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { IconProps } from './types';

export function InfoCircleIcon({ size = 16, color }: IconProps) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.tintedAmberText;
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <Circle cx={12} cy={12} r={9} stroke={resolvedColor} strokeWidth={2} />
      <Line x1={12} y1={11} x2={12} y2={16.5} stroke={resolvedColor} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={7.5} r={1.1} fill={resolvedColor} />
    </Svg>
  );
}
