import { useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { duration, hit, radius, shadow, space, text, useTheme } from '@/theme';
import type { Product } from '@/mocks/types';
import { useT } from '@/i18n';
import { formatRwf } from '@/lib';
import { PriceText } from './PriceText';
import { QuantityStepper } from './QuantityStepper';

export interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAdd: () => void;
  qty?: number;
  onInc?: () => void;
  onDec?: () => void;
}

export function ProductCard({ product, onPress, onAdd, qty = 0, onInc, onDec }: ProductCardProps) {
  const t = useT();
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: duration.press });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: duration.press });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.flexOne, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.unit}`}
        style={[styles.container, { backgroundColor: colors.paper }]}
      >
        <Image source={product.image} accessible={false} style={[styles.image, { backgroundColor: colors.neutral }]} />
        {product.wasPrice ? (
          <View style={[styles.discountBadge, { backgroundColor: colors.chili }]}>
            <Text style={[styles.discountLabel, { color: colors.paper }]}>{t('shop_sale')}</Text>
          </View>
        ) : null}
        <View style={styles.body}>
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[styles.unit, { color: colors.muted }]}>{product.unit}</Text>
          <View style={styles.priceRow}>
            <PriceText amount={product.price} size="md" />
            {product.wasPrice ? (
              <Text style={[styles.wasPrice, { color: colors.muted }]}>
                {t('shop_wasPrice', { amount: formatRwf(product.wasPrice) })}
              </Text>
            ) : null}
          </View>
        </View>
        {qty > 0 && onInc && onDec ? (
          <View style={styles.stepperWrap}>
            <QuantityStepper qty={qty} onInc={onInc} onDec={onDec} />
          </View>
        ) : (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={t('shop_addToCartFor', { name: product.name })}
            style={[styles.addButton, { backgroundColor: colors.leaf }]}
          >
            <Text style={[styles.addLabel, { color: colors.paper }]}>{t('shop_add')}</Text>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  container: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  image: { width: '100%', height: 96 },
  discountBadge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  discountLabel: { ...text.micro },
  body: { padding: space.md, gap: 2 },
  name: { ...text.bodySemi },
  unit: { ...text.caption },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: 2 },
  wasPrice: { ...text.caption, textDecorationLine: 'line-through' },
  addButton: {
    minHeight: hit.min,
    marginHorizontal: space.md,
    marginBottom: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...text.bodySemi },
  stepperWrap: {
    marginHorizontal: space.md,
    marginBottom: space.md,
    alignItems: 'center',
  },
});
