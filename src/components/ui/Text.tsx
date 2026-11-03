import { Text as RNText, type TextStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme';

type Variant = 'headline' | 'title' | 'body' | 'label' | 'caption';

interface TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

const variantStyles: Record<Variant, TextStyle> = {
  headline: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  title:    { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body:     { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label:    { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  caption:  { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};

export function Text({ variant = 'body', color, align, style, children }: TextProps) {
  const { colors: palette } = useTheme();
  return (
    <RNText
      style={[
        variantStyles[variant],
        { color: color ?? palette.ink },
        align ? { textAlign: align } : undefined,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
