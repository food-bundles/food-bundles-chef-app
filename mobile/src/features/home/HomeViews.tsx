/**
 * Home's building blocks (Food Bundles UX spec, screens 01–03). Presentational only: Home and
 * the dev UI gallery pass the data, so the gallery can show the mockups' sample numbers.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, Truck, User, UtensilsCrossed } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { AppButton } from '@/components/ui/AppButton';
import { AppPressable } from '@/components/ui/AppPressable';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, fontWeight, MIN_TOUCH_SIZE, radius, spacing } from '@/lib/theme';
import { formatMoneyList } from '@/lib/money';
import { formatQuantity } from '@/lib/format';
import type { ProgressStepsState, StepStatus } from '@/domain/rules/home-state';
import type { CommandCounts, DeliveryCardData, RequisitionSummary } from './useHome';

// ── Header ───────────────────────────────────────────────────────────────────

export interface HomeHeaderProps {
  kitchenName: string;
  onMenu: () => void;
  onProfile: () => void;
  onSwitch: () => void;
  /** Opens the Kitchen Assistant; the button is hidden when not given. */
  onAssistant?: () => void;
}

/** "KITCHEN" + name, the menu & recipes icon, the profile icon and Switch. */
export function HomeHeader({ kitchenName, onMenu, onProfile, onSwitch, onAssistant }: HomeHeaderProps) {
  const { t } = useTranslation();
  const tk = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: tk.surfaceRaised, borderBottomColor: tk.border }]}>
      <View style={styles.headerText}>
        <Text style={[styles.eyebrow, { color: tk.textMuted }]}>{t('home.kitchenEyebrow')}</Text>
        <Text style={[styles.kitchenName, { color: tk.text }]} numberOfLines={1} accessibilityRole="header">
          {kitchenName}
        </Text>
      </View>
      {onAssistant ? (
        <AppPressable
          onPress={onAssistant}
          accessibilityRole="button"
          accessibilityLabel={t('agent.openAssistant')}
          style={({ pressed }) => [styles.iconButton, { backgroundColor: tk.primaryTint }, pressed && styles.pressed]}
        >
          <Sparkles size={22} color={tk.primary} strokeWidth={2} />
        </AppPressable>
      ) : null}
      <AppPressable
        onPress={onMenu}
        accessibilityRole="button"
        accessibilityLabel={t('home.menuRecipes')}
        style={({ pressed }) => [styles.iconButton, { backgroundColor: tk.surfaceSunken }, pressed && styles.pressed]}
      >
        <UtensilsCrossed size={22} color={tk.text} strokeWidth={2} />
      </AppPressable>
      <AppPressable
        onPress={onProfile}
        accessibilityRole="button"
        accessibilityLabel={t('home.profile')}
        style={({ pressed }) => [styles.iconButton, { backgroundColor: tk.surfaceSunken }, pressed && styles.pressed]}
      >
        <User size={22} color={tk.text} strokeWidth={2} />
      </AppPressable>
      <AppPressable
        onPress={onSwitch}
        accessibilityRole="button"
        accessibilityLabel={t('home.switchLabel')}
        style={({ pressed }) => [styles.switchButton, { borderColor: tk.border }, pressed && styles.pressed]}
      >
        <Text style={[styles.switchText, { color: tk.link }]}>{t('home.switch')}</Text>
      </AppPressable>
    </View>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

