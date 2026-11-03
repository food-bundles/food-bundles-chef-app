import { StyleSheet, Text, View } from 'react-native';
import { space, text, useTheme } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderTopColor: colors.hairline }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.secondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...text.h2 },
  subtitle: { ...text.caption, marginTop: space.xs },
});
