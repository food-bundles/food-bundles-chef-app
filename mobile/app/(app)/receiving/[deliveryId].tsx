import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, ChevronRight, Clock } from 'lucide-react-native';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppButton } from '@/components/ui/AppButton';
import { useDeliveryStore } from '@/store/delivery-store';
import { isShortDelivery } from '@/domain/calculations/purchasing';
import { colors, spacing, fontSize, fontWeight } from '@/lib/theme';
import type { DeliveryLineItem } from '@/domain/models/delivery';
import type { BadgeVariant } from '@/components/ui/StatusBadge';

export default function DeliveryDetailScreen() {
  const { deliveryId } = useLocalSearchParams<{ deliveryId: string }>();
  const delivery = useDeliveryStore((s) => s.deliveries.find((d) => d.id === deliveryId));
  const startDelivery = useDeliveryStore((s) => s.startDelivery);
  const completeDelivery = useDeliveryStore((s) => s.completeDelivery);

  if (!delivery) {
    return (
      <AppScreen>
        <AppHeader title="Delivery" showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.surface[400] }}>Delivery not found.</Text>
        </View>
      </AppScreen>
    );
  }

  const allReceived = delivery.lineItems.every((li) => li.decision !== undefined);
  const canComplete = delivery.status !== 'completed' && allReceived;

  const handleStart = () => startDelivery(delivery.id);
  const handleComplete = () => {
    completeDelivery(delivery.id);
    router.back();
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
            <Text style={{ color: colors.white, fontWeight: fontWeight.semibold }}>{delivery.supplierName}</Text>
            <StatusBadge
              label={delivery.status === 'pending' ? 'Pending' : delivery.status === 'in_progress' ? 'In Progress' : 'Completed'}
              variant={delivery.status === 'completed' ? 'success' : delivery.status === 'in_progress' ? 'info' : 'warning'}
            />
          </View>
          {delivery.scheduledAt && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={12} color={colors.surface[500]} />
              <Text style={{ color: colors.surface[500], fontSize: fontSize.xs }}>
                Expected {new Date(delivery.scheduledAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Start receiving button */}
        {delivery.status === 'pending' && (
          <AppButton label="Start Receiving" onPress={handleStart} />
        )}

        {/* Line items */}
        <Text style={{ color: colors.surface[400], fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Items ({delivery.lineItems.length})
        </Text>

        {delivery.lineItems.map((lineItem) => (
          <LineItemRow
            key={lineItem.id}
            lineItem={lineItem}
            deliveryId={delivery.id}
            canReceive={delivery.status !== 'completed'}
          />
        ))}

        {/* Complete delivery */}
        {canComplete && (
          <AppButton label="Complete Delivery" onPress={handleComplete} />
        )}
      </ScrollView>
    </AppScreen>
  );
}

function LineItemRow({
  lineItem,
  deliveryId,
  canReceive,
}: {
  lineItem: DeliveryLineItem;
  deliveryId: string;
  canReceive: boolean;
}) {
  const isReceived = lineItem.decision !== undefined;
  const isShort = lineItem.acceptedQuantity !== undefined &&
    isShortDelivery(lineItem.orderedQuantity, lineItem.acceptedQuantity);

  const decisionVariant: Record<string, BadgeVariant> = {
    accepted: 'success',
    'partially-accepted': 'warning',
    rejected: 'danger',
  };

  return (
    <Pressable
      onPress={() =>
        canReceive
          ? router.push(`/(app)/receiving/${deliveryId}/item/${lineItem.id}`)
          : undefined
      }
      accessibilityRole={canReceive ? 'button' : 'none'}
      accessibilityLabel={`${lineItem.productName} — ${isReceived ? 'received' : 'tap to receive'}`}
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
        <Text style={{ color: colors.white, fontWeight: fontWeight.medium }}>{lineItem.productName}</Text>
        <Text style={{ color: colors.surface[400], fontSize: fontSize.sm, marginTop: 2 }}>
          Ordered: {lineItem.orderedQuantity} {lineItem.unit}
        </Text>
        {lineItem.acceptedQuantity !== undefined && (
          <Text style={{ color: isShort ? colors.warning : colors.surface[400], fontSize: fontSize.sm }}>
            Accepted: {lineItem.acceptedQuantity} {lineItem.unit}
            {isShort ? ' ⚠ Short delivery' : ''}
          </Text>
        )}
        {lineItem.actualPrice && (
          <Text style={{ color: colors.surface[500], fontSize: fontSize.xs, marginTop: 2 }}>
            Actual: {lineItem.actualPrice.amount.toLocaleString()} {lineItem.actualPrice.currency}/{lineItem.unit}
          </Text>
        )}
        {lineItem.referencePrice && !lineItem.actualPrice && (
          <Text style={{ color: colors.surface[600], fontSize: fontSize.xs, marginTop: 2 }}>
            Ref: {lineItem.referencePrice.amount.toLocaleString()} {lineItem.referencePrice.currency}/{lineItem.unit} ({lineItem.referencePrice.referenceDate})
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {isReceived && lineItem.decision ? (
          <StatusBadge
            label={lineItem.decision === 'accepted' ? 'Accepted' : lineItem.decision === 'partially-accepted' ? 'Partial' : 'Rejected'}
            variant={decisionVariant[lineItem.decision] ?? 'neutral'}
          />
        ) : canReceive ? (
          <ChevronRight size={16} color={colors.surface[600]} />
        ) : null}
      </View>
    </Pressable>
  );
}
