import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ChevronRight, Clock } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppButton } from '@/components/ui/AppButton';
import {
  useDeliveryDetail,
  useStartDelivery,
  useReceiveDelivery,
} from '@/features/receiving/useDeliveries';
import { usePendingDecisions } from '@/features/receiving/pendingDecisions';
import type { PendingLineDecision } from '@/features/receiving/pendingDecisions';
import { isShortDelivery } from '@/domain/calculations/purchasing';
import { colors, spacing, fontSize, fontWeight } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import type { OrderLineDto } from '@/api/orders-api';
import type { BadgeVariant } from '@/components/ui/StatusBadge';
import type { ReceivingDecision } from '@/api/receiving-api';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  submitted: 'warning',
  confirmed: 'warning',
  out_for_delivery: 'info',
  delivered: 'success',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  submitted: 'receiving.statusSubmitted',
  confirmed: 'receiving.statusConfirmed',
  out_for_delivery: 'receiving.statusOutForDelivery',
  delivered: 'receiving.statusDelivered',
};

export default function DeliveryDetailScreen() {
  const { t, i18n } = useTranslation();
  const { deliveryId } = useLocalSearchParams<{ deliveryId: string }>();
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const { data: order, isLoading, error } = useDeliveryDetail(deliveryId ?? '');
  const startDeliveryMutation = useStartDelivery();
  const receiveDeliveryMutation = useReceiveDelivery();
  const { decisions, clearDelivery } = usePendingDecisions();

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader title={t('receiving.deliveryTitle')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      </AppScreen>
    );
  }

  if (error || !order) {
    return (
      <AppScreen>
        <AppHeader title={t('receiving.deliveryTitle')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ color: colors.surface[400] }}>
            {error ? t('receiving.deliveryLoadError') : t('receiving.deliveryNotFound')}
          </Text>
        </View>
      </AppScreen>
    );
  }

  const lines = order.lines ?? [];
  const allDecided = lines.length > 0 && lines.every((l) => decisions[l.id] !== undefined);
  const canStart = order.status === 'submitted' || order.status === 'confirmed';
  const canComplete = order.status === 'out_for_delivery' && allDecided;
  const isCompleted = order.status === 'delivered';

  const handleStart = () => {
    startDeliveryMutation.mutate(order.id, {
      onError: () => Alert.alert(t('common.error'), t('receiving.startDeliveryError')),
    });
  };

  const handleComplete = () => {
    const lineBodies = lines
      .filter((l) => decisions[l.id] !== undefined)
      .map((l) => {
        const d = decisions[l.id]!;
        return {
          order_line_id: l.id,
          quantity_received: d.quantity_received,
          decision: d.decision,
          rejection_reason: d.rejection_reason ?? null,
        };
      });

    receiveDeliveryMutation.mutate(
      { orderId: order.id, body: { lines: lineBodies } },
      {
        onSuccess: () => {
          clearDelivery(lines.map((l) => l.id));
          router.back();
        },
        onError: () => Alert.alert(t('common.error'), t('receiving.completeDeliveryError')),
      },
    );
  };

  return (
    <AppScreen>
      <AppHeader title={t('receiving.deliveryTitle')} showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
      >
        {/* Header info */}
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: isDark ? 'transparent' : colors.surface[200] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: textPrimary, fontWeight: fontWeight.semibold }}>
              {t('purchasing.orderNumber', { id: order.external_order_id ?? order.id.slice(0, 8).toUpperCase() })}
            </Text>
            <StatusBadge
              label={STATUS_LABEL_KEYS[order.status] ? t(STATUS_LABEL_KEYS[order.status]!) : order.status.replace(/_/g, ' ')}
              variant={STATUS_VARIANT[order.status] ?? 'neutral'}
            />
          </View>
          {order.delivery_date && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={12} color={colors.surface[500]} />
              <Text style={{ color: colors.surface[500], fontSize: fontSize.xs }}>
                {t('receiving.rowExpected')} {formatDate(order.delivery_date, i18n.language)}
              </Text>
            </View>
          )}
          {order.notes ? (
            <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, marginTop: spacing.xs }}>
              {order.notes}
            </Text>
          ) : null}
        </View>

        {/* Start receiving */}
        {canStart && (
          <AppButton
            label={startDeliveryMutation.isPending ? t('receiving.starting') : t('receiving.startReceiving')}
            onPress={handleStart}
            disabled={startDeliveryMutation.isPending}
          />
        )}

        {/* Line items */}
        <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {t('receiving.items', { count: lines.length })}
        </Text>

        {lines.map((line) => (
          <LineItemRow
            key={line.id}
            line={line}
            deliveryId={order.id}
            canReceive={order.status === 'out_for_delivery'}
            decision={decisions[line.id]}
          />
        ))}

        {/* Complete delivery */}
        {canComplete && (
          <AppButton
            label={receiveDeliveryMutation.isPending ? t('receiving.completing') : t('receiving.completeDelivery')}
            onPress={handleComplete}
            disabled={receiveDeliveryMutation.isPending}
          />
        )}

        {isCompleted && (
          <View style={{ backgroundColor: `${colors.success}1A`, borderRadius: 12, padding: spacing.md, alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
            <CheckCircle size={16} color={colors.success} />
            <Text style={{ color: colors.success, fontWeight: fontWeight.medium }}>{t('receiving.deliveryCompleted')}</Text>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function LineItemRow({
  line,
  deliveryId,
  canReceive,
  decision,
}: {
  line: OrderLineDto;
  deliveryId: string;
  canReceive: boolean;
  decision?: PendingLineDecision;
}) {
  const { t, i18n } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const isReceived = decision !== undefined;
  const receivedQty = decision ? parseFloat(decision.quantity_received) : undefined;
  const orderedQty = parseFloat(line.quantity_ordered);
  const isShort = receivedQty !== undefined && isShortDelivery(orderedQty, receivedQty);

  const decisionVariant: Record<ReceivingDecision, BadgeVariant> = {
    accepted: 'success',
    'partially-accepted': 'warning',
    rejected: 'danger',
  };

  return (
    <Pressable
      onPress={() =>
        canReceive
          ? router.push(`/(app)/receiving/${deliveryId}/item/${line.id}`)
          : undefined
      }
      accessibilityRole={canReceive ? 'button' : 'none'}
      accessibilityLabel={`${line.product_name} — ${isReceived ? 'received' : 'tap to receive'}`}
      style={{
        backgroundColor: cardBg,
        borderRadius: 12,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: !canReceive && !isReceived ? 0.5 : 1,
        borderWidth: 1,
        borderColor: isDark ? 'transparent' : colors.surface[200],
      }}
    >
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <Text style={{ color: textPrimary, fontWeight: fontWeight.medium }}>{line.product_name}</Text>
        <Text style={{ color: textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
          {t('receiving.ordered', { qty: line.quantity_ordered, unit: line.unit })}
        </Text>
        {receivedQty !== undefined && (
          <Text style={{ color: isShort ? colors.warning : textSecondary, fontSize: fontSize.sm }}>
            {t('receiving.receivedQty', { qty: decision!.quantity_received, unit: line.unit })}
            {isShort ? t('receiving.shortDelivery') : ''}
          </Text>
        )}
        <Text style={{ color: colors.surface[500], fontSize: fontSize.xs, marginTop: 2 }}>
          {t('receiving.refPrice', { price: formatMoney(line.unit_price, line.unit_price_currency ?? '', i18n.language), unit: line.unit })}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {isReceived && decision ? (
          <StatusBadge
            label={decision.decision === 'accepted' ? t('receiving.accept') : decision.decision === 'partially-accepted' ? t('receiving.partiallyAccept') : t('receiving.reject')}
            variant={decisionVariant[decision.decision] ?? 'neutral'}
          />
        ) : canReceive ? (
          <ChevronRight size={16} color={colors.surface[600]} />
        ) : null}
      </View>
    </Pressable>
  );
}
