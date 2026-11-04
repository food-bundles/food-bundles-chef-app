import { View, Text, Pressable, StyleSheet, useColorScheme, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, MIN_TOUCH_SIZE } from '@/lib/theme';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function AppHeader({ title, showBack = false, right }: AppHeaderProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.header, { borderBottomColor: isDark ? colors.surface[800] : colors.surface[200] }]}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={isDark ? colors.white : colors.surface[800]} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={[styles.title, { color: isDark ? colors.white : colors.surface[900] }]} numberOfLines={1}>{title}</Text>
      <View style={styles.rightSlot}>{right ?? null}</View>
    </View>
  );
}

export interface AppScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Full-screen container with safe area, adapts to light/dark OS preference */
export function AppScreen({ children, style, edges = ['top', 'bottom'] }: AppScreenProps) {
  const isDark = useColorScheme() === 'dark';
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: isDark ? colors.surface[950] : colors.surface[50] }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: MIN_TOUCH_SIZE },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  rightSlot: {
    width: MIN_TOUCH_SIZE,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
