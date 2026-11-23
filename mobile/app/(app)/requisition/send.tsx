/**
 * 12 · Pay or share (Food Bundles UX spec): Pay myself / Send to restaurant / Share on
 * WhatsApp, with the message preview. Whatever the route, the requisition is saved so
 * tomorrow's Receive is pre-filled. Pay myself (MoMo/card) and Send to restaurant need
 * Food Bundles services that don't exist yet: shown as "Coming soon", never faked.
 */
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatAmount, formatMoney } from '@/lib/money';
import { formatDayShort, formatQuantity } from '@/lib/format';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { createOrder } from '@/api/orders-api';
import { useRequisitionDraft, useSuggestedRequisition } from '@/features/purchasing/requisition-draft';
import { requisitionTotal, whatsappLinks, whatsappMessage } from '@/domain/calculations/requisition';
import { newRequestId } from '@/features/ai/ai-client';

type Route = 'pay' | 'restaurant' | 'whatsapp';
/** Routes with a working backend today (see docs/phase9-external-dependencies.md). */
const AVAILABLE: Record<Route, boolean> = { pay: false, restaurant: false, whatsapp: true };

export default function SendRequisitionScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const chef = useSessionStore((s) => s.chef);
  const suggestion = useSuggestedRequisition();
  const lines = useRequisitionDraft((s) => s.lines).filter((l) => l.qty > 0);
  const clearDraft = useRequisitionDraft((s) => s.clear);
  const [route, setRoute] = useState<Route>('whatsapp');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currency = kitchen?.currency ?? '';
  const totals = requisitionTotal(lines, currency);
  const forDate = suggestion.data?.for_date ?? '';

  const message = whatsappMessage(
    {
      title: t('req.msgTitle', { kitchen: kitchen?.name ?? '' }),
      subtitle: t('req.msgSubtitle', { date: forDate ? formatDayShort(forDate, i18n.language) : '', chef: chef?.name ?? t('commands.chef') }),
      total: t('req.msgTotal', { total: formatAmount(totals.total, currency, i18n.language), currency }),
      footer: t('req.msgFooter'),
    },
    lines,
    (n) => formatQuantity(n, i18n.language),
    (n, c) => formatAmount(n, c, i18n.language),
  );

  const send = async () => {
    if (!kitchen || !AVAILABLE[route]) return;
    setSending(true);
    setError(null);
    try {
      // Save first: tomorrow's Receive is pre-filled from this requisition.
      await createOrder(
        kitchen.id,
        {
          delivery_date: forDate || null,
          route,
          notes: t('req.orderNote'),
          lines: lines.map((l) => ({
            catalog_product_id: l.catalogProductId ?? `custom:${l.ingredientId ?? l.key}`,
            product_name: l.name,
            unit: l.unit,
            quantity_ordered: String(l.qty),
            unit_price: String(l.pricePerUnit ?? 0),
            unit_price_currency: l.currency ?? currency,
            ingredient_id: l.ingredientId,
          })),
        },
        { idempotencyKey: newRequestId() },
      );
      void qc.invalidateQueries({ queryKey: ['orders'] });
      const { app, web } = whatsappLinks(message);
      const canApp = await Linking.canOpenURL(app).catch(() => false);
      await Linking.openURL(canApp ? app : web);
      clearDraft();
      router.replace('/(app)/(tabs)');
    } catch {
      setError(t('req.sendError'));
    } finally {
      setSending(false);
    }
  };

  const options: { route: Route; title: string; body: string }[] = [
    { route: 'pay', title: t('req.payMyself'), body: t('req.payMyselfBody') },
    { route: 'restaurant', title: t('req.sendRestaurant'), body: t('req.sendRestaurantBody') },
    { route: 'whatsapp', title: t('req.shareWhatsApp'), body: t('req.shareWhatsAppBody') },
  ];

  return (
    <View style={[styles.root, { backgroundColor: tk.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
        <AppPressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.iconBtn}>
          <ChevronLeft size={26} color={tk.text} />
        </AppPressable>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: tk.text }]} accessibilityRole="header">
            {t('req.sendTitle')}
          </Text>
          <Text style={[styles.sub, { color: tk.textMuted }]}>
            {t('req.items', { count: totals.items })} · {formatMoney(totals.total, currency, i18n.language)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.section, { color: tk.textMuted }]}>{t('req.howToBuy')}</Text>
        {options.map((o) => {
          const available = AVAILABLE[o.route];
          const selected = route === o.route;
          return (
            <AppPressable
              key={o.route}
              disabled={!available}
              onPress={() => setRoute(o.route)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !available }}
              accessibilityLabel={available ? o.title : t('req.comingSoonLabel', { name: o.title })}
              style={[
                styles.option,
                { backgroundColor: selected ? tk.primaryTint : tk.surfaceRaised, borderColor: selected ? tk.primary : tk.border },
                !available && styles.disabled,
              ]}
            >
              <View style={[styles.radio, { borderColor: selected ? tk.primary : tk.textMuted }]}>
                {selected ? <View style={[styles.dot, { backgroundColor: tk.primary }]} /> : null}
              </View>
              <View style={styles.flex}>
                <View style={styles.optionHead}>
                  <Text style={[styles.optionTitle, { color: tk.text }]}>{o.title}</Text>
                  {!available ? (
                    <View style={[styles.soon, { backgroundColor: tk.surfaceSunken }]}>
                      <Text style={[styles.soonText, { color: tk.textMuted }]}>{t('req.comingSoon')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.sub, { color: tk.textMuted }]}>{o.body}</Text>
              </View>
            </AppPressable>
          );
        })}

        <Text style={[styles.section, { color: tk.textMuted }]}>{t('req.preview')}</Text>
        <View style={[styles.preview, { backgroundColor: tk.primaryTint, borderColor: tk.border }]}>
          <Text style={[styles.previewText, { color: tk.text }]} selectable>
            {message}
          </Text>
        </View>
        {error ? (
          <Text style={[styles.error, { color: tk.danger }]} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: tk.surfaceRaised, borderTopColor: tk.border, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <AppButton
          label={route === 'whatsapp' ? t('req.shareWhatsApp') : route === 'pay' ? t('req.payMyself') : t('req.sendRestaurant')}
          icon={route === 'whatsapp' ? MessageCircle : undefined}
          size="lg"
          loading={sending}
          disabled={!AVAILABLE[route] || lines.length === 0}
          onPress={() => void send()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: MIN_TOUCH_SIZE, height: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize['2xl'], fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.sm },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  section: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 1.2, textTransform: 'uppercase' },
  option: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', borderRadius: radius.xl, borderWidth: 1.5, padding: spacing.md },
  disabled: { opacity: 0.55 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  optionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  soon: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  soonText: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.bold },
  preview: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  previewText: { fontSize: fontSize.base, lineHeight: 24 },
  error: { fontSize: fontSize.sm, textAlign: 'center' },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
