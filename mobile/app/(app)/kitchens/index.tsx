import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Plus, UtensilsCrossed, MapPin } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { ListRow } from '@/components/ui/ListRow';
import { useKitchenStore } from '@/store/kitchen-store';
import { useKitchens } from '@/features/kitchens/useKitchens';
import type { Kitchen } from '@/domain/models/kitchen';

function ActiveBadge({ label }: { label: string }) {
  return (
    <View style={{ alignSelf: 'center', backgroundColor: colors.brand[500], borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: colors.white, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

export default function KitchensScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const kitchens = useKitchenStore((s) => s.kitchens);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const setActiveKitchen = useKitchenStore((s) => s.setActiveKitchen);
  const { refetch } = useKitchens();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const activeKitchens = kitchens.filter((k) => !k.isArchived);
  const archivedKitchens = kitchens.filter((k) => k.isArchived);

  const handleSelect = (kitchen: Kitchen) => {
    setActiveKitchen(kitchen);
  };

  const handleEdit = (kitchen: Kitchen) => {
    router.push(`/(app)/kitchens/${kitchen.id}`);
  };

  return (
    <View className="flex-1 bg-surface-50 dark:bg-surface-900" style={{ paddingTop: insets.top }}>
      {/* Header — #18: ChevronLeft back button */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-surface-200 dark:border-surface-800">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={24} color={colors.surface[500]} strokeWidth={2} />
          </Pressable>
          <Text className="text-surface-900 dark:text-white text-lg font-bold">{t('kitchens.yourKitchens')}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/kitchens/create')}
          accessibilityRole="button"
          accessibilityLabel={t('kitchens.addKitchenLabel')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.brand[500] }}
        >
          <Plus size={20} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />
        }
      >
        {activeKitchens.length > 0 && (
          <View className="bg-white dark:bg-surface-800" style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.surface[200] }}>
            {activeKitchens.map((kitchen, index) => {
              const isActive = kitchen.id === activeKitchen?.id;
              // cuisineType holds the city (sent to the backend as `location`)
              const hasLocation = Boolean(kitchen.cuisineType);
              const subtitle = [kitchen.cuisineType, kitchen.address].filter(Boolean).join(' · ') || undefined;
              return (
                <ListRow
                  key={kitchen.id}
                  icon={<UtensilsCrossed size={18} color={isActive ? colors.white : colors.brand[500]} strokeWidth={1.75} />}
                  iconBg={isActive ? colors.brand[500] : colors.brand[50]}
                  title={kitchen.name}
                  titleAccessory={isActive ? <ActiveBadge label={t('kitchens.active')} /> : undefined}
                  subtitle={subtitle}
                  trailing={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {!hasLocation && (
                        <Pressable
                          onPress={() => router.push(`/(app)/kitchens/${kitchen.id}`)}
                          accessibilityRole="button"
                          accessibilityLabel={t('kitchens.addLocationFor', { name: kitchen.name })}
                          hitSlop={8}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.warning + '20' }}
                        >
                          <MapPin size={12} color={colors.warning} strokeWidth={2} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>{t('kitchens.addLocation')}</Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleEdit(kitchen)}
                        accessibilityRole="button"
                        accessibilityLabel={t('kitchens.editKitchenLabel', { name: kitchen.name })}
                        hitSlop={8}
                        style={{ width: 32, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}
                      >
                        <ChevronRight size={16} color={colors.surface[400]} strokeWidth={1.75} />
                      </Pressable>
                    </View>
                  }
                  onPress={() => handleSelect(kitchen)}
                  accessibilityLabel={`${isActive ? 'Active kitchen' : 'Select kitchen'}: ${kitchen.name}`}
                  separator={index < activeKitchens.length - 1}
                />
              );
            })}
          </View>
        )}

        {activeKitchens.length === 0 && (
          <View className="items-center py-12 gap-3">
            <View className="w-16 h-16 rounded-full bg-brand-500/10 items-center justify-center">
              <UtensilsCrossed size={28} color={colors.brand[500]} strokeWidth={1.5} />
            </View>
            <Text className="text-surface-900 dark:text-white font-semibold text-base">{t('kitchens.noKitchensTitle')}</Text>
            <Text className="text-surface-500 text-sm text-center">
              {t('kitchens.noKitchensDesc')}
            </Text>
            <Pressable
              onPress={() => router.push('/(app)/kitchens/create')}
              accessibilityRole="button"
              accessibilityLabel={t('kitchens.createKitchen')}
              style={{ backgroundColor: colors.brand[500], borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
            >
              <Text style={{ color: colors.white, fontWeight: '600' }}>{t('kitchens.createKitchen')}</Text>
            </Pressable>
          </View>
        )}

        {archivedKitchens.length > 0 && (
          <>
            <Text className="text-surface-600 dark:text-surface-400 text-xs font-semibold uppercase tracking-wider mt-4 mb-1">
              {t('kitchens.archived')}
            </Text>
            <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.surface[200] }}>
              {archivedKitchens.map((kitchen, index) => (
                <ListRow
                  key={kitchen.id}
                  icon={<UtensilsCrossed size={18} color={colors.surface[400]} strokeWidth={1.75} />}
                  iconBg={colors.surface[100]}
                  title={kitchen.name}
                  subtitle={t('kitchens.archived')}
                  trailing={<ChevronRight size={16} color={colors.surface[400]} strokeWidth={1.75} />}
                  onPress={() => handleEdit(kitchen)}
                  accessibilityLabel={t('kitchens.editArchivedLabel', { name: kitchen.name })}
                  separator={index < archivedKitchens.length - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
