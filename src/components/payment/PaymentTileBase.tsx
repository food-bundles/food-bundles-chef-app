import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';

export interface PaymentTileBaseProps {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  logos: React.ReactNode;
  title: string;
  subtitle: string;
  expandedContent?: React.ReactNode;
}

export function PaymentTileBase({
  selected,
  onPress,
  accessibilityLabel,
  disabled,
  logos,
  title,
  subtitle,
  expandedContent,
}: PaymentTileBaseProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        { borderColor: selected ? colors.leaf : colors.hairline, backgroundColor: colors.paper },
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.row}>
        {logos}
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
        <View
          style={[
            styles.radio,
            { borderColor: selected ? colors.leaf : colors.disabledLine },
            selected && { backgroundColor: colors.leaf },
          ]}
        />
      </View>
      {selected && expandedContent ? (
        <View style={[styles.expanded, { borderTopColor: colors.hairline }]}>{expandedContent}</View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: space.md,
  },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  textCol: { flex: 1 },
  title: { ...text.bodySemi },
  subtitle: { ...text.caption, marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  expanded: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1 },
});
