import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from './AppPressable';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  right?: ReactNode;
}

/** Screen header: back chevron (same icon everywhere — #18), centred title, optional right slot. */
export function AppHeader({ title, showBack = false, right }: AppHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const tokens = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: tokens.border, backgroundColor: tokens.surfaceRaised }]}>
      {showBack ? (
        <AppPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={8}
        >
          <ChevronLeft size={24} color={tokens.text} />
        </AppPressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={[styles.title, { color: tokens.text }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.rightSlot}>{right ?? null}</View>
    </View>
  );
}

export interface AppScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Full-screen container with safe area, themed background. */
export function AppScreen({ children, style, edges = ['top', 'bottom'] }: AppScreenProps) {
  const tokens = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.surface }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  spacer: { width: MIN_TOUCH_SIZE },
  title: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, textAlign: 'center' },
  rightSlot: { minWidth: MIN_TOUCH_SIZE, alignItems: 'flex-end', justifyContent: 'center' },
});
