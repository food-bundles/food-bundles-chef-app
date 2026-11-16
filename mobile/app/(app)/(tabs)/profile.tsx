import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Settings,
  Pencil,
  LogOut,
  UtensilsCrossed,
  CheckCircle,
  Star,
  Truck,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { useKitchens } from '@/features/kitchens/useKitchens';
import { getMe, updateProfile } from '@/api/auth-api';
import { Avatar } from '@/components/ui/Avatar';
import { ListRow } from '@/components/ui/ListRow';
import { colors, spacing, fontSize, radius } from '@/lib/theme';
import { useColorScheme } from 'react-native';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const chef = useSessionStore((s) => s.chef);
  const updateChef = useSessionStore((s) => s.updateChef);
  const signOut = useSessionStore((s) => s.signOut);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const storeKitchens = useKitchenStore((s) => s.kitchens);
  const { refetch: refetchKitchens } = useKitchens();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(chef?.name ?? '');
  const [bioInput, setBioInput] = useState('');
  const [experienceInput, setExperienceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const bg = isDark ? colors.surface[950] : colors.surface[50];
  const cardBg = isDark ? colors.surface[800] : colors.white;
  const textPrimary = isDark ? colors.white : colors.surface[900];
  const textSecondary = isDark ? colors.surface[400] : colors.surface[600];
  const borderColor = isDark ? 'transparent' : colors.surface[200];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [profile] = await Promise.all([getMe(), refetchKitchens()]);
      updateChef({ id: profile.id, phoneNumber: profile.phone_number, name: profile.name });
    } catch {}
    setRefreshing(false);
  }, []);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to continue.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile({ name: trimmedName });
      updateChef({ id: updated.id, phoneNumber: updated.phone_number, name: updated.name });
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  // Avatar component derives initials from name safely; phone number never shown as initials

  const memberSince = chef?.id
    ? new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const activeKitchens = storeKitchens.filter((k) => !k.isArchived);

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? colors.surface[800] : colors.surface[200],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: textPrimary, fontSize: fontSize.lg, fontWeight: '700' }}>Profile</Text>
        <Pressable
          onPress={() => router.push('/(app)/settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Settings size={20} color={textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />
          }
        >
          {/* Avatar + name hero */}
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: radius.xl,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor,
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            {/* Avatar — initials derived from name; never shows phone digits */}
            <Avatar
              uri={avatarUri}
              name={chef?.name}
              size={88}
              onPress={pickAvatar}
              showCameraBadge
            />

            {/* Name / edit */}
            {editing ? (
              <View style={{ width: '100%', gap: spacing.sm }}>
                {/* Close editing */}
                <Pressable
                  onPress={() => { setEditing(false); setNameInput(chef?.name ?? ''); }}
                  style={{ position: 'absolute', top: -48, right: 0, zIndex: 1, width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? colors.surface[700] : colors.surface[200], alignItems: 'center', justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel editing"
                >
                  <X size={16} color={textSecondary} strokeWidth={2} />
                </Pressable>

                <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Display Name
                </Text>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Your full name"
                  placeholderTextColor={colors.surface[500]}
                  style={{
                    backgroundColor: isDark ? colors.surface[700] : colors.surface[100],
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    color: textPrimary,
                    fontSize: fontSize.base,
                    borderWidth: 1,
                    borderColor: isDark ? colors.surface[600] : colors.surface[200],
                  }}
                  autoFocus
                  returnKeyType="next"
                />

                <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 }}>
                  Bio (optional)
                </Text>
                <TextInput
                  value={bioInput}
                  onChangeText={setBioInput}
                  placeholder="Brief professional bio…"
                  placeholderTextColor={colors.surface[500]}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: isDark ? colors.surface[700] : colors.surface[100],
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    color: textPrimary,
                    fontSize: fontSize.sm,
                    minHeight: 70,
                    textAlignVertical: 'top',
                    borderWidth: 1,
                    borderColor: isDark ? colors.surface[600] : colors.surface[200],
                  }}
                />

                <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 }}>
                  Experience
                </Text>
                <TextInput
                  value={experienceInput}
                  onChangeText={setExperienceInput}
                  placeholder="e.g. 8 years · French & Rwandan cuisine"
                  placeholderTextColor={colors.surface[500]}
                  style={{
                    backgroundColor: isDark ? colors.surface[700] : colors.surface[100],
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    color: textPrimary,
                    fontSize: fontSize.sm,
                    borderWidth: 1,
                    borderColor: isDark ? colors.surface[600] : colors.surface[200],
                  }}
                  returnKeyType="done"
                  onSubmitEditing={saveProfile}
                />

                <Pressable
                  onPress={saveProfile}
                  disabled={saving}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.sm + 4,
                    borderRadius: radius.md,
                    backgroundColor: colors.brand[500],
                    alignItems: 'center',
                    opacity: saving || pressed ? 0.7 : 1,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 4,
                    shadowColor: colors.brand[500],
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  })}
                >
                  {saving
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <CheckCircle size={16} color={colors.white} strokeWidth={2.5} />
                  }
                  <Text style={{ color: colors.white, fontWeight: '700', fontSize: fontSize.base }}>Save Profile</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 4, width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: textPrimary, fontSize: fontSize.xl, fontWeight: '700' }}>
                    {chef?.name ?? 'Set your name'}
                  </Text>
                  <Pressable
                    onPress={() => { setEditing(true); setNameInput(chef?.name ?? ''); }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Pencil size={16} color={textSecondary} strokeWidth={2} />
                  </Pressable>
                </View>
                <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>
                  {chef?.phoneNumber ?? '—'}
                </Text>
                {experienceInput ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Star size={12} color={colors.brand[500]} strokeWidth={2} />
                    <Text style={{ color: colors.brand[500], fontSize: fontSize.xs, fontWeight: '600' }}>{experienceInput}</Text>
                  </View>
                ) : null}
                {bioInput ? (
                  <Text style={{ color: textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: 4, paddingHorizontal: 8, lineHeight: 18 }}>
                    {bioInput}
                  </Text>
                ) : (
                  memberSince && (
                    <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                      Member since {memberSince}
                    </Text>
                  )
                )}
              </View>
            )}

            {/* Stats row */}
            <View
              style={{
                flexDirection: 'row',
                borderTopWidth: 1,
                borderTopColor: isDark ? colors.surface[700] : colors.surface[100],
                paddingTop: spacing.md,
                width: '100%',
                gap: 0,
              }}
            >
              {[
                { label: 'Kitchens', value: String(activeKitchens.length) },
                { label: 'Active', value: activeKitchen ? '1' : '0' },
              ].map((stat, i, arr) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    borderRightWidth: i < arr.length - 1 ? 1 : 0,
                    borderRightColor: isDark ? colors.surface[700] : colors.surface[100],
                  }}
                >
                  <Text style={{ color: colors.brand[500], fontSize: 22, fontWeight: '800' }}>{stat.value}</Text>
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Kitchen section */}
          <Text
            style={{
              color: textSecondary,
              fontSize: fontSize.xs,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: -4,
            }}
          >
            Kitchen
          </Text>

          <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, borderWidth: 1, borderColor, overflow: 'hidden' }}>
            {/* Active kitchen card — ListRow (#5) */}
            <ListRow
              icon={<UtensilsCrossed size={20} color={activeKitchen ? colors.brand[500] : textSecondary} strokeWidth={1.75} />}
              iconBg={activeKitchen ? colors.brand[50] : (isDark ? colors.surface[700] : colors.surface[100])}
              title={activeKitchen?.name ?? 'No Kitchen Selected'}
              subtitle={
                activeKitchen?.cuisineType
                  ? `${activeKitchen.cuisineType}${activeKitchen.address ? ` · ${activeKitchen.address}` : ''}`
                  : activeKitchen?.address ?? (activeKitchen ? 'Tap to view details' : 'Set up your kitchen workspace')
              }
              onPress={() => activeKitchen && router.push(`/(app)/kitchens/${activeKitchen.id}` as never)}
              accessibilityLabel="View active kitchen details"
              separator
            />
            {/* Manage kitchens — ListRow with count badge (#5) */}
            <ListRow
              icon={<UtensilsCrossed size={18} color={colors.surface[500]} strokeWidth={1.75} />}
              title="Manage Kitchens"
              trailing={
                <View style={{ backgroundColor: colors.brand[50], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ color: colors.brand[500], fontSize: fontSize.xs, fontWeight: '600' }}>
                    {activeKitchens.length}
                  </Text>
                </View>
              }
              onPress={() => router.push('/(app)/kitchens')}
              accessibilityLabel={`Manage kitchens, ${activeKitchens.length} active`}
              separator={false}
            />
          </View>

          {/* Links — only non-tab destinations to avoid duplication with tab bar */}
          <Text
            style={{
              color: textSecondary,
              fontSize: fontSize.xs,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: -4,
            }}
          >
            Links
          </Text>

          {/* Links section — uses ListRow (#5) */}
          <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, borderWidth: 1, borderColor, overflow: 'hidden' }}>
            <ListRow
              icon={<Truck size={18} color={colors.brand[500]} strokeWidth={2} />}
              iconBg={colors.brand[50]}
              title="Delivery Receiving"
              subtitle="Log and track deliveries"
              onPress={() => router.push('/(app)/receiving' as never)}
              accessibilityLabel="Delivery Receiving"
            />
            <ListRow
              icon={<TrendingUp size={18} color={colors.brand[500]} strokeWidth={2} />}
              iconBg={colors.brand[50]}
              title="Sales & Reports"
              subtitle="Record daily sales"
              onPress={() => router.push('/(app)/sales/entry' as never)}
              accessibilityLabel="Sales and Reports"
              separator={false}
            />
          </View>

          {/* Account section */}
          <Text
            style={{
              color: textSecondary,
              fontSize: fontSize.xs,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: -4,
            }}
          >
            Account
          </Text>

          <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, borderWidth: 1, borderColor, overflow: 'hidden' }}>
            <ListRow
              icon={<Settings size={18} color={textSecondary} strokeWidth={2} />}
              title="Settings"
              onPress={() => router.push('/(app)/settings')}
              accessibilityLabel="Settings"
            />
            <ListRow
              icon={<LogOut size={18} color={colors.danger} strokeWidth={2} />}
              iconBg={colors.danger + '33'}
              title="Sign Out"
              onPress={handleSignOut}
              destructive
              separator={false}
              accessibilityLabel="Sign out"
            />
          </View>

          {/* Footer wordmark */}
          <View style={{ alignItems: 'center', paddingBottom: spacing.sm, gap: 2 }}>
            <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Food Bundles Chef
            </Text>
            <Text style={{ color: isDark ? colors.surface[500] : colors.surface[500], fontSize: fontSize.xs }}>
              Built for professional kitchen teams
            </Text>
            <Text style={{ color: isDark ? colors.surface[500] : colors.surface[500], fontSize: fontSize.xs }}>
              © Food Bundles
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
