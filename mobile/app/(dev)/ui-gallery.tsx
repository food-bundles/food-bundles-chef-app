import { useState } from 'react';
import { ScrollView, View, Text, Pressable, useColorScheme } from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { Snackbar } from '@/components/ui/Snackbar';
import { KeyboardActionBar } from '@/components/ui/KeyboardActionBar';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useThemePreference } from '@/providers/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  Truck,
  Star,
  Trash2,
  TrendingDown,
  UtensilsCrossed,
} from 'lucide-react-native';
import { AppButton } from '@/components/ui/AppButton';
import { ListRow } from '@/components/ui/ListRow';
import { SelectableChip } from '@/components/ui/SelectableChip';
import { KPITile } from '@/components/ui/KPITile';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { AppTextField } from '@/components/ui/AppTextField';
import { colors, spacing, fontSize, radius } from '@/lib/theme';
import {
  BeforeServiceCard,
  EndOfDayCard,
  HomeHeader,
  NoDeliveryCard,
  ProgressSteps,
  ServiceCard,
} from '@/features/home/HomeViews';
import type { DeliveryCardData } from '@/features/home/useHome';

/** The Food Bundles UX mockups' sample data (screens 01–03), for side-by-side checks. */
const SAMPLE_DELIVERY: DeliveryCardData = {
  orderId: 'sample',
  status: 'out_for_delivery',
  orderNo: 'FB-2418',
  totals: [{ amount: 28700, currency: 'RWF' }],
  itemCount: 5,
  items: [
    { name: 'Chicken', quantity: '4', unit: 'kg' },
    { name: 'Cooking banana', quantity: '6', unit: 'kg' },
    { name: 'Rice', quantity: '3', unit: 'kg' },
  ],
};
const noop = () => {};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: isDark ? colors.surface[400] : colors.surface[600], fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function UIGalleryScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { preference, setPreference } = useThemePreference();
  const [snackVisible, setSnackVisible] = useState(false);
  const [chip, setChip] = useState('Main');
  const [fieldValue, setFieldValue] = useState('');
  const keyboardVisible = useKeyboardVisible();
  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const borderColor = isDark ? colors.surface[700] : colors.surface[200];

  if (!__DEV__) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
        <Text style={{ color: textPrimary }}>Dev only</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 96 }}
    >
      <Text style={{ color: textPrimary, fontSize: fontSize['2xl'], fontWeight: '800' }}>
        UI Gallery
      </Text>
      <Text style={{ color: isDark ? colors.surface[400] : colors.surface[500], fontSize: fontSize.sm }}>
        Theme: {isDark ? 'Dark' : 'Light'} (preference: {preference}). Screenshot once in each theme.
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['light', 'dark', 'system'] as const).map((p) => (
          <SelectableChip key={p} label={p} selected={preference === p} onPress={() => void setPreference(p)} />
        ))}
      </View>

      {/* Phase 9: Home screens 01–03 with the mockups' sample numbers */}
      <Section title="Home 01 — Before service (mockup p.1)">
        <HomeHeader kitchenName="Food Court" onMenu={noop} onProfile={noop} onSwitch={noop} />
        <ProgressSteps steps={{ receive: 'current', commands: 'upcoming', requisition: 'upcoming' }} />
        <BeforeServiceCard delivery={SAMPLE_DELIVERY} expectedAt="Expected around 07:30" onReceive={noop} onSkip={noop} />
        <NoDeliveryCard onAddElsewhere={noop} />
      </Section>
      <Section title="Home 02 — Service (mockup p.2)">
        <ProgressSteps steps={{ receive: 'done', commands: 'current', requisition: 'upcoming' }} />
        <ServiceCard counts={{ new: 2, cooking: 3, served: 43, cancelled: 1 }} onOpenCommands={noop} />
      </Section>
      <Section title="Home 03 — End of day (mockup p.3)">
        <ProgressSteps steps={{ receive: 'done', commands: 'done', requisition: 'current' }} />
        <EndOfDayCard
          served={61}
          cancelled={2}
          requisition={{ totals: [{ amount: 28700, currency: 'RWF' }], itemCount: 5 }}
          onReview={noop}
        />
      </Section>

      {/* Root-cause proof: left tile must render WITHOUT a green background, right tile WITH one */}
      <Section title="Root cause — Pressable style function">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* eslint-disable-next-line no-restricted-syntax -- intentional broken example */}
          <Pressable style={({ pressed }) => ({ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.brand[500], opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ color: textPrimary, fontSize: fontSize.xs }}>Raw Pressable + style fn (broken: no green)</Text>
          </Pressable>
          <AppPressable style={({ pressed }) => ({ flex: 1, padding: 12, borderRadius: 12, backgroundColor: colors.brand[500], opacity: pressed ? 0.7 : 1 })}>
            <Text style={{ color: colors.white, fontSize: fontSize.xs }}>AppPressable + style fn (fixed: green)</Text>
          </AppPressable>
        </View>
      </Section>

      {/* AppButton */}
      <Section title="AppButton — all variants">
        <AppButton label="Primary (md)" onPress={() => {}} />
        <AppButton label="Primary (lg)" onPress={() => {}} size="lg" />
        <AppButton label="Secondary" onPress={() => {}} variant="secondary" />
        <AppButton label="Danger" onPress={() => {}} variant="danger" />
        <AppButton label="Ghost" onPress={() => {}} variant="ghost" />
        <AppButton label="Disabled" onPress={() => {}} disabled />
        <AppButton label="Loading" onPress={() => {}} loading />
      </Section>

      {/* ListRow */}
      <Section title="ListRow — all states">
        <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, borderWidth: 1, borderColor, overflow: 'hidden' }}>
          <ListRow
            icon={<Settings size={18} color={colors.brand[500]} strokeWidth={2} />}
            iconBg={colors.brand[50]}
            title="With icon and chevron"
            subtitle="Subtitle text here"
            onPress={() => {}}
          />
          <ListRow
            icon={<Truck size={18} color={colors.brand[500]} strokeWidth={2} />}
            iconBg={colors.brand[50]}
            title="With trailing badge"
            trailing={
              <View style={{ backgroundColor: colors.brand[50], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
                <Text style={{ color: colors.brand[500], fontSize: fontSize.xs, fontWeight: '600' }}>3</Text>
              </View>
            }
            onPress={() => {}}
          />
          <ListRow
            icon={<Star size={18} color={colors.warning} strokeWidth={2} />}
            title="No subtitle, no chevron"
          />
          <ListRow
            icon={<Trash2 size={18} color={colors.danger} strokeWidth={2} />}
            title="Destructive row"
            subtitle="This action cannot be undone"
            destructive
            onPress={() => {}}
          />
          <ListRow
            title="No icon, just text"
            onPress={() => {}}
            separator={false}
          />
        </View>
      </Section>

      {/* SelectableChip */}
      <Section title="SelectableChip">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <SelectableChip label="Unselected" selected={false} onPress={() => {}} />
          <SelectableChip label="Selected" selected onPress={() => {}} />
          <SelectableChip label="Disabled" selected={false} onPress={() => {}} disabled />
          {['Main', 'Side', 'Drink', 'Dessert'].map((c) => (
            <SelectableChip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
          ))}
        </View>
      </Section>

      {/* KPITile */}
      <Section title="KPITile — all colors">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['green', 'amber', 'red', 'blue', 'neutral'] as const).map((color) => (
            <View key={color} style={{ flex: 1, minWidth: 140 }}>
              <KPITile
                value={color === 'green' ? '✓' : '3'}
                label={color.charAt(0).toUpperCase() + color.slice(1)}
                sublabel="sublabel"
                icon={<TrendingDown size={18} color={color === 'green' ? colors.brand[500] : color === 'amber' ? colors.warning : color === 'red' ? colors.danger : color === 'blue' ? colors.info : colors.surface[500]} strokeWidth={2} />}
                color={color}
                onPress={() => {}}
              />
            </View>
          ))}
        </View>
      </Section>

      {/* StatusBadge */}
      <Section title="StatusBadge">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <StatusBadge label="Active" variant="success" />
          <StatusBadge label="Warning" variant="warning" />
          <StatusBadge label="Danger" variant="danger" />
          <StatusBadge label="Info" variant="info" />
          <StatusBadge label="Neutral" variant="neutral" />
        </View>
      </Section>

      {/* Avatar */}
      <Section title="Avatar">
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Avatar name="Emmanuel Masha" size={56} />
          <Avatar name="Test User" size={44} />
          <Avatar size={44} />
        </View>
      </Section>

      {/* AppTextField */}
      <Section title="AppTextField">
        <AppTextField label="Normal field (focus to show the keyboard action bar)" placeholder="Enter text" value={fieldValue} onChangeText={setFieldValue} />
        <AppTextField label="With error" placeholder="Enter text" value="bad@" onChangeText={() => {}} error="Invalid format" />
      </Section>

      <Section title="Snackbar">
        <AppButton label="Show snackbar" variant="secondary" onPress={() => setSnackVisible(true)} />
      </Section>

      <Section title="EmptyState">
        <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, borderWidth: 1, borderColor, paddingVertical: spacing.lg }}>
          <EmptyState Icon={UtensilsCrossed} title="Your menu is empty" description="Add dishes to record sales." actionLabel="Add first item" onAction={() => {}} />
        </View>
      </Section>

      <Section title="ErrorState">
        <View style={{ backgroundColor: cardBg, borderRadius: radius.lg, borderWidth: 1, borderColor, paddingVertical: spacing.lg }}>
          <ErrorState message="Could not load stock. Check your connection." onRetry={() => {}} />
        </View>
      </Section>

      {/* Colors */}
      <Section title="Brand colors">
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([50, 100, 300, 400, 500, 600, 700] as const).map((shade) => (
            <View key={shade} style={{ flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: colors.brand[shade] }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[colors.warning, colors.danger, colors.info, colors.success].map((c) => (
            <View key={c} style={{ flex: 1, height: 32, borderRadius: 8, backgroundColor: c }} />
          ))}
        </View>
      </Section>

      {/* Surface tokens */}
      <Section title="Surface tokens">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {([50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950] as const).map((shade) => (
            <View key={shade} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surface[shade], borderWidth: 1, borderColor: colors.surface[300], alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8, color: shade > 500 ? colors.white : colors.surface[900] }}>{shade}</Text>
            </View>
          ))}
        </View>
      </Section>
    </ScrollView>
    <Snackbar
      visible={snackVisible}
      message="Sales saved · Stock updated"
      actionLabel="Undo"
      onAction={() => setSnackVisible(false)}
      onDismiss={() => setSnackVisible(false)}
    />
    {/* Pinned at the top while the keyboard is open — focus the text field above to see it */}
    <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0 }} pointerEvents="box-none">
      <KeyboardActionBar
        visible={keyboardVisible}
        actions={[
          { kind: 'create', label: 'Create', onPress: () => setSnackVisible(true) },
          { kind: 'save', label: 'Save', onPress: () => setSnackVisible(true) },
          {
            kind: 'remove',
            label: 'Remove',
            onPress: () => setSnackVisible(true),
            confirm: { title: 'Remove item?', message: 'This cannot be undone.', confirmLabel: 'Remove', cancelLabel: 'Cancel' },
          },
        ]}
      />
    </View>
    </View>
  );
}
