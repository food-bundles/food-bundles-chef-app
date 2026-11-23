import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChefHat } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useHome } from '@/features/home/useHome';
import {
  BeforeServiceCard,
  EndOfDayCard,
  HomeHeader,
  NoDeliveryCard,
  ProgressSteps,
  ServiceCard,
} from '@/features/home/HomeViews';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatDayShort } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, spacing } from '@/lib/theme';

/**
 * Home: one job at a time (spec screens 01–03). The state is calculated from the time, the
 * kitchen's service hours and today's delivery; nothing else is shown here.
 */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const home = useHome();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await home.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!kitchen) {
    return (
      <View style={[styles.root, { backgroundColor: tk.surface, paddingTop: insets.top }]}>
        <EmptyState
          Icon={ChefHat}
          title={t('home.noKitchenTitle')}
          description={t('home.noKitchenBody')}
          actionLabel={t('home.addKitchen')}
          onAction={() => router.push('/(app)/kitchens/create')}
        />
      </View>
    );
  }

  const timeNote =
    home.state === 'end_of_day'
      ? t('home.closed')
      : home.beforeOpening
        ? t('home.opensAt', { time: home.openingTime })
        : t('home.openUntil', { time: home.closingTime });
  const dateLine = [formatDayShort(home.today, i18n.language), home.clock, timeNote].join(' · ');

  let card: ReactNode;
  if (home.state === 'before_service') {
    card = home.delivery ? (
      <BeforeServiceCard
        delivery={home.delivery}
        onReceive={() => router.push(`/(app)/receiving/${home.delivery?.orderId ?? ''}`)}
        onSkip={home.skipDelivery}
      />
    ) : (
      <NoDeliveryCard onAddElsewhere={() => router.push('/(app)/receiving/quick')} />
    );
  } else if (home.state === 'service') {
    card = <ServiceCard counts={home.commandCounts} onOpenCommands={() => router.push('/(app)/(tabs)/commands')} />;
  } else {
    card = (
      <EndOfDayCard
        served={home.commandCounts.served}
        cancelled={home.commandCounts.cancelled}
        requisition={home.requisition}
        onReview={() => router.push('/(app)/(tabs)/requisition')}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tk.surface, paddingTop: insets.top }]}>
      <HomeHeader
        kitchenName={kitchen.name}
        onMenu={() => router.push('/(app)/menu')}
        onProfile={() => router.push('/(app)/profile')}
        onSwitch={() => router.push('/(app)/kitchens')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tk.primary} colors={[tk.primary]} />
        }
      >
        <ProgressSteps steps={home.steps} />
        <Text style={[styles.dateLine, { color: tk.textMuted }]}>{dateLine}</Text>
        {home.error ? <Text style={[styles.error, { color: tk.danger }]}>{t('home.loadError')}</Text> : null}
        {card}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  dateLine: { fontSize: fontSize.base },
  error: { fontSize: fontSize.sm },
});
