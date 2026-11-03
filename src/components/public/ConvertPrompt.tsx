import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { radius, space, text, useTheme } from '@/theme';
import { useT } from '@/i18n';

export function ConvertPrompt() {
  const t = useT();
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.tintLeaf }]}>
      <Text style={[styles.text, { color: colors.pine }]}>{t('guest_createAccountPrompt')}</Text>
      <Pressable
        onPress={() => router.push('/(auth)/signup')}
        accessibilityRole="button"
        accessibilityLabel={t('guest_createAccount')}
        style={styles.button}
      >
        <Text style={[styles.buttonLabel, { color: colors.leaf }]}>{t('guest_createAccount')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  text: { ...text.caption },
  button: { minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  buttonLabel: { ...text.bodySemi },
});
