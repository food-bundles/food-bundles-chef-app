import { FEATURES } from '@/constants/features';
import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChefHat } from 'lucide-react-native';
import { useKitchenStore } from '@/store/kitchen-store';
import { useSessionStore } from '@/store/session-store';
import { useHome } from '@/features/home/useHome';
import {
  BeforeServiceCard,
  EndOfDayCard,
  HomeHeader,
  NoDeliveryCard,
  ProgressSteps,
  ServiceCard,
} from '@/features/home/HomeViews';
import { TimeSensitiveTabs } from '@/features/home/TimeSensitiveTabs';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CommandSummaryCard } from '@/features/commands/CommandCard';
import { FloatingAIButton } from '@/components/ui/FloatingAIButton';
import { formatDayShort } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, spacing } from '@/lib/theme';
import type { TimeTab } from '@/domain/rules/time-sensitive-tabs';

/**
 * Home: one job at a time (spec screens 01–03). The state is calculated from the time, the
 * kitchen's service hours and today's delivery; nothing else is shown here.
 */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const kitchen = useKitchenStore((s) => s.activeKitchen);
  const chef = useSessionStore((s) => s.chef);
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

  const handleTabPress = (tab: TimeTab) => {
    if (tab === 'receive') {
      router.push('/(app)/(tabs)/receive');
    } else if (tab === 'commands') {
      router.push('/(app)/(tabs)/commands');
    } else if (tab === 'requisition') {
      router.push('/(app)/(tabs)/requisition');
    }
  };

  let card: ReactNode;
  if (home.state === 'before_service') {
    card = home.delivery ? (
      <BeforeServiceCard
        delivery={home.delivery}
        onReceive={() => router.push('/(app)/(tabs)/receive')}
        onSkip={home.skipDelivery}
      />
    ) : (
      <NoDeliveryCard onAddElsewhere={() => router.push('/(app)/(tabs)/receive')} />
    );
  } else if (home.state === 'service') {
    card = (
      <ServiceCard
        counts={home.commandCounts}
        newest={
          home.newestCommand ? <CommandSummaryCard command={home.newestCommand} /> : undefined
        }
        onOpenCommands={() => router.push('/(app)/(tabs)/commands')}
        onOpenStatus={(status) =>
          router.push({ pathname: '/(app)/(tabs)/commands', params: { filterStatus: status } })
        }
      />
    );
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
        chefName={chef?.name ?? null}
        chefPhotoUri={null}
        onMenu={() => router.push('/(app)/menu')}
        onProfile={() => router.push('/(app)/profile')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={tk.primary}
            colors={[tk.primary]}
          />
        }
      >
        <TimeSensitiveTabs
          openingTime={home.openingTime}
          closingTime={home.closingTime}
          currentState={home.state}
          onTabPress={handleTabPress}
        />
        <Text style={[styles.dateLine, { color: tk.textMuted }]}>{dateLine}</Text>
        {home.error ? (
          <Text style={[styles.error, { color: tk.danger }]}>{t('home.loadError')}</Text>
        ) : null}
        {card}
      </ScrollView>
      {FEATURES.assistant ? <FloatingAIButton /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing['2xl'] },
  dateLine: { fontSize: fontSize.base },
  error: { fontSize: fontSize.sm },
});
