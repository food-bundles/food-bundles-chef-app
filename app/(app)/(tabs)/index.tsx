import { ScrollView, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Package, ShoppingCart, TrendingDown, CheckCircle } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { MOCK_DASHBOARD } from '@/data/mock/dashboard-mock';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const d = MOCK_DASHBOARD;

  return (
    <View className="flex-1 bg-surface-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-800">
        <View>
          <Text className="text-surface-400 text-xs font-medium uppercase tracking-wider">
            Active Kitchen
          </Text>
          <Text className="text-white text-lg font-bold">
            {activeKitchen?.name ?? 'No kitchen selected'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/kitchens/index')}
          accessibilityRole="button"
          accessibilityLabel="Switch kitchen"
          className="bg-surface-800 rounded-lg px-3 py-2"
        >
          <Text className="text-brand-400 text-sm font-medium">Switch</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerts */}
        {d.alerts.length > 0 && (
          <View className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <AlertTriangle size={16} color="#F59E0B" strokeWidth={2} />
              <Text className="text-warning font-semibold text-sm">
                {d.alerts.length} Alert{d.alerts.length > 1 ? 's' : ''}
              </Text>
            </View>
            {d.alerts.map((alert) => (
              <Text key={alert.id} className="text-surface-300 text-sm mb-1">
                • {alert.message}
              </Text>
            ))}
          </View>
        )}

        {/* Summary row */}
        <View className="flex-row gap-3">
          <StatCard
            icon={<TrendingDown size={18} color="#EF4444" strokeWidth={2} />}
            label="Low Stock"
            value={String(d.lowStockCount)}
            valueColor="text-danger"
            onPress={() => router.push('/(app)/(tabs)/stock')}
          />
          <StatCard
            icon={<ShoppingCart size={18} color="#F59E0B" strokeWidth={2} />}
            label="Pending Orders"
            value={String(d.pendingOrderCount)}
            valueColor="text-warning"
            onPress={() => router.push('/(app)/(tabs)/purchasing')}
          />
          <StatCard
            icon={<Package size={18} color="#1DB954" strokeWidth={2} />}
            label="Deliveries"
            value={String(d.todayDeliveryCount)}
            valueColor="text-success"
          />
        </View>

        {/* Low stock ingredients */}
        <SectionHeader title="Low Stock" onAction={() => router.push('/(app)/(tabs)/stock')} actionLabel="See all" />
        {d.lowStockItems.map((item) => (
          <View key={item.id} className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between">
            <View>
              <Text className="text-white font-medium">{item.name}</Text>
              <Text className="text-surface-400 text-sm mt-0.5">
                {item.currentStock} {item.unit} remaining
              </Text>
            </View>
            <View className="bg-danger/10 rounded-lg px-2 py-1">
              <Text className="text-danger text-xs font-semibold">
                {item.daysOfCover.toFixed(1)} days
              </Text>
            </View>
          </View>
        ))}

        {/* Recent deliveries */}
        <SectionHeader title="Recent Deliveries" />
        {d.recentDeliveries.map((delivery) => (
          <View key={delivery.id} className="bg-surface-800 rounded-xl p-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white font-medium">{delivery.supplierName}</Text>
              <Text className="text-surface-400 text-sm mt-0.5">{delivery.date}</Text>
            </View>
            <StatusBadge status={delivery.status} />
          </View>
        ))}

        {/* Procurement reminder */}
        <View className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
          <View className="flex-row items-center gap-2 mb-2">
            <CheckCircle size={16} color="#1DB954" strokeWidth={2} />
            <Text className="text-brand-400 font-semibold text-sm">Procurement Reminder</Text>
          </View>
          <Text className="text-surface-300 text-sm">{d.procurementReminder}</Text>
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/purchasing')}
            accessibilityRole="button"
            accessibilityLabel="Review purchase list"
            className="mt-3 bg-brand-500 rounded-lg py-2.5 items-center active:opacity-80"
          >
            <Text className="text-white font-semibold text-sm">Review Purchase List</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={label}
      className="flex-1 bg-surface-800 rounded-xl p-3 items-center active:opacity-70"
    >
      {icon}
      <Text className={`text-2xl font-bold mt-2 ${valueColor}`}>{value}</Text>
      <Text className="text-surface-400 text-xs mt-1 text-center">{label}</Text>
    </Pressable>
  );
}

function SectionHeader({ title, onAction, actionLabel }: { title: string; onAction?: () => void; actionLabel?: string }) {
  return (
    <View className="flex-row items-center justify-between mt-2">
      <Text className="text-surface-300 text-xs font-semibold uppercase tracking-wider">{title}</Text>
      {onAction && actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text className="text-brand-400 text-xs font-medium">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    received: { bg: 'bg-success/10', text: 'text-success', label: 'Received' },
    partial: { bg: 'bg-warning/10', text: 'text-warning', label: 'Partial' },
    pending: { bg: 'bg-surface-700', text: 'text-surface-400', label: 'Pending' },
    short: { bg: 'bg-danger/10', text: 'text-danger', label: 'Short' },
  };
  const s = map[status] ?? map['pending']!;
  return (
    <View className={`${s.bg} rounded-lg px-2 py-1`}>
      <Text className={`${s.text} text-xs font-semibold`}>{s.label}</Text>
    </View>
  );
}
