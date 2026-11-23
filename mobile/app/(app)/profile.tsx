import { useState } from 'react';
import { View, Text, ScrollView, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings, Pencil, LogOut, UtensilsCrossed, ChevronRight, ChevronLeft, Clock, Bot } from 'lucide-react-native';
import { FEATURES } from '@/constants/features';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { useKitchens } from '@/features/kitchens/useKitchens';
import { getMe, updateProfile } from '@/api/auth-api';
import { Avatar } from '@/components/ui/Avatar';
import { ListRow } from '@/components/ui/ListRow';
import { AppPressable } from '@/components/ui/AppPressable';
import { AppTextField } from '@/components/ui/AppTextField';
import { FormScreen } from '@/components/ui/FormScreen';
import { formatMonthYear } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing, fontSize, fontWeight, radius } from '@/lib/theme';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const tk = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const chef = useSessionStore((s) => s.chef);
  const updateChef = useSessionStore((s) => s.updateChef);
  const signOut = useSessionStore((s) => s.signOut);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const storeKitchens = useKitchenStore((s) => s.kitchens);
  const { refetch: refetchKitchens } = useKitchens();
  const me = useQuery({ queryKey: ['me', chef?.id ?? ''], queryFn: getMe, enabled: Boolean(chef?.id), staleTime: 10 * 60_000 });

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [profile] = await Promise.all([me.refetch(), refetchKitchens()]);
      if (profile.data) updateChef({ id: profile.data.id, phoneNumber: profile.data.phone_number, name: profile.data.name });
    } finally {
      setRefreshing(false);
    }
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(t('profile.permissionNeeded'), t('profile.permissionNeededDesc'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) setAvatarUri(asset.uri);
  };

  const startEditing = () => {
    setNameInput(chef?.name ?? '');
    setNameTouched(false);
    setSaveError(null);
    setEditing(true);
  };

  const nameError = nameInput.trim().length < 2 ? t('profile.nameRequiredDesc') : null;

  const saveProfile = async () => {
    setNameTouched(true);
    if (nameError) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateProfile({ name: nameInput.trim() });
      updateChef({ id: updated.id, phoneNumber: updated.phone_number, name: updated.name });
      void qc.invalidateQueries({ queryKey: ['me'] });
      setEditing(false);
    } catch {
      setSaveError(t('profile.saveErrorDesc'));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmMsg'), [
      { text: t('profile.signOutConfirmCancel'), style: 'cancel' },
      {
        text: t('profile.signOutConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const memberSince = me.data?.created_at ? formatMonthYear(me.data.created_at, i18n.language) : null;
  const activeKitchens = storeKitchens.filter((k) => !k.isArchived);
  const card = { backgroundColor: tk.surfaceRaised, borderRadius: radius.xl, borderWidth: 1, borderColor: tk.border, overflow: 'hidden' as const };
  const sectionLabel = {
    color: tk.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: -4,
  };

  const header = (
    <View style={{ paddingHorizontal: spacing.md, minHeight: 52, borderBottomWidth: 1, borderBottomColor: tk.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {!editing ? (
        <AppPressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm }}
        >
          <ChevronLeft size={24} color={tk.text} />
        </AppPressable>
      ) : null}
      <Text style={{ color: tk.text, fontSize: fontSize.lg, fontWeight: '700', flex: 1 }} accessibilityRole="header">
        {editing ? t('profile.editProfile') : t('profile.title')}
      </Text>
      {editing ? (
        <AppPressable onPress={() => setEditing(false)} accessibilityRole="button" accessibilityLabel={t('profile.cancelEditing')} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: tk.link, fontWeight: '600' }}>{t('common.cancel')}</Text>
        </AppPressable>
      ) : (
        <AppPressable
          onPress={() => router.push('/(app)/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('profile.openSettings')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Settings size={20} color={tk.textMuted} strokeWidth={2} />
        </AppPressable>
      )}
    </View>
  );

  if (editing) {
    return (
      <View style={{ flex: 1, backgroundColor: tk.surface, paddingTop: insets.top }}>
        {header}
        <FormScreen
          actions={[
            { kind: 'save', label: t('profile.saveProfile'), onPress: () => void saveProfile(), loading: saving, disabled: Boolean(nameError) },
          ]}
        >
          <View style={{ alignItems: 'center' }}>
            <Avatar uri={avatarUri} name={nameInput || chef?.name} size={88} onPress={pickAvatar} showCameraBadge />
          </View>
          <AppTextField
            label={t('profile.displayNameLabel')}
            placeholder={t('profile.displayNamePlaceholder')}
            value={nameInput}
            onChangeText={(v) => { setNameInput(v); setNameTouched(true); }}
            error={nameTouched && nameError ? nameError : undefined}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            inputProps={{ onSubmitEditing: () => void saveProfile() }}
          />
          {saveError ? (
            <Text style={{ color: tk.danger, fontSize: fontSize.sm }} accessibilityRole="alert">{saveError}</Text>
          ) : null}
        </FormScreen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tk.surface, paddingTop: insets.top }}>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tk.primary} colors={[tk.primary]} />}
      >
        <View style={[card, { padding: spacing.lg, alignItems: 'center', gap: spacing.md }]}>
          <Avatar uri={avatarUri} name={chef?.name} size={88} onPress={pickAvatar} showCameraBadge />
          <View style={{ alignItems: 'center', gap: 4, width: '100%' }}>
            <AppPressable
              onPress={startEditing}
              accessibilityRole="button"
              accessibilityLabel={t('profile.editProfile')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}
            >
              <Text style={{ color: tk.text, fontSize: fontSize.xl, fontWeight: '700' }}>{chef?.name ?? t('profile.setYourName')}</Text>
              <Pencil size={16} color={tk.textMuted} strokeWidth={2} />
            </AppPressable>
            <Text style={{ color: tk.textMuted, fontSize: fontSize.sm }}>{chef?.phoneNumber ?? '—'}</Text>
            {memberSince ? (
              <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>{t('profile.memberSince', { date: memberSince })}</Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: tk.border, paddingTop: spacing.md, width: '100%' }}>
            {[
              { key: 'kitchens', label: t('profile.statsKitchens'), value: String(activeKitchens.length) },
              { key: 'active', label: t('profile.statsActive'), value: activeKitchen ? '1' : '0' },
            ].map((stat, i, arr) => (
              <View key={stat.key} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < arr.length - 1 ? 1 : 0, borderRightColor: tk.border }}>
                <Text style={{ color: tk.link, fontSize: 22, fontWeight: '800' }}>{stat.value}</Text>
                <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, marginTop: 2 }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={sectionLabel}>{t('profile.sectionKitchen')}</Text>
        <View style={card}>
          <ListRow
            icon={<UtensilsCrossed size={20} color={tk.link} strokeWidth={1.75} />}
            iconBg={tk.primaryTint}
            title={activeKitchen?.name ?? t('profile.noKitchen')}
            subtitle={
              [activeKitchen?.cuisineType, activeKitchen?.address].filter(Boolean).join(' · ') ||
              (activeKitchen ? t('profile.kitchenTapHint') : t('profile.kitchenSetupHint'))
            }
            onPress={() => router.push(activeKitchen ? (`/(app)/kitchens/${activeKitchen.id}` as never) : ('/(app)/kitchens/create' as never))}
            accessibilityLabel={t('profile.kitchenAccessLabel')}
          />
          <ListRow
            icon={<UtensilsCrossed size={18} color={tk.textMuted} strokeWidth={1.75} />}
            iconBg={tk.surfaceSunken}
            title={t('profile.manageKitchens')}
            trailing={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ minWidth: 24, alignItems: 'center', backgroundColor: tk.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: tk.onPrimary, fontSize: fontSize.xs, fontWeight: '700' }}>{activeKitchens.length}</Text>
                </View>
                <ChevronRight size={16} color={tk.textMuted} />
              </View>
            }
            onPress={() => router.push('/(app)/kitchens')}
            accessibilityLabel={t('profile.manageKitchensLabel', { count: activeKitchens.length })}
            separator={false}
          />
        </View>

        {activeKitchen ? (
          <View style={card}>
            <ListRow
              icon={<Clock size={18} color={tk.link} strokeWidth={2} />}
              iconBg={tk.primaryTint}
              title={t('profile.serviceHours')}
              subtitle={t('profile.serviceHoursValue', { open: activeKitchen.openingTime, close: activeKitchen.closingTime })}
              onPress={() => router.push(`/(app)/kitchens/${activeKitchen.id}` as never)}
              separator={FEATURES.assistant}
            />
            {FEATURES.assistant ? (
              <ListRow
                icon={<Bot size={18} color={tk.link} strokeWidth={2} />}
                iconBg={tk.primaryTint}
                title={t('profile.assistant')}
                onPress={() => router.push('/(app)/agent')}
                separator={false}
              />
            ) : null}
          </View>
        ) : null}

        <Text style={sectionLabel}>{t('profile.sectionAccount')}</Text>
        <View style={card}>
          <ListRow
            icon={<Settings size={18} color={tk.textMuted} strokeWidth={2} />}
            iconBg={tk.surfaceSunken}
            title={t('settings.title')}
            onPress={() => router.push('/(app)/settings')}
          />
          <ListRow
            icon={<LogOut size={18} color={tk.danger} strokeWidth={2} />}
            iconBg={tk.dangerTint}
            title={t('profile.signOut')}
            onPress={handleSignOut}
            destructive
            separator={false}
          />
        </View>

        <View style={{ alignItems: 'center', paddingBottom: spacing.sm, gap: 2 }}>
          <Text style={{ color: tk.textMuted, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('common.appName')}
          </Text>
          <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t('profile.footerTagline')}</Text>
          <Text style={{ color: tk.textMuted, fontSize: fontSize.xs }}>{t('profile.footerCopyright')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
