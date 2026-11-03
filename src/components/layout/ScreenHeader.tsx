import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { hit, space, text, useTheme } from '@/theme';
import { ChevronLeftIcon } from '@/components/icons';
import { useT } from '@/i18n';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  trailing?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, canGoBack = true, onBack, trailing }: ScreenHeaderProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + space.sm, borderBottomColor: colors.hairline, backgroundColor: colors.oat },
      ]}
    >
      {canGoBack ? (
        <Pressable
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel={t('action_back')}
          style={styles.backButton}
        >
          <ChevronLeftIcon />
        </Pressable>
      ) : null}
      <View style={styles.titleCol}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.secondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
  },
  backButton: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1 },
  title: { ...text.h2 },
  subtitle: { ...text.caption, marginTop: 2 },
});
