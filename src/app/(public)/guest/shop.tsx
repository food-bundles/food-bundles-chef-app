import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { hit, radius, space, text, useTheme } from '@/theme';
import { ScreenScroll, StickyFooter } from '@/components/layout';
import { PersonIcon, ChevronLeftIcon, BasketIcon } from '@/components/icons';
import { CategoryChips, type CategoryOption } from '@/components/public/CategoryChips';
import { GuestProductGrid } from '@/components/public/GuestProductGrid';
import { useGuestCartStore } from '@/stores';
import { products } from '@/mocks';
import { formatRwf } from '@/lib';
import { useT } from '@/i18n';

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ANIMAL_PRODUCTS', label: 'Animal Products' },
  { key: 'FRESH_FRUITS', label: 'Fresh Fruits' },
  { key: 'FRESH_VEGETABLES', label: 'Fresh Vegetables' },
  { key: 'OTHERS', label: 'Others' },
  { key: 'DISCOUNTED', label: 'Discounted' },
];

export default function GuestShop() {
  const t = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<CategoryOption['key']>('ALL');
  const itemCount = useGuestCartStore((state) => state.itemCount());
  const total = useGuestCartStore((state) => state.total());

  const visibleProducts = useMemo(
    () => (category === 'ALL' ? products : products.filter((p) => p.category === category)),
    [category],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.oat }]}>
      <View style={[styles.header, { borderBottomColor: colors.hairline, paddingTop: insets.top + space.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('action_back')}
          style={[styles.iconButton, { backgroundColor: colors.paper, borderColor: colors.hairline }]}
        >
          <ChevronLeftIcon />
        </Pressable>
        <Text style={[styles.title, { color: colors.ink }]}>{t('guest_shopTitle')}</Text>
        <Pressable
          onPress={() => router.push('/(public)/guest/cart')}
          accessibilityRole="button"
          accessibilityLabel={`Open guest basket, ${itemCount} items`}
          style={[styles.iconButton, { backgroundColor: colors.paper, borderColor: colors.hairline }]}
        >
          <BasketIcon />
          {itemCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.marigold }]}>
              <Text style={[styles.badgeLabel, { color: colors.pine }]}>{itemCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
          accessibilityLabel={t('landing_login')}
          style={[styles.iconButtonTint, { backgroundColor: colors.tintLeaf }]}
        >
          <PersonIcon color={colors.pine} />
        </Pressable>
      </View>
      <ScreenScroll contentInsetBottom={80} applyTopInset={false}>
        <View style={[styles.banner, { backgroundColor: colors.tintMarigoldSoft, borderColor: colors.marigoldLine }]}>
          <Text style={[styles.bannerText, { color: colors.tintedAmberText }]}>
            <Text style={[styles.bannerBold, { color: colors.tintedAmberText }]}>{t('guest_bannerTitle')}</Text> —{' '}
            {t('guest_bannerBody')}
          </Text>
        </View>
        <View style={styles.chips}>
          <CategoryChips options={CATEGORY_OPTIONS} selected={category} onSelect={setCategory} />
        </View>
        <View style={styles.grid}>
          <GuestProductGrid products={visibleProducts} onSelectProduct={() => undefined} />
        </View>
      </ScreenScroll>
      <StickyFooter>
        <View style={styles.footerRow}>
          <View>
            <Text style={[styles.footerCount, { color: colors.secondary }]}>{itemCount} items</Text>
            <Text style={[styles.footerTotal, { color: colors.ink }]}>{formatRwf(total)}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(public)/guest/cart')}
            accessibilityRole="button"
            accessibilityLabel={t('guest_viewBasket')}
            style={[styles.footerButton, { backgroundColor: colors.leaf }]}
          >
            <Text style={[styles.footerButtonLabel, { color: colors.paper }]}>{t('guest_viewBasket')}</Text>
          </Pressable>
        </View>
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
  },
  title: { ...text.h2, flex: 1 },
  iconButton: {
    width: hit.min,
    height: hit.min,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonTint: {
    width: hit.min,
    height: hit.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeLabel: { ...text.micro },
  banner: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },
  bannerText: { ...text.caption, lineHeight: 18 },
  bannerBold: { ...text.bodySemi },
  chips: { marginTop: space.md },
  grid: { marginTop: space.md },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footerCount: { ...text.caption },
  footerTotal: { ...text.h2, fontVariant: ['tabular-nums'] },
  footerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonLabel: { ...text.bodySemi },
});
