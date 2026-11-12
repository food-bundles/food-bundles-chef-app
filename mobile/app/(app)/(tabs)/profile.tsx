import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Settings,
  Camera,
  Pencil,
  ChevronRight,
  LogOut,
  UtensilsCrossed,
  Package,
  Truck,
  User,
  CheckCircle,
} from 'lucide-react-native';
import { useSessionStore } from '@/store/session-store';
import { useKitchenStore } from '@/store/kitchen-store';
import { useKitchens } from '@/features/kitchens/useKitchens';
import { getMe, updateProfile } from '@/api/auth-api';
import { colors, spacing, fontSize, radius } from '@/lib/theme';
import { useColorScheme } from 'react-native';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const chef = useSessionStore((s) => s.chef);
  const updateChef = useSessionStore((s) => s.updateChef);
  const signOut = useSessionStore((s) => s.signOut);
  const activeKitchen = useKitchenStore((s) => s.activeKitchen);
  const { data: allKitchens = [], refetch: refetchKitchens } = useKitchens();

  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(chef?.name ?? '');
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

  const initials = chef?.name
    ? chef.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : chef?.phoneNumber?.slice(-2) ?? '?';

  const memberSince = chef?.id
    ? new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  const activeKitchens = allKitchens.filter((k) => !k.isArchived);

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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E8438" colors={['#0E8438']} />
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
            {/* Avatar */}
            <Pressable
              onPress={pickAvatar}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              style={{ position: 'relative' }}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 88, height: 88, borderRadius: 44 }}
                />
              ) : (
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: '#0E8438',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -1 }}>
                    {initials}
                  </Text>
                </View>
              )}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#0E8438',
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: cardBg,
                }}
              >
                <Camera size={12} color="#fff" strokeWidth={2.5} />
              </View>
            </Pressable>

            {/* Name / edit */}
            {editing ? (
              <View style={{ width: '100%', gap: spacing.sm }}>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Your name"
                  placeholderTextColor={colors.surface[500]}
                  style={{
                    backgroundColor: isDark ? colors.surface[700] : colors.surface[100],
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                    color: textPrimary,
                    fontSize: fontSize.base,
                    textAlign: 'center',
                  }}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveProfile}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Pressable
                    onPress={() => { setEditing(false); setNameInput(chef?.name ?? ''); }}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: isDark ? colors.surface[700] : colors.surface[200],
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ color: textSecondary, fontWeight: '600', fontSize: fontSize.sm }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={saveProfile}
                    disabled={saving}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: '#0E8438',
                      alignItems: 'center',
                      opacity: saving || pressed ? 0.7 : 1,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                    })}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <CheckCircle size={16} color="#fff" strokeWidth={2.5} />
                    }
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: fontSize.sm }}>Save</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: textPrimary, fontSize: fontSize.xl, fontWeight: '700' }}>
                    {chef?.name ?? 'Set your name'}
                  </Text>
                  <Pressable
                    onPress={() => { setEditing(true); setNameInput(chef?.name ?? ''); }}
                    accessibilityRole="button"
                    accessibilityLabel="Edit name"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Pencil size={16} color={textSecondary} strokeWidth={2} />
                  </Pressable>
                </View>
                <Text style={{ color: textSecondary, fontSize: fontSize.sm }}>
                  {chef?.phoneNumber ?? '—'}
                </Text>
                {memberSince && (
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>
                    Member since {memberSince}
                  </Text>
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
                  <Text style={{ color: '#0E8438', fontSize: 22, fontWeight: '800' }}>{stat.value}</Text>
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
            {/* Active kitchen card */}
            <Pressable
              onPress={() => activeKitchen && router.push(`/(app)/kitchens/${activeKitchen.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel="View active kitchen details"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                gap: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: radius.md,
                  backgroundColor: activeKitchen ? '#0E843820' : (isDark ? colors.surface[700] : colors.surface[100]),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UtensilsCrossed
                  size={22}
                  color={activeKitchen ? '#0E8438' : textSecondary}
                  strokeWidth={1.75}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: textPrimary, fontWeight: '600', fontSize: fontSize.base }}>
                  {activeKitchen?.name ?? 'No Kitchen Selected'}
                </Text>
                {activeKitchen?.cuisineType ? (
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 1 }}>
                    {activeKitchen.cuisineType}
                    {activeKitchen.address ? ` · ${activeKitchen.address}` : ''}
                  </Text>
                ) : activeKitchen?.address ? (
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 1 }}>
                    {activeKitchen.address}
                  </Text>
                ) : (
                  <Text style={{ color: textSecondary, fontSize: fontSize.xs, marginTop: 1 }}>
                    {activeKitchen ? 'Tap to view details' : 'Set up your kitchen workspace'}
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color={textSecondary} strokeWidth={2} />
            </Pressable>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: isDark ? colors.surface[700] : colors.surface[100], marginHorizontal: spacing.md }} />

            {/* Manage kitchens */}
            <Pressable
              onPress={() => router.push('/(app)/kitchens')}
              accessibilityRole="button"
              accessibilityLabel="Manage all kitchens"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 4,
                gap: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ flex: 1, color: '#0E8438', fontSize: fontSize.sm, fontWeight: '500' }}>
                Manage All Kitchens
              </Text>
              <View
                style={{
                  backgroundColor: '#0E843820',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: '#0E8438', fontSize: fontSize.xs, fontWeight: '600' }}>
                  {activeKitchens.length}
                </Text>
              </View>
              <ChevronRight size={14} color="#0E8438" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Quick actions */}
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
            Quick Links
          </Text>

          <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, borderWidth: 1, borderColor, overflow: 'hidden' }}>
            {[
              {
                icon: <Package size={18} color="#0E8438" strokeWidth={2} />,
                label: 'Stock & Ingredients',
                sub: 'View and manage inventory',
                onPress: () => router.push('/(app)/(tabs)/stock' as never),
              },
              {
                icon: <UtensilsCrossed size={18} color="#0E8438" strokeWidth={2} />,
                label: 'Menu Management',
                sub: 'Items, pricing, recipes',
                onPress: () => router.push('/(app)/(tabs)/menu' as never),
              },
              {
                icon: <Truck size={18} color="#0E8438" strokeWidth={2} />,
                label: 'Delivery Receiving',
                sub: 'Log and track deliveries',
                onPress: () => router.push('/(app)/receiving'),
              },
            ].map((item, i, arr) => (
              <View key={item.label}>
                <Pressable
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 4,
                    gap: spacing.sm,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.md,
                      backgroundColor: '#0E843815',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: textPrimary, fontWeight: '500', fontSize: fontSize.sm }}>{item.label}</Text>
                    <Text style={{ color: textSecondary, fontSize: fontSize.xs }}>{item.sub}</Text>
                  </View>
                  <ChevronRight size={14} color={textSecondary} strokeWidth={2} />
                </Pressable>
                {i < arr.length - 1 && (
                  <View style={{ height: 1, backgroundColor: isDark ? colors.surface[700] : colors.surface[100], marginHorizontal: spacing.md }} />
                )}
              </View>
            ))}
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
            <Pressable
              onPress={() => router.push('/(app)/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 4,
                gap: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: isDark ? colors.surface[700] : colors.surface[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Settings size={18} color={textSecondary} strokeWidth={2} />
              </View>
              <Text style={{ flex: 1, color: textPrimary, fontWeight: '500', fontSize: fontSize.sm }}>Settings</Text>
              <ChevronRight size={14} color={textSecondary} strokeWidth={2} />
            </Pressable>

            <View style={{ height: 1, backgroundColor: isDark ? colors.surface[700] : colors.surface[100], marginHorizontal: spacing.md }} />

            <Pressable
              onPress={handleSignOut}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 4,
                gap: spacing.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogOut size={18} color="#DC2626" strokeWidth={2} />
              </View>
              <Text style={{ flex: 1, color: '#DC2626', fontWeight: '500', fontSize: fontSize.sm }}>Sign Out</Text>
            </Pressable>
          </View>

          {/* Footer wordmark */}
          <View style={{ alignItems: 'center', paddingBottom: spacing.sm, gap: 2 }}>
            <Text style={{ color: textSecondary, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Food Bundles Chef
            </Text>
            <Text style={{ color: isDark ? colors.surface[700] : colors.surface[300], fontSize: 10 }}>
              Built for professional kitchen teams
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
