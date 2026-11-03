import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { text, useTheme } from '@/theme';
import { CameraIcon } from '@/components/icons';

export interface ProfileImagePickerProps {
  size: number;
  imageUri: string | null;
  initials: string;
  accessibilityLabel: string;
  onPicked: (uri: string) => void;
}

/** Circular restaurant photo with a camera badge; tapping either opens the device photo library. */
export function ProfileImagePicker({ size, imageUri, initials, accessibilityLabel, onPicked }: ProfileImagePickerProps) {
  const { colors } = useTheme();
  const badgeSize = Math.round(size * 0.25);

  const onPress = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) onPicked(result.assets[0].uri);
  };

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          accessible={false}
          style={[{ backgroundColor: colors.neutral, width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.initialsCircle,
            { backgroundColor: colors.tintLeaf, width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[text.h1, { color: colors.leaf }]}>{initials}</Text>
        </View>
      )}
      <View
        style={[
          styles.badge,
          { backgroundColor: colors.leaf, borderColor: colors.oat },
          { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
        ]}
      >
        <CameraIcon size={Math.round(badgeSize * 0.55)} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  initialsCircle: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
