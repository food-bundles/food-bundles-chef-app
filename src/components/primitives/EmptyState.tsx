import { StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';
import { Button } from './Button';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.tintLeaf }]}>{icon}</View>
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      {action ? (
        <View style={styles.action}>
          <Button variant="secondary" size="sm" onPress={action.onPress}>
            {action.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: space.xl },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...text.h2, marginTop: space.md, textAlign: 'center' },
  message: { ...text.caption, marginTop: space.xs, textAlign: 'center' },
  action: { marginTop: space.lg },
});
