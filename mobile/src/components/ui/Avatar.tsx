import { Image, StyleSheet, Text, View } from 'react-native';
import { Camera, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { AppPressable } from './AppPressable';
import { useTheme } from '@/providers/ThemeProvider';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  onPress?: () => void;
  showCameraBadge?: boolean;
}

/** Initials from a person's name ("Jean Claude" → "JC"); null when there are no letters (never phone digits). */
export function getInitials(name: string | null | undefined): string | null {
  if (!name) return null;
  // Latin letters incl. accents (names in Kinyarwanda, French and English); digits are dropped.
  const words = name
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿĀ-ž\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const first = words[0];
  if (!first) return null;
  const second = words[1];
  return (first.charAt(0) + (second ? second.charAt(0) : '')).toUpperCase();
}

/** Round profile photo, or initials on the brand colour (contrast-checked pair). */
export function Avatar({ uri, name, size = 64, onPress, showCameraBadge = false }: AvatarProps) {
  const { t } = useTranslation();
  const tokens = useTheme();
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.36);
  const badgeSize = 22;
  const label = name ? t('profile.photoLabelNamed', { name }) : t('profile.photoLabel');

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View
      style={[styles.initialsContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor: tokens.primary }]}
      accessible={!onPress}
      accessibilityLabel={label}
    >
      {initials ? (
        <Text style={[styles.initials, { fontSize, color: tokens.onPrimary }]}>{initials}</Text>
      ) : (
        <User size={fontSize + 4} color={tokens.onPrimary} />
      )}
    </View>
  );

  const badge = showCameraBadge ? (
    <View
      style={[
        styles.cameraBadge,
        { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, borderColor: tokens.surfaceRaised, backgroundColor: tokens.text },
      ]}
    >
      <Camera size={12} color={tokens.surfaceRaised} />
    </View>
  ) : null;

  if (onPress) {
    return (
      <AppPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [{ position: 'relative', width: size, height: size }, pressed && { opacity: 0.8 }]}
      >
        {inner}
        {badge}
      </AppPressable>
    );
  }

  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      {inner}
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  initialsContainer: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700', letterSpacing: 1 },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
