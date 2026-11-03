import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { radius, space, text, useTheme } from '@/theme';
import { ScreenScroll, StickyFooter, ScreenHeader } from '@/components/layout';
import { EmptyState } from '@/components/primitives';
import { BasketIcon } from '@/components/icons';
import { GuestCartList } from '@/components/public/GuestCartList';
import { GuestTotalsCard } from '@/components/public/GuestTotalsCard';
import { ConvertPrompt } from '@/components/public/ConvertPrompt';
import { useGuestCartStore } from '@/stores';
import { useT } from '@/i18n';

export default function GuestCart() {
  const t = useT();
  const { colors } = useTheme();
  const itemCount = useGuestCartStore((state) => state.itemCount());

  return (
    <View style={[styles.container, { backgroundColor: colors.oat }]}>
      <ScreenHeader title={t('guest_yourBasket')} />
      <ScreenScroll contentInsetBottom={80} applyTopInset={false}>
        {itemCount === 0 ? (
          <EmptyState
            icon={<BasketIcon size={22} color={colors.leaf} />}
            title={t('guest_emptyBasketTitle')}
            message={t('guest_emptyBasketMessage')}
          />
        ) : (
          <>
            <GuestCartList />
            <View style={styles.totalsGap}>
              <GuestTotalsCard />
            </View>
            <View style={styles.promptGap}>
              <ConvertPrompt />
            </View>
            <Text style={[styles.swipeHint, { color: colors.muted }]}>{t('guest_swipeToRemove')}</Text>
          </>
        )}
      </ScreenScroll>
      <StickyFooter>
        <Pressable
          onPress={() => router.push('/(public)/guest/delivery')}
          disabled={itemCount === 0}
          accessibilityRole="button"
          accessibilityLabel={t('guest_checkoutAsGuest')}
          style={[
            styles.checkoutButton,
            { backgroundColor: colors.leaf },
            itemCount === 0 && styles.checkoutDisabled,
          ]}
        >
          <Text style={[styles.checkoutLabel, { color: colors.paper }]}>{t('guest_checkoutAsGuest')}</Text>
        </Pressable>
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  totalsGap: { marginTop: space.md },
  promptGap: { marginTop: space.md },
  swipeHint: { ...text.caption, textAlign: 'center', marginTop: space.md },
  checkoutButton: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutDisabled: { opacity: 0.5 },
  checkoutLabel: { ...text.bodySemi },
});
