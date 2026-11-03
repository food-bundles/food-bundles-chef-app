import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

type Decision = 'accepted' | 'partial' | 'rejected' | 'pending';

const CHECKS = ['Freshness', 'Ripeness', 'Damage', 'Spoilage', 'Size & Grade', 'Foreign Matter'];

const DELIVERY_ITEMS: {
  name: string; ordered: string; received: string | null;
  price: string | null; score: number | null; decision: Decision;
}[] = [
  { name: 'Tomatoes',    ordered: '12 kg', received: '11.5 kg', price: 'RWF 800/kg',   score: 88, decision: 'accepted' },
  { name: 'Onions',      ordered: '8 kg',  received: '6 kg',    price: 'RWF 600/kg',   score: 72, decision: 'partial'  },
  { name: 'Tilapia',     ordered: '10 kg', received: null,      price: null,            score: null, decision: 'pending' },
  { name: 'Cooking Oil', ordered: '4 L',   received: '4 L',     price: 'RWF 2,100/L',  score: 95, decision: 'accepted' },
];

const DECISION_COLORS: Record<Decision, { bg: string; text: string }> = {
  accepted: { bg: 'tintLeaf',  text: 'tintedGreenText' },
  partial:  { bg: 'tintMarigold', text: 'tintedAmberText' },
  rejected: { bg: 'tintChili', text: 'tintedRedText' },
  pending:  { bg: 'neutral',   text: 'secondary' },
};

const DECISION_LABEL: Record<Decision, string> = {
  accepted: '✓ Accepted',
  partial:  '~ Partial',
  rejected: '✗ Rejected',
  pending:  '· Pending',
};

// Profit impact: accepted value at FB price
const ACCEPTED_VALUE = (11.5 * 800) + (6 * 600) + (4 * 2100);
const REJECTED_VALUE = (2 * 600); // 2 kg onions not accepted

export default function DeliveriesScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.header}>
          <Text variant="headline">Receive Supply</Text>
          <Text variant="body" color={palette.secondary}>FoodBundles · 27 Oct 2026 · 08:45</Text>
        </View>

        {/* Profit impact summary */}
        <View style={[styles.summaryRow, { backgroundColor: palette.paper }]}>
          <View style={styles.summaryCell}>
            <Text variant="caption" color={palette.muted}>ACCEPTED VALUE</Text>
            <Text variant="title" color={palette.tintedGreenText}>RWF {ACCEPTED_VALUE.toLocaleString()}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: palette.hairline }]} />
          <View style={styles.summaryCell}>
            <Text variant="caption" color={palette.muted}>REJECTED / SHORT</Text>
            <Text variant="title" color={palette.tintedRedText}>RWF {REJECTED_VALUE.toLocaleString()}</Text>
          </View>
        </View>

        {/* Per-item list */}
        {DELIVERY_ITEMS.map((item) => {
          const dc = DECISION_COLORS[item.decision];
          const bgColor = palette[dc.bg as keyof typeof palette] as string;
          const textColor = palette[dc.text as keyof typeof palette] as string;
          return (
            <View key={item.name} style={[styles.card, { backgroundColor: palette.paper }]}>
              <View style={styles.itemHeader}>
                <Text variant="title">{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: bgColor }]}>
                  <Text variant="caption" color={textColor}>{DECISION_LABEL[item.decision]}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text variant="caption" color={palette.muted}>Ordered: {item.ordered}</Text>
                {item.received && <Text variant="caption" color={palette.muted}>Received: {item.received}</Text>}
                {item.price && <Text variant="caption" color={palette.muted}>{item.price}</Text>}
              </View>

              {item.score !== null && (
                <View style={styles.scoreRow}>
                  <Text variant="caption" color={palette.muted}>Quality score</Text>
                  <View style={[styles.scoreBar, { backgroundColor: palette.neutral }]}>
                    <View style={[
                      styles.scoreFill,
                      {
                        width: `${item.score}%` as any,
                        backgroundColor: item.score >= 80 ? palette.leaf : item.score >= 60 ? palette.marigold : palette.chili,
                      },
                    ]} />
                  </View>
                  <Text variant="caption" color={palette.secondary}>{item.score}/100</Text>
                </View>
              )}

              {item.decision === 'pending' && (
                <Button
                  label="Start Check-in"
                  onPress={() => router.push('/(app)/deliveries/checkin')}
                  style={{ marginTop: 10 }}
                />
              )}
            </View>
          );
        })}

        {/* Quality checklist reference */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Quality Checklist</Text>
          <Text variant="caption" color={palette.muted} style={{ marginTop: 4 }}>
            AI flags what is visible. Your weight and decision always win.
          </Text>
          <View style={{ gap: 6, marginTop: 10 }}>
            {CHECKS.map((c) => (
              <View key={c} style={styles.checkRow}>
                <Text variant="body">{c}</Text>
                <Text variant="caption" color={palette.muted}>Pass / Watch / Fail</Text>
              </View>
            ))}
          </View>
        </View>

        <Button label="New Delivery Check-in" onPress={() => router.push('/(app)/deliveries/checkin')} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { gap: 2 },
  summaryRow: { flexDirection: 'row', borderRadius: 16, padding: 16 },
  summaryCell: { flex: 1, gap: 4 },
  divider: { width: 1, marginHorizontal: 12 },
  card: { borderRadius: 16, padding: 16, gap: 6 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  scoreBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 3 },
  checkRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
