import { View, Text } from 'react-native';
import { CheckCircle, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react-native';
import type { SyncPhase } from '@/hooks/useSyncStatus';

interface Props {
  phase: SyncPhase;
  pendingCount?: number;
}

const CONFIG: Record<SyncPhase, { icon: React.ReactNode; label: string; className: string }> = {
  idle: {
    icon: <CheckCircle size={12} color="#1DB954" strokeWidth={2.5} />,
    label: 'Saved',
    className: 'bg-success/10 border-success/30',
  },
  pending: {
    icon: <RefreshCw size={12} color="#F59E0B" strokeWidth={2.5} />,
    label: 'Pending',
    className: 'bg-warning/10 border-warning/30',
  },
  syncing: {
    icon: <RefreshCw size={12} color="#60A5FA" strokeWidth={2.5} />,
    label: 'Syncing',
    className: 'bg-blue-500/10 border-blue-500/30',
  },
  failed: {
    icon: <CloudOff size={12} color="#EF4444" strokeWidth={2.5} />,
    label: 'Sync failed',
    className: 'bg-danger/10 border-danger/30',
  },
  conflict: {
    icon: <AlertTriangle size={12} color="#EF4444" strokeWidth={2.5} />,
    label: 'Conflict',
    className: 'bg-danger/10 border-danger/30',
  },
};

export function SyncStatusBadge({ phase, pendingCount }: Props) {
  const cfg = CONFIG[phase];
  const label =
    phase === 'pending' && pendingCount && pendingCount > 0
      ? `${pendingCount} pending`
      : cfg.label;

  return (
    <View className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${cfg.className}`}>
      {cfg.icon}
      <Text className="text-surface-300 text-xs">{label}</Text>
    </View>
  );
}
