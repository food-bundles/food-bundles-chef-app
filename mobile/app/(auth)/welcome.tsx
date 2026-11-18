import { View, Text, Image, StyleSheet, ScrollView } from 'react-native';
import { AppPressable } from '@/components/ui/AppPressable';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { authPalette, colors } from '@/lib/theme';

const LOGO_URI = 'https://res.cloudinary.com/dzxyelclu/image/upload/v1760111270/Food_bundle_logo_cfsnsw.png';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Image
              source={{ uri: LOGO_URI }}
              style={styles.logo}
              resizeMode="cover"
              accessibilityLabel={t('common.appName')}
            />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('auth.badge')}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Hero */}
        <Text style={styles.headline}>{t('auth.headline')}</Text>
        <Text style={styles.sub}>{t('auth.taglineSub')}</Text>

        {/* Features */}
        <View style={styles.features}>
          {[
            { key: 'purchasing', icon: '📦', title: t('auth.features.purchasingTitle'), desc: t('auth.features.purchasingDesc') },
            { key: 'receiving', icon: '🚚', title: t('auth.features.receivingTitle'), desc: t('auth.features.receivingDesc') },
            { key: 'insights', icon: '📊', title: t('auth.features.insightsTitle'), desc: t('auth.features.insightsDesc') },
          ].map(({ key, icon, title, desc }) => (
            <View key={key} style={styles.card} accessible accessibilityLabel={`${title}. ${desc}`}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>{icon}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* CTA — fixed at bottom, always visible */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom + 12, 32) }]}>
        <AppPressable
          onPress={() => router.push('/(auth)/phone-number')}
          accessibilityRole="button"
          accessibilityLabel={t('auth.getStartedLabel')}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <View style={styles.btn}>
            <Text style={styles.btnText}>{t('auth.getStarted')}</Text>
          </View>
        </AppPressable>
        <Text style={styles.hint}>{t('auth.hint')}</Text>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authPalette.bgAlt,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.action,
  },
  logo: {
    width: 56,
    height: 56,
  },
  badge: {
    backgroundColor: authPalette.card,
    borderWidth: 1,
    borderColor: authPalette.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: authPalette.highlight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  divider: {
    height: 1,
    backgroundColor: authPalette.ctaBar,
    marginVertical: 24,
  },

  // Hero
  headline: {
    color: colors.white,
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 54,
    letterSpacing: -1.2,
    marginBottom: 14,
  },
  sub: {
    color: authPalette.muted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },

  // Feature cards
  features: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: authPalette.input,
    borderWidth: 1,
    borderColor: authPalette.inputBorder,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: authPalette.cardAlt,
    borderWidth: 1,
    borderColor: authPalette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: {
    color: authPalette.paleText,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDesc: {
    color: authPalette.mutedDim,
    fontSize: 12,
    lineHeight: 17,
  },

  // CTA — solid, unmissable
  cta: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: authPalette.bgAlt,
    borderTopWidth: 1,
    borderTopColor: authPalette.ctaBar,
    gap: 12,
  },
  btn: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: colors.action,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.action,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  btnText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  hint: {
    color: authPalette.divider,
    textAlign: 'center',
    fontSize: 12,
  },
});
