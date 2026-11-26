import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Package, Truck, Clock, CheckCircle2, ShoppingCart, Plus } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { useDeliveries } from '@/features/receiving/useDeliveries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { OrderDto } from '@/api/orders-api';
import type { BadgeVariant } from '@/components/ui/StatusBadge';
import type { OrderStatus } from '@/api/orders-api';
import { colors } from '@/lib/theme';
import { ReportSummaryCard } from '@/features/reports/ReportSummaryCard';

const STATUS_VARIANT: Partial<Record<OrderStatus, BadgeVariant>> = {
  submitted: 'warning',
  confirmed: 'warning',
  out_for_delivery: 'info',
  delivered: 'success',
};

const STATUS_LABEL_KEYS: Partial<Record<OrderStatus, string>> = {
  submitted: 'receiving.statusSubmitted',
  confirmed: 'receiving.statusConfirmed',
  out_for_delivery: 'receiving.statusOutForDelivery',
  delivered: 'receiving.statusDelivered',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) +
    ' at ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ReceivingIndexScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: orders = [], isLoading, error, refetch } = useDeliveries();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const pending = orders.filter((o) => o.status !== 'delivered');
  const completed = orders.filter((o) => o.status === 'delivered');

  // Calculate received summary
  const receivedSummary = useMemo(() => {
    if (completed.length === 0) return null;
    return { count: completed.length };
  }, [completed]);

  const sections: { title: string; data: OrderDto[] }[] = [];
  if (pending.length > 0)
    sections.push({ title: t('receiving.expectedDeliveries'), data: pending });
  if (completed.length > 0) sections.push({ title: t('receiving.received'), data: completed });

  const flatData: ({ type: 'header'; title: string } | { type: 'row'; order: OrderDto })[] = [];
  for (const s of sections) {
    flatData.push({ type: 'header', title: s.title });
    for (const o of s.data) flatData.push({ type: 'row', order: o });
  }

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <Text className="text-surface-900 dark:text-white text-lg font-bold">
          {t('receiving.listTitle')}
        </Text>
        <Pressable
          onPress={() => router.push('/(app)/receiving/quick' as never)}
          accessibilityRole="button"
          accessibilityLabel={t('receiving.logWalkIn')}
          className="w-10 h-10 items-center justify-center rounded-xl bg-brand-500"
        >
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-red-500 text-sm text-center">{t('receiving.loadError')}</Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item, i) => (item.type === 'header' ? `h-${i}` : item.order.id)}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand[500]}
              colors={[colors.brand[500]]}
            />
          }
          ListHeaderComponent={
            receivedSummary ? (
              <View style={{ marginBottom: 8 }}>
                <ReportSummaryCard
                  title={t('reports.recentDeliveries')}
                  items={[
                    {
                      label: t('reports.deliveriesReceived'),
                      value: receivedSummary.count.toString(),
                    },
                  ]}
                />
              </View>
            ) : undefined
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text className="text-surface-500 dark:text-surface-400 text-xs font-bold uppercase tracking-wider mt-2 mb-0">
                  {item.title}
                </Text>
              );
            }
            return <DeliveryRow order={item.order} />;
          }}
          ListEmptyComponent={
            <View className="items-center gap-5 py-6">
              {/* Illustrated empty state */}
              <View className="w-24 h-24 rounded-full bg-brand-500/10 items-center justify-center">
                <Truck size={40} color={colors.brand[500]} strokeWidth={1.5} />
              </View>
              <View className="items-center gap-2">
                <Text className="text-surface-900 dark:text-white font-bold text-xl">
                  {t('receiving.emptyTitle')}
                </Text>
                <Text className="text-surface-600 dark:text-surface-400 text-sm text-center px-4">
                  {t('receiving.emptyDesc')}
                </Text>
              </View>

              {/* Info tiles */}
              <View className="w-full gap-2">
                <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-start gap-3">
                  <View className="w-8 h-8 rounded-lg bg-brand-500/10 items-center justify-center mt-0.5">
                    <ShoppingCart size={16} color={colors.brand[500]} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-surface-900 dark:text-white font-semibold text-sm">
                      {t('receiving.emptyPlaceFirst')}
                    </Text>
                    <Text className="text-surface-500 text-xs mt-0.5">
                      {t('receiving.emptyPlaceFirstDesc')}
                    </Text>
                  </View>
                </View>
                <View className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent rounded-xl p-4 flex-row items-start gap-3">
                  <View className="w-8 h-8 rounded-lg bg-brand-500/10 items-center justify-center mt-0.5">
                    <Truck size={16} color={colors.brand[500]} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-surface-900 dark:text-white font-semibold text-sm">
                      {t('receiving.emptyWalkIn')}
                    </Text>
                    <Text className="text-surface-500 text-xs mt-0.5">
                      {t('receiving.emptyWalkInDesc')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* CTAs */}
              <View className="w-full gap-2 mt-1">
                <Pressable
                  onPress={() => router.push('/(app)/(tabs)/requisition' as never)}
                  accessibilityRole="button"
                  className="bg-brand-500 rounded-xl px-5 py-4 flex-row items-center justify-center gap-2 active:opacity-80"
                >
                  <ShoppingCart size={18} color={colors.white} strokeWidth={2} />
                  <Text className="text-white font-bold text-sm">
                    {t('receiving.browseCatalogOrder')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(app)/receiving/quick' as never)}
                  accessibilityRole="button"
                  className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-5 py-4 flex-row items-center justify-center gap-2 active:opacity-70"
                >
                  <Truck size={18} color={colors.brand[500]} strokeWidth={2} />
                  <Text className="text-brand-600 dark:text-brand-300 font-semibold text-sm">
                    {t('receiving.logWalkInDelivery')}
                  </Text>
                </Pressable>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}

function DeliveryRow({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const labelKey = STATUS_LABEL_KEYS[order.status];
  const label = labelKey ? t(labelKey) : order.status.replace(/_/g, ' ');
  const variant = STATUS_VARIANT[order.status] ?? 'neutral';
  const isDelivered = order.status === 'delivered';
  const isInTransit = order.status === 'out_for_delivery';

  return (
    <Pressable
      onPress={() => router.push(`/(app)/receiving/${order.id}`)}
      accessibilityRole="button"
      accessibilityLabel={t('receiving.openDeliveryLabel', {
        id: order.external_order_id ?? order.id.slice(0, 8).toUpperCase(),
      })}
      className={`rounded-xl p-4 active:opacity-70 ${isDelivered ? 'bg-brand-500/5 border border-brand-500/20 dark:border-brand-500/15' : isInTransit ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30' : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-transparent'}`}
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-8 h-8 rounded-lg items-center justify-center ${isDelivered ? 'bg-brand-500/15' : isInTransit ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-surface-100 dark:bg-surface-700'}`}
          >
            {isDelivered ? (
              <CheckCircle2 size={16} color={colors.brand[500]} strokeWidth={2} />
            ) : isInTransit ? (
              <Truck size={16} color={colors.info} strokeWidth={2} />
            ) : (
              <Package size={16} color={colors.surface[400]} strokeWidth={1.75} />
            )}
          </View>
          <Text className="text-surface-900 dark:text-white font-semibold text-sm">
            {order.external_order_id
              ? `${t('receiving.rowOrderPrefix')} ${order.external_order_id}`
              : `${t('receiving.rowOrderPrefix')} #${order.id.slice(-6).toUpperCase()}`}
          </Text>
        </View>
        <StatusBadge label={label} variant={variant} />
      </View>

      {/* Timestamps */}
      <View className="gap-1.5">
        <View className="flex-row items-center gap-1.5">
          <Clock size={11} color={colors.surface[400]} strokeWidth={2} />
          <Text className="text-surface-500 dark:text-surface-400 text-xs">
            {t('receiving.rowOrdered')} {formatDateTime(order.created_at)}
            <Text className="text-surface-400 dark:text-surface-500">
              {' '}
              ({formatTimeAgo(order.created_at)})
            </Text>
          </Text>
        </View>
        {order.delivery_date && (
          <View className="flex-row items-center gap-1.5">
            <Truck
              size={11}
              color={isInTransit ? colors.info : colors.surface[400]}
              strokeWidth={2}
            />
            <Text
              className={`text-xs ${isInTransit ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-surface-500 dark:text-surface-400'}`}
            >
              {isDelivered ? t('receiving.rowDelivered') : t('receiving.rowExpected')}:{' '}
              {formatDate(order.delivery_date)}
            </Text>
          </View>
        )}
        {isDelivered && (
          <View className="flex-row items-center gap-1.5">
            <CheckCircle2 size={11} color={colors.brand[500]} strokeWidth={2} />
            <Text className="text-brand-600 dark:text-brand-300 text-xs font-medium">
              {t('receiving.rowReceivedOn')} {formatDateTime(order.updated_at)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
