import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
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

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.white} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.rightSlot}>{right ?? null}</View>
    </View>
  );
}

export interface AppScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/** Full-screen container with safe area + dark background */
export function AppScreen({ children, style, edges = ['top', 'bottom'] }: AppScreenProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface[950],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface[800],
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
    color: colors.white,
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
