import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { shadow, useTheme } from '@/theme';
import { useT } from '@/i18n';
import { AvatarFace } from './AvatarFace';

const SIZE = 64;

/** Center tab-bar slot for AI Support: a raised animated avatar, not a normal tab item. */
export function AvatarTabButton() {
  const t = useT();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => router.push('/(app)/support/chat')}
      accessibilityRole="button"
      accessibilityLabel={t('nav_aiSupport')}
      hitSlop={8}
      style={styles.wrap}
    >
      <View style={[styles.circle, { backgroundColor: colors.pine, borderColor: colors.oat }]}>
        <AvatarFace size={32} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    marginTop: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    ...shadow.raised,
  },
});
