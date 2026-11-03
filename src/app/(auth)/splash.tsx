import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { radius, space, text, useTheme } from '@/theme';
import { LogoMark } from '@/components/icons';
import { useT } from '@/i18n';

export default function Splash() {
  const t = useT();
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/(public)/onboarding'), 1700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.pine }]}
      onPress={() => router.replace('/(public)/onboarding')}
      accessibilityRole="button"
      accessibilityLabel={t('a11y_skipSplash')}
    >
      <View style={styles.center}>
        <LogoMark size={80} />
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.paper }]}>FoodBundles</Text>
          <Text style={[styles.subtitle, { color: colors.onPineBright }]}>Fresh produce, sourced right.</Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressTrackDim, { backgroundColor: colors.onPine }]} />
        <View style={[styles.progressFill, { backgroundColor: colors.marigold }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: space.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  textCol: { alignItems: 'center', gap: space.xs },
  title: { ...text.display },
  subtitle: { ...text.body },
  progressTrack: {
    height: 4,
    borderRadius: radius.sm,
    marginHorizontal: space.xxl + space.lg,
    overflow: 'hidden',
  },
  progressTrackDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  progressFill: { width: '66%', height: '100%', borderRadius: radius.sm },
});