/** The 3-step bar: Receive → Commands → Requisition, with ✓ on finished steps. */
export function ProgressSteps({ steps }: { steps: ProgressStepsState }) {
  const { t } = useTranslation();
  const tk = useTheme();
  const items: { n: number; status: StepStatus; label: string; doneLabel: string }[] = [
    { n: 1, status: steps.receive, label: t('home.stepReceive'), doneLabel: t('home.stepReceived') },
    { n: 2, status: steps.commands, label: t('home.stepCommands'), doneLabel: t('home.stepCommands') },
    { n: 3, status: steps.requisition, label: t('home.stepRequisition'), doneLabel: t('home.stepRequisition') },
  ];
  return (
    <View style={styles.steps}>
      {items.map((s) => {
        const text =
          s.status === 'done' ? t('home.stepDone', { label: s.doneLabel }) : t('home.stepTodo', { n: s.n, label: s.label });
        const barColor = s.status === 'upcoming' ? tk.border : tk.primary;
        const textColor = s.status === 'current' ? tk.link : s.status === 'done' ? tk.text : tk.textMuted;
        return (
          <View
            key={s.n}
            style={styles.step}
            accessible
            accessibilityLabel={t('home.stepA11y', {
              n: s.n,
              label: s.status === 'done' ? s.doneLabel : s.label,
              status: t(`home.stepStatus.${s.status}`),
            })}
          >
            <View
              style={[styles.stepBar, { backgroundColor: barColor }, s.status === 'current' && styles.stepBarCurrent]}
            />
            <Text style={[styles.stepText, { color: textColor }, s.status === 'current' && styles.stepTextCurrent]} numberOfLines={1}>
              {text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Card shell ───────────────────────────────────────────────────────────────

function Card({ children }: { children: ReactNode }) {
  const tk = useTheme();
  return <View style={[styles.card, { backgroundColor: tk.surfaceRaised, borderColor: tk.border }]}>{children}</View>;
}

function Eyebrow({ children, right }: { children: string; right?: ReactNode }) {
  const tk = useTheme();
  return (
    <View style={styles.eyebrowRow}>
      <Text style={[styles.cardEyebrow, { color: tk.textMuted }]}>{children}</Text>
      {right}
    </View>
  );
}

function BigNumber({ value }: { value: string }) {
  const tk = useTheme();
  return (
    <Text style={[styles.bigNumber, { color: tk.text }]} adjustsFontSizeToFit numberOfLines={1}>
      {value}
    </Text>
  );
}

// ── 01 Before service ────────────────────────────────────────────────────────

export interface BeforeServiceCardProps {
  delivery: DeliveryCardData;
  /** Shown only when known ("Expected around 07:30"). */
  expectedAt?: string | null;
  onReceive: () => void;
  onSkip: () => void;
}

/** YESTERDAY'S REQUISITION: status, total, items and the Receive delivery button. */
export function BeforeServiceCard({ delivery, expectedAt, onReceive, onSkip }: BeforeServiceCardProps) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const more = delivery.itemCount - delivery.items.length;
  const sub = [
    t('home.items', { count: delivery.itemCount }),
    delivery.orderNo ? t('home.orderNo', { no: delivery.orderNo }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const delivered = delivery.status === 'delivered';
  return (
    <Card>
      <Eyebrow
        right={
          <View style={[styles.pill, { backgroundColor: delivered ? tk.primaryTint : tk.warningTint }]}>
            <Text style={[styles.pillText, { color: delivered ? tk.onPrimaryTint : tk.warningText }]}>
              {t(`home.orderStatus.${delivery.status}`, { defaultValue: '' })}
            </Text>
          </View>
        }
      >
        {t('home.yesterdaysRequisition')}
      </Eyebrow>
      <View>
        <BigNumber value={delivery.totals.length ? formatMoneyList(delivery.totals, i18n.language) : '—'} />
        <Text style={[styles.sub, { color: tk.textMuted }]}>{sub}</Text>
      </View>
      {delivery.items.length > 0 ? (
        <View style={[styles.itemsBox, { backgroundColor: tk.surfaceSunken }]}>
          {delivery.items.map((it, i) => (
            <View
              key={`${it.name}-${i}`}
              style={[styles.itemRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tk.border }]}
            >
              <Text style={[styles.itemName, { color: tk.text }]} numberOfLines={1}>
                {it.name}
              </Text>
              <Text style={[styles.itemQty, { color: tk.text }]}>
                {formatQuantity(it.quantity, i18n.language)} {it.unit}
              </Text>
            </View>
          ))}
          {more > 0 ? (
            <Text style={[styles.more, { color: tk.textMuted, borderTopColor: tk.border }]}>
              {t('home.moreItems', { count: more })}
            </Text>
          ) : null}
        </View>
      ) : null}
      {expectedAt ? <Text style={[styles.sub, { color: tk.textMuted }]}>{expectedAt}</Text> : null}
      <AppButton label={t('home.receiveDelivery')} onPress={onReceive} size="lg" icon={Truck} />
      {!delivered ? (
        <AppPressable onPress={onSkip} accessibilityRole="button" accessibilityLabel={t('home.skipDelivery')} style={styles.link}>
          <Text style={[styles.linkText, { color: tk.link }]}>{t('home.skipDelivery')}</Text>
        </AppPressable>
      ) : null}
    </Card>
  );
}

/** 01 with no requisition yesterday: "No delivery expected" and a way to Receive. */
export function NoDeliveryCard({ onAddElsewhere }: { onAddElsewhere: () => void }) {
  const { t } = useTranslation();
  const tk = useTheme();
  return (
    <Card>
      <Text style={[styles.cardTitle, { color: tk.text }]}>{t('home.noDeliveryTitle')}</Text>
      <Text style={[styles.sub, { color: tk.textMuted }]}>{t('home.noDeliveryBody')}</Text>
      <AppButton label={t('home.addBoughtElsewhere')} onPress={onAddElsewhere} variant="secondary" size="lg" icon={Truck} />
    </Card>
  );
}

// ── 02 Service ───────────────────────────────────────────────────────────────

function Counter({ value, label, tone }: { value: number; label: string; tone: 'new' | 'plain' | 'danger' }) {
  const tk = useTheme();
  const bg = tone === 'new' ? tk.primaryTint : tk.surfaceSunken;
  const color = tone === 'new' ? tk.link : tone === 'danger' ? tk.danger : tk.text;
  return (
    <View style={[styles.counter, { backgroundColor: bg }]} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.counterValue, { color }]}>{value}</Text>
      <Text style={[styles.counterLabel, { color: tk.textMuted }]}>{label}</Text>
    </View>
  );
}

export interface ServiceCardProps {
  counts: CommandCounts;
  /** The newest command with its stock check (Phase 9 stage 4). */
  newest?: ReactNode;
  onOpenCommands: () => void;
}

/** COMMANDS: the 2×2 counters, the newest command and Open commands. */
export function ServiceCard({ counts, newest, onOpenCommands }: ServiceCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <Eyebrow>{t('home.commands')}</Eyebrow>
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <Counter value={counts.new} label={t('home.counters.new')} tone="new" />
          <Counter value={counts.cooking} label={t('home.counters.cooking')} tone="plain" />
        </View>
        <View style={styles.gridRow}>
          <Counter value={counts.served} label={t('home.counters.served')} tone="plain" />
          <Counter value={counts.cancelled} label={t('home.counters.cancelled')} tone="danger" />
        </View>
      </View>
      {newest}
      <AppButton
        label={counts.new > 0 ? t('home.openCommandsNew', { count: counts.new }) : t('home.openCommands')}
        onPress={onOpenCommands}
        size="lg"
      />
    </Card>
  );
}

// ── 03 End of day ────────────────────────────────────────────────────────────

export interface EndOfDayCardProps {
  served: number;
  cancelled: number;
  requisition: RequisitionSummary;
  onReview: () => void;
}

/** TODAY IN SHORT and TOMORROW'S REQUISITION with Review requisition. */
export function EndOfDayCard({ served, cancelled, requisition, onReview }: EndOfDayCardProps) {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  return (
    <Card>
      <Eyebrow>{t('home.todayInShort')}</Eyebrow>
      <View style={styles.gridRow}>
        <Counter value={served} label={t('home.counters.served')} tone="plain" />
        <Counter value={cancelled} label={t('home.counters.cancelled')} tone="plain" />
      </View>
      <View style={[styles.divider, { backgroundColor: tk.border }]} />
      <Eyebrow>{t('home.tomorrowsRequisition')}</Eyebrow>
      <View>
        <BigNumber value={requisition.totals.length ? formatMoneyList(requisition.totals, i18n.language) : '—'} />
        <Text style={[styles.sub, { color: tk.textMuted }]}>
          {requisition.itemCount > 0
            ? t('home.itemsSuggested', { count: requisition.itemCount })
            : t('home.nothingSuggested')}
        </Text>
      </View>
      <AppButton label={t('home.reviewRequisition')} onPress={onReview} size="lg" />
    </Card>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, letterSpacing: 1.2, textTransform: 'uppercase' },
  kitchenName: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButton: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  steps: { flexDirection: 'row', gap: spacing.sm },
  step: { flex: 1, gap: 6 },
  stepBar: { height: 4, borderRadius: 2 },
  stepBarCurrent: { opacity: 0.55 },
  stepText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  stepTextCurrent: { fontWeight: fontWeight.bold },
  card: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg - 4, gap: spacing.md },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardEyebrow: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 1.2, textTransform: 'uppercase', flexShrink: 1 },
  cardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  pill: { paddingHorizontal: spacing.sm + 4, paddingVertical: 6, borderRadius: radius.full },
  pillText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  bigNumber: { fontSize: fontSize['4xl'], fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.base },
  itemsBox: { borderRadius: radius.lg, paddingHorizontal: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: MIN_TOUCH_SIZE, gap: spacing.sm },
  itemName: { fontSize: fontSize.base, flex: 1 },
  itemQty: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  more: { fontSize: fontSize.base, paddingVertical: spacing.sm + 2, borderTopWidth: StyleSheet.hairlineWidth },
  link: { minHeight: MIN_TOUCH_SIZE, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  grid: { gap: spacing.sm + 4 },
  gridRow: { flexDirection: 'row', gap: spacing.sm + 4 },
  counter: { flex: 1, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  counterValue: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold },
  counterLabel: { fontSize: fontSize.base },
  divider: { height: StyleSheet.hairlineWidth },
});
