import { StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';
import { useT } from '@/i18n';
import { Button } from './Button';

export interface ErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const t = useT();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.tintChili }]} />
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      <View style={styles.action}>
        <Button variant="secondary" size="sm" onPress={onRetry}>
          {t('action_retry')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: space.xl },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
  },
  title: { ...text.h2, marginTop: space.md, textAlign: 'center' },
  message: { ...text.caption, marginTop: space.xs, textAlign: 'center' },
  action: { marginTop: space.lg },
});
