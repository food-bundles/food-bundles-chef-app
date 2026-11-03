import { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

type Rating = 'pass' | 'watch' | 'fail' | null;
type Decision = 'accept' | 'partial' | 'reject' | null;

const CHECKS: { key: string; label: string; description: string }[] = [
  { key: 'freshness',     label: 'Freshness',      description: 'Wilting, dull colour, dry stems or leaves' },
  { key: 'ripeness',      label: 'Ripeness',        description: 'Under- or over-ripe for the product' },
  { key: 'damage',        label: 'Damage',          description: 'Bruising, cuts, crushed items' },
  { key: 'spoilage',      label: 'Spoilage',        description: 'Mould, rot, leaks, soft or bad spots' },
  { key: 'size',          label: 'Size & Grade',    description: 'Uniform size; matches the grade ordered' },
  { key: 'foreignMatter', label: 'Foreign Matter',  description: 'Soil, stones, insects, other products mixed in' },
];

const RATING_COLORS: Record<NonNullable<Rating>, { active: string; label: string }> = {
  pass:  { active: 'leaf',     label: 'Pass'  },
  watch: { active: 'marigold', label: 'Watch' },
  fail:  { active: 'chili',    label: 'Fail'  },
};

export default function CheckinScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();

  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [decision, setDecision] = useState<Decision>(null);

  const score = (() => {
    const vals = Object.values(ratings).filter(Boolean) as Rating[];
    if (vals.length === 0) return null;
    const points = vals.reduce((s, r) => s + (r === 'pass' ? 100 : r === 'watch' ? 60 : 0), 0);
    return Math.round(points / CHECKS.length);
  })();

  const allChecked = CHECKS.every((c) => ratings[c.key]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text variant="body" color={palette.pine}>← Back</Text>
          </Pressable>
          <Text variant="headline">Check-in: Tilapia</Text>
          <Text variant="body" color={palette.secondary}>FoodBundles · Ordered: 10 kg</Text>
        </View>

        {/* Photo placeholder */}
        <Pressable style={[styles.photoBox, { backgroundColor: palette.neutral, borderColor: palette.hairline }]}>
          <Text variant="title" color={palette.muted}>📷</Text>
          <Text variant="body" color={palette.muted}>Tap to photograph crate / bag</Text>
          <Text variant="caption" color={palette.muted}>AI will run quality checks on the photo</Text>
        </Pressable>

        {/* AI estimate note */}
        <View style={[styles.infoCard, { backgroundColor: palette.tintMarigold }]}>
          <Text variant="caption" color={palette.tintedAmberText}>
            AI estimate: ~9.8 kg (visible count). This is an estimate — your weight below always wins.
          </Text>
        </View>

        {/* Quality checks */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <View style={styles.cardHeader}>
            <Text variant="title">Quality Checks</Text>
            {score !== null && (
              <View style={[styles.scorePill, {
                backgroundColor: score >= 80 ? palette.tintLeaf : score >= 60 ? palette.tintMarigold : palette.tintChili,
              }]}>
                <Text variant="label" color={score >= 80 ? palette.tintedGreenText : score >= 60 ? palette.tintedAmberText : palette.tintedRedText}>
                  {score}/100
                </Text>
              </View>
            )}
          </View>

          {CHECKS.map((check, i) => (
            <View
              key={check.key}
              style={[styles.checkRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.hairline }]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body">{check.label}</Text>
                <Text variant="caption" color={palette.muted}>{check.description}</Text>
              </View>
              <View style={styles.ratingBtns}>
                {(['pass', 'watch', 'fail'] as Rating[]).map((r) => {
                  const active = ratings[check.key] === r;
                  const cfg = RATING_COLORS[r!];
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRatings((prev) => ({ ...prev, [check.key]: r }))}
                      style={[
                        styles.ratingBtn,
                        { borderColor: palette[cfg.active as keyof typeof palette] as string },
                        active && { backgroundColor: palette[cfg.active as keyof typeof palette] as string },
                      ]}
                    >
                      <Text
                        variant="caption"
                        color={active ? palette.paper : palette[cfg.active as keyof typeof palette] as string}
                      >
                        {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Weight & Price */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Weight & Price</Text>
          <Text variant="caption" color={palette.muted} style={{ marginTop: 2 }}>
            Your weight replaces the AI estimate. Leave price blank to use FoodBundles reference price.
          </Text>

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ marginBottom: 6 }}>Actual weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="e.g. 9.5"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.hairline, color: palette.ink }]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="label" style={{ marginBottom: 6 }}>Price per kg (RWF)</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="FB ref: 3,200"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.hairline, color: palette.ink }]}
              />
            </View>
          </View>

          {weight && price && (
            <View style={[styles.costRow, { backgroundColor: palette.tintLeaf }]}>
              <Text variant="label" color={palette.tintedGreenText}>
                Total cost: RWF {(parseFloat(weight) * parseFloat(price.replace(/,/g, ''))).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Decision */}
        <View style={[styles.card, { backgroundColor: palette.paper }]}>
          <Text variant="title">Decision</Text>
          <View style={styles.decisionRow}>
            {([
              { key: 'accept',  label: '✓ Accept',       color: 'leaf'     },
              { key: 'partial', label: '~ Accept Part',  color: 'marigold' },
              { key: 'reject',  label: '✗ Reject',       color: 'chili'    },
            ] as { key: Decision; label: string; color: string }[]).map((d) => (
              <Pressable
                key={d.key}
                onPress={() => setDecision(d.key)}
                style={[
                  styles.decisionBtn,
                  { borderColor: palette[d.color as keyof typeof palette] as string },
                  decision === d.key && { backgroundColor: palette[d.color as keyof typeof palette] as string },
                ]}
              >
                <Text
                  variant="label"
                  color={decision === d.key ? palette.paper : palette[d.color as keyof typeof palette] as string}
                >
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          label="Confirm Check-in"
          disabled={!allChecked || !weight || !decision}
          onPress={() => router.back()}
        />
        <Text variant="caption" color={palette.muted} style={{ textAlign: 'center' }}>
          Accepted quantity goes into stock. Shortfalls are flagged automatically.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { gap: 4 },
  back: { marginBottom: 4 },
  photoBox: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', padding: 32, alignItems: 'center', gap: 8 },
  infoCard: { borderRadius: 12, padding: 12 },
  card: { borderRadius: 16, padding: 16, gap: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scorePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  checkRow: { paddingVertical: 10, gap: 8 },
  ratingBtns: { flexDirection: 'row', gap: 6 },
  ratingBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  inputRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 15 },
  costRow: { borderRadius: 10, padding: 10, marginTop: 4 },
  decisionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  decisionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 10, alignItems: 'center' },
});
