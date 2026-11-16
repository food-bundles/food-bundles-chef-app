import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { User, Camera } from 'lucide-react-native';
import { colors, radius } from '@/lib/theme';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  onPress?: () => void;
  showCameraBadge?: boolean;
}

function getInitials(name: string | null | undefined): string | null {
  if (!name) return null;
  const stripped = name.replace(/[^a-zA-Z\s]/g, '').trim();
  if (!stripped) return null;
  const words = stripped.split(/\s+/).filter((w): w is string => Boolean(w));
  if (words.length === 0) return null;
  const first = words[0] ?? '';
  if (words.length === 1) return first.charAt(0).toUpperCase();
  const second = words[1] ?? '';
  return (first.charAt(0) + second.charAt(0)).toUpperCase();
}

export function Avatar({
  uri,
  name,
  size = 64,
  onPress,
  showCameraBadge = false,
}: AvatarProps) {
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.36);
  const badgeSize = 22;

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessibilityLabel={name ?? 'Profile photo'}
    />
  ) : (
    <View
      style={[
        styles.initialsContainer,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {initials ? (
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      ) : (
        <User size={fontSize + 4} color={colors.white} />
      )}
    </View>
  );

  const badge = showCameraBadge ? (
    <View style={[styles.cameraBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
      <Camera size={12} color={colors.white} />
    </View>
  ) : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={name ? `${name}'s profile photo` : 'Profile photo'}
        style={{ position: 'relative', width: size, height: size }}
      >
        {inner}
        {badge}
      </Pressable>
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
  initialsContainer: {
    backgroundColor: '#0E8438',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.surface[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface[900],
  },
});
