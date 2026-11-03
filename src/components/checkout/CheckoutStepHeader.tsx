import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hit, space, text, useTheme } from '@/theme';
import { ChevronLeftIcon } from '@/components/icons';
import { useT } from '@/i18n';

export interface CheckoutStepHeaderProps {
  title: string;
  step: 1 | 2;
}

export function CheckoutStepHeader({ title, step }: CheckoutStepHeaderProps) {
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View>
      <View style={[styles.row, { borderBottomColor: colors.hairline, paddingTop: insets.top + space.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('action_back')}
          style={styles.backButton}
        >
          <ChevronLeftIcon />
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      </View>
      <View style={styles.progressRow}>
        <View style={[styles.segment, { backgroundColor: colors.leaf }]} />
        <View style={[styles.segment, { backgroundColor: step === 2 ? colors.leaf : colors.hairline }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
  },
  backButton: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  title: { ...text.h2 },
  progressRow: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.md, marginTop: space.sm },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});
