import { useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { radius, useTheme } from '@/theme';
import { Skeleton } from '@/components/primitives';

export interface ProductLineImageProps {
  source: ImageSourcePropType;
  label: string;
}

/** 48x48 rounded product photo for order/cart line items, with a shimmer placeholder while loading. */
export function ProductLineImage({ source, label }: ProductLineImageProps) {
  const [loaded, setLoaded] = useState(false);
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.neutral }]}>
      {loaded ? null : (
        <View style={styles.skeletonLayer}>
          <Skeleton width={48} height={48} radius={radius.sm + 2} />
        </View>
      )}
      <Image
        source={source}
        accessibilityLabel={label}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 48, height: 48, borderRadius: radius.sm + 2, overflow: 'hidden' },
  skeletonLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  image: { width: 48, height: 48 },
});
