/**
 * Menu Item Card - redesigned per original requirements:
 * - Category badge prominent
 * - Price large and visible
 * - Ingredient chips from recipe
 * - Orders today and can-make stats
 * - Edit and availability actions
 */
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChefHat, ClipboardList, MoreHorizontal, Pencil, ShoppingBasket, TrendingUp, UtensilsCrossed } from 'lucide-react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { listRecipeLines, type MenuItemDto } from '@/api/menus-api';
import { useKitchenStore } from '@/store/kitchen-store';
import { formatMoney } from '@/lib/money';
import { fontSize, fontWeight, radius, spacing } from '@/lib/theme';
import { useTheme } from '@/providers/ThemeProvider';

export interface MenuItemCardProps {
  item: MenuItemDto;
  dishToday?: { ordered_today: number; can_make: number | null };
  onOpen: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onMore: () => void;
}

export function MenuItemCard({
  item,
  dishToday,
  onOpen,
  onToggle,
  onEdit,
  onMore,
}: MenuItemCardProps) {
  const { t, i18n } = useTranslation();
  const tokens = useTheme();
  const kitchenId = useKitchenStore((s) => s.activeKitchen?.id ?? '');

  // Fetch recipe lines to show ingredient chips
  const { data: recipeLines = [] } = useQuery({
    queryKey: ['recipeLines', item.id],
    queryFn: () => listRecipeLines(kitchenId, item.id),
    enabled: Boolean(kitchenId && item.id),
    staleTime: 5 * 60_000, // 5 minutes
  });

  const orderedToday = dishToday?.ordered_today ?? 0;
  const canMake = dishToday?.can_make;

  return (
    <View style={[styles.card, { backgroundColor: tokens.surfaceRaised, borderColor: tokens.border }]}>
      {/* Header: Category badge + Price */}
      <View style={styles.cardHeader}>
        {item.category ? (
          <StatusBadge
            label={t(`menu.categories.${item.category}`)}
            variant="neutral"
          />
        ) : <View style={styles.spacer} />}
        <View style={styles.spacer} />
        <Text style={[styles.cardPrice, { color: tokens.primary }]}>
          {formatMoney(item.selling_price, item.selling_price_currency ?? '', i18n.language)}
        </Text>
      </View>

      {/* Title + Status */}
      <AppPressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={t('menu.openItem', { name: item.name })}
        style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
      >
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: item.is_active ? tokens.text : tokens.textMuted }]} numberOfLines={2}>
            {item.name}
          </Text>
          {!item.is_active ? (
            <StatusBadge label={t('menu.off')} variant="neutral" />
          ) : null}
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={[styles.description, { color: tokens.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Ingredient chips */}
        {recipeLines.length > 0 ? (
          <View style={styles.ingredientChips}>
            {recipeLines.slice(0, 4).map((line) => (
              <View key={line.id} style={[styles.chip, { backgroundColor: tokens.primaryTint }]}>
                <ShoppingBasket size={12} color={tokens.onPrimaryTint} strokeWidth={2} />
                <Text style={[styles.chipText, { color: tokens.onPrimaryTint }]}>
                  {line.unit}
                </Text>
              </View>
            ))}
            {recipeLines.length > 4 ? (
              <Text style={[styles.moreChips, { color: tokens.textMuted }]}>
                +{recipeLines.length - 4}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Stats row: orders today, can make */}
        {(orderedToday > 0 || canMake !== null) ? (
          <View style={styles.statsRow}>
            {orderedToday > 0 ? (
              <View style={styles.stat}>
                <TrendingUp size={14} color={tokens.textMuted} strokeWidth={2} />
                <Text style={[styles.statText, { color: tokens.textMuted }]}>
                  {t('menu.orderedToday', { count: orderedToday })}
                </Text>
              </View>
            ) : null}

            {canMake !== null ? (
              <View style={[styles.stat, canMake === 0 && { backgroundColor: tokens.dangerTint, paddingHorizontal: spacing.xs, borderRadius: radius.sm }]}>
                <UtensilsCrossed size={14} color={canMake === 0 ? tokens.danger : tokens.textMuted} strokeWidth={2} />
                <Text style={[styles.statText, { color: canMake === 0 ? tokens.danger : tokens.textMuted }]}>
                  {t('menu.canMake', { count: canMake })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </AppPressable>

      {/* Actions: Edit, Recipe, Availability Toggle, More */}
      <View style={[styles.cardActions, { borderTopColor: tokens.border }]}>
        <AppPressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={t('menuItem.editItemLabel', { name: item.name })}
          style={({ pressed }) => [styles.action, { backgroundColor: tokens.surfaceSunken }, pressed && styles.pressed]}
        >
          <Pencil size={16} color={tokens.text} />
          <Text style={[styles.actionText, { color: tokens.text }]}>{t('menu.edit')}</Text>
        </AppPressable>

        <AppPressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={t('menu.recipeOf', { name: item.name })}
          style={({ pressed }) => [styles.action, { backgroundColor: tokens.primaryTint }, pressed && styles.pressed]}
        >
          <ClipboardList size={16} color={tokens.onPrimaryTint} />
          <Text style={[styles.actionText, { color: tokens.onPrimaryTint }]}>{t('menu.recipe')}</Text>
        </AppPressable>

        {/* Availability toggle */}
        <View style={[styles.toggleAction, { backgroundColor: tokens.surfaceSunken }]}>
          <Text style={[styles.toggleText, { color: tokens.text }]} numberOfLines={1}>
            {item.is_active ? t('menu.available') : t('menu.unavailable')}
          </Text>
          <Switch
            value={item.is_active}
            onValueChange={onToggle}
            trackColor={{ true: tokens.primary, false: tokens.border }}
            thumbColor={tokens.surfaceRaised}
            ios_backgroundColor={tokens.border}
            accessibilityLabel={t('menuItem.availableLabel', { name: item.name })}
          />
        </View>

        <AppPressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel={t('menu.moreOptions', { name: item.name })}
          style={({ pressed }) => [styles.more, { backgroundColor: tokens.surfaceSunken }, pressed && styles.pressed]}
        >
          <MoreHorizontal size={18} color={tokens.text} />
        </AppPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  spacer: { flex: 1 },
  cardPrice: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  cardMain: {
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    flex: 1,
  },
  description: {
    fontSize: fontSize.base,
  },
  ingredientChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  moreChips: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: fontSize.sm,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  toggleAction: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  more: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
});
