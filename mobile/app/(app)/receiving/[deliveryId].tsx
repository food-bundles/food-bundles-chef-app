import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import type { OrderLineDto } from '@/api/orders-api';
import type { BadgeVariant } from '@/components/ui/StatusBadge';
import type { ReceivingDecision } from '@/api/receiving-api';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  confirmed: 'warning',
  out_for_delivery: 'info',
  delivered: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Pending',
  out_for_delivery: 'In Transit',
  delivered: 'Delivered',
};

export default function DeliveryDetailScreen() {
  const { deliveryId } = useLocalSearchParams<{ deliveryId: string }>();
  const { data: order, isLoading, error } = useDeliveryDetail(deliveryId ?? '');
  const startDeliveryMutation = useStartDelivery();
  const receiveDeliveryMutation = useReceiveDelivery();
  const { decisions, clearDelivery } = usePendingDecisions();

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader title="Delivery" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand[500]} />
        </View>
      </AppScreen>
    );
  }

  if (error || !order) {
    return (
      <AppScreen>
        <AppHeader title="Delivery" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ color: colors.surface[400] }}>
            {error ? 'Could not load order. Check your connection.' : 'Order not found.'}
          </Text>
        </View>
      </AppScreen>
    );
  }

  const lines = order.lines ?? [];
  const allDecided = lines.length > 0 && lines.every((l) => decisions[l.id] !== undefined);
  const canStart = order.status === 'confirmed';
  const canComplete = order.status === 'out_for_delivery' && allDecided;
  const isCompleted = order.status === 'delivered';

  const handleStart = () => {
    startDeliveryMutation.mutate(order.id, {
      onError: () => Alert.alert('Error', 'Could not start delivery. Please try again.'),
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
        onError: () => Alert.alert('Error', 'Could not complete delivery. Please try again.'),
      },
    );
  };

  return (
    <AppScreen>
      <AppHeader title="Delivery" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] }}
      >
        {/* Header info */}
        <View style={{ backgroundColor: colors.surface[800], borderRadius: 12, padding: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <Text style={{ color: colors.white, fontWeight: fontWeight.semibold }}>
              {order.external_order_id ? `Order ${order.external_order_id}` : `Order ${order.id.slice(0, 8)}`}
            </Text>
            <StatusBadge
              label={STATUS_LABEL[order.status] ?? order.status.replace(/_/g, ' ')}
              variant={STATUS_VARIANT[order.status] ?? 'neutral'}
            />
          </View>
          {order.delivery_date && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={12} color={colors.surface[500]} />
              <Text style={{ color: colors.surface[500], fontSize: fontSize.xs }}>
                Expected {new Date(order.delivery_date).toLocaleDateString()}
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
            label={startDeliveryMutation.isPending ? 'Starting…' : 'Start Receiving'}
            onPress={handleStart}
            disabled={startDeliveryMutation.isPending}
          />
        )}

        {/* Line items */}
        <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Items ({lines.length})
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
            label={receiveDeliveryMutation.isPending ? 'Completing…' : 'Complete Delivery'}
            onPress={handleComplete}
            disabled={receiveDeliveryMutation.isPending}
          />
        )}

        {isCompleted && (
          <View style={{ backgroundColor: `${colors.success}1A`, borderRadius: 12, padding: spacing.md, alignItems: 'center', flexDirection: 'row', gap: spacing.sm }}>
            <CheckCircle size={16} color={colors.success} />
            <Text style={{ color: colors.success, fontWeight: fontWeight.medium }}>Delivery completed</Text>
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
        backgroundColor: colors.surface[800],
        borderRadius: 12,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: !canReceive && !isReceived ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <Text style={{ color: colors.white, fontWeight: fontWeight.medium }}>{line.product_name}</Text>
        <Text style={{ color: colors.surface[400], fontSize: fontSize.sm, marginTop: 2 }}>
          Ordered: {line.quantity_ordered} {line.unit}
        </Text>
        {receivedQty !== undefined && (
          <Text style={{ color: isShort ? colors.warning : colors.surface[400], fontSize: fontSize.sm }}>
            Received: {decision!.quantity_received} {line.unit}
            {isShort ? ' ⚠ Short delivery' : ''}
          </Text>
        )}
        <Text style={{ color: colors.surface[600], fontSize: fontSize.xs, marginTop: 2 }}>
          Ref: {line.unit_price} RWF/{line.unit}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {isReceived && decision ? (
          <StatusBadge
            label={decision.decision === 'accepted' ? 'Accepted' : decision.decision === 'partially-accepted' ? 'Partial' : 'Rejected'}
            variant={decisionVariant[decision.decision] ?? 'neutral'}
          />
        ) : canReceive ? (
          <ChevronRight size={16} color={colors.surface[600]} />
        ) : null}
      </View>
    </Pressable>
  );
}
