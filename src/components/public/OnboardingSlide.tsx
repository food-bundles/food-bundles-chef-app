import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';

export interface OnboardingSlideProps {
  image?: ImageSourcePropType;
  imageLabel?: string;
  icon?: ReactNode;
  title: string;
  subtitle: string;
}

/** One full-width slide in the onboarding pager: an image or icon, a title and a subtitle. */
export function OnboardingSlide({ image, imageLabel, icon, title, subtitle }: OnboardingSlideProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { width }]}>
      {image ? (
        <Image
          source={image}
          accessible
          accessibilityLabel={imageLabel}
          style={[styles.image, { backgroundColor: colors.neutral }]}
        />
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: colors.tintLeaf }]}>{icon}</View>
      )}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingHorizontal: space.xl },
  image: {
    width: '100%',
    height: 260,
    borderRadius: radius.lg,
    marginTop: space.xxl,
  },
  iconWrap: {
    width: 200,
    height: 200,
    borderRadius: radius.pill,
    marginTop: space.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { marginTop: space.xxl, alignItems: 'center' },
  title: { ...text.h1, textAlign: 'center' },
  subtitle: { ...text.body, textAlign: 'center', marginTop: space.sm },
});
