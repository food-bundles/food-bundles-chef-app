import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Package, Download, Share2 } from 'lucide-react-native';
import { useOrderDetail, useCancelOrder, useSubmitOrder } from '@/features/orders/useOrders';
import { useCatalog } from '@/features/purchasing/useCatalog';
import { useKitchenStore } from '@/store/kitchen-store';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProductIcon } from '@/components/ui/ProductIcon';
import { buildRequisitionHtml } from '@/lib/pdf-requisition';
import { colors } from '@/lib/theme';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  delivered: 'success',
  confirmed: 'info',
  submitted: 'warning',
  out_for_delivery: 'info',
  cancelled: 'neutral',
  draft: 'neutral',
};

async function shareOrderAsPdf(htmlContent: string, orderRef: string, t: (key: string, opts?: Record<string, string>) => string) {
  try {
    // Dynamic import so the module load doesn't fail on old builds without the packages
    const Print = await import('expo-print').then((m) => m.default ?? m);
    const Sharing = await import('expo-sharing').then((m) => m.default ?? m);

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Requisition REQ-${orderRef}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert(
        t('orders.sharingUnavailable'),
        t('orders.pdfSavedTo', { uri }),
      );
    }
  } catch (err) {
    Alert.alert(t('orders.pdfError'), t('orders.pdfErrorDesc'));
  }
}

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { data: order, isLoading, error } = useOrderDetail(orderId ?? '');
  const cancelMutation = useCancelOrder();
  const submitMutation = useSubmitOrder();
  const { data: catalog = [] } = useCatalog();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const [sharing, setSharing] = useState(false);

  const catalogImageMap = Object.fromEntries(
    catalog.filter((p) => p.image_url).map((p) => [p.id, p.image_url] as [string, string])
  );

  const totalValue = order?.lines.reduce(
    (sum, l) => sum + parseFloat(l.quantity_ordered) * parseFloat(l.unit_price),
    0,
  ) ?? 0;

  const canSubmit = order?.status === 'draft';
  const canCancel = order && (order.status === 'draft' || order.status === 'submitted');

  const handleSharePdf = async () => {
    if (!order) return;
    setSharing(true);
    try {
      const html = buildRequisitionHtml({
        orderId: order.id,
        status: order.status,
        createdAt: order.created_at,
        deliveryDate: order.delivery_date,
        notes: order.notes,
        kitchenName: activeKitchen?.name ?? 'Kitchen',
        lines: order.lines.map((l) => ({
          product_name: l.product_name,
          unit: l.unit,
          quantity_ordered: l.quantity_ordered,
          unit_price: l.unit_price,
        })),
      });
      await shareOrderAsPdf(html, order.id.slice(-8).toUpperCase(), t);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center gap-3 border-b border-surface-200 dark:border-surface-800">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={colors.surface[500]} strokeWidth={2} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-surface-900 dark:text-white text-lg font-bold">
            {t('orders.detailTitle')} #{order?.id.slice(-6).toUpperCase() ?? '…'}
          </Text>
          {order && (
            <Text className="text-surface-600 dark:text-surface-400 text-xs">
              {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
          )}
        </View>
        {order && (
          <View className="flex-row items-center gap-2">
            <StatusBadge
              label={order.status.replace(/_/g, ' ')}
              variant={STATUS_VARIANT[order.status] ?? 'neutral'}
            />
            <Pressable
              onPress={handleSharePdf}
              disabled={sharing}
              accessibilityRole="button"
              accessibilityLabel={t('orders.shareAsPdf')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ opacity: sharing ? 0.4 : 1 }}
            >
              {sharing
                ? <ActivityIndicator size="small" color={colors.brand[500]} />
                : <Share2 size={20} color={colors.brand[500]} strokeWidth={2} />
              }
            </Pressable>
          </View>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : error || !order ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Package size={40} color={colors.surface[400]} strokeWidth={1.5} />
          <Text className="text-surface-600 dark:text-surface-400 text-center">{t('orders.loadError')}</Text>
          <Pressable onPress={() => router.back()} className="mt-2 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-6 py-3 active:opacity-70">
            <Text className="text-brand-600 dark:text-brand-300 font-medium">{t('orders.goBack')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary card */}
          <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 gap-2">
            <View className="flex-row justify-between">
              <Text className="text-surface-600 dark:text-surface-400 text-xs uppercase tracking-wider">{t('orders.totalValue')}</Text>
              <Text className="text-surface-900 dark:text-white font-bold text-base">
                {totalValue.toLocaleString()} RWF
              </Text>
            </View>
            {order.delivery_date && (
              <View className="flex-row justify-between">
                <Text className="text-surface-600 dark:text-surface-400 text-xs uppercase tracking-wider">{t('orders.delivery')}</Text>
                <Text className="text-surface-700 dark:text-surface-300 text-sm">
                  {new Date(order.delivery_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            )}
            {order.notes && (
              <Text className="text-surface-600 dark:text-surface-400 text-xs mt-1">{order.notes}</Text>
            )}
          </View>

          {/* PDF export button */}
          <Pressable
            onPress={handleSharePdf}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel={t('orders.sharePdfLabel')}
            className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-4 flex-row items-center justify-center gap-2 active:opacity-70"
            style={{ opacity: sharing ? 0.5 : 1 }}
          >
            {sharing
              ? <ActivityIndicator size="small" color={colors.brand[500]} />
              : <Download size={18} color={colors.brand[500]} strokeWidth={2} />
            }
            <Text className="text-brand-600 dark:text-brand-300 font-semibold text-sm">
              {sharing ? t('orders.generatingPdf') : t('orders.shareRequisitionPdf')}
            </Text>
          </Pressable>

          {/* Line items */}
          <Text className="text-surface-600 dark:text-surface-400 text-xs font-medium uppercase tracking-wider">
            {t('orders.items', { count: order.lines.length })}
          </Text>
          {order.lines.length === 0 ? (
            <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 items-center">
              <Text className="text-surface-500 text-sm">{t('orders.noLineItems')}</Text>
            </View>
          ) : (
            order.lines.map((line) => {
              const qty = parseFloat(line.quantity_ordered);
              const price = parseFloat(line.unit_price);
              const lineTotal = qty * price;
              const imageUrl = catalogImageMap[line.catalog_product_id] ?? null;
              return (
                <View key={line.id} className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-center gap-3">
                  <ProductIcon
                    imageUrl={imageUrl}
                    productName={line.product_name}
                    size="md"
                  />
                  <View className="flex-1">
                    <Text className="text-surface-900 dark:text-white font-medium">{line.product_name}</Text>
                    <Text className="text-surface-600 dark:text-surface-400 text-xs mt-0.5">
                      {qty} {line.unit} × {price.toLocaleString()} RWF
                    </Text>
                  </View>
                  <Text className="text-brand-600 dark:text-brand-300 font-semibold text-sm">
                    {lineTotal > 0 ? `${lineTotal.toLocaleString()} RWF` : '—'}
                  </Text>
                </View>
              );
            })
          )}

          {/* Submit draft to confirmed */}
          {canSubmit && (
            <Pressable
              onPress={async () => {
                await submitMutation.mutateAsync(order.id);
                router.back();
              }}
              disabled={submitMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('orders.submitOrderLabel')}
              className="mt-2 bg-brand-500 rounded-xl p-4 items-center active:opacity-80"
            >
              <Text className="text-white font-semibold text-sm">
                {submitMutation.isPending ? t('orders.submitting') : t('orders.submitOrder')}
              </Text>
            </Pressable>
          )}

          {/* Cancel action */}
          {canCancel && (
            <Pressable
              onPress={async () => {
                await cancelMutation.mutateAsync(order.id);
                router.back();
              }}
              disabled={cancelMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('orders.cancelOrder')}
              className="mt-2 border border-danger/40 rounded-xl p-4 items-center active:opacity-70"
            >
              <Text className="text-danger font-medium text-sm">
                {cancelMutation.isPending ? t('orders.cancelling') : t('orders.cancelOrder')}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}
