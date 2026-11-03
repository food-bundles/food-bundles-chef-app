import { View, Text, Pressable, Image, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGO_URI = 'https://res.cloudinary.com/dzxyelclu/image/upload/v1760111270/Food_bundle_logo_cfsnsw.png';

export default function WelcomeScreen() {
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
              accessibilityLabel="Food Bundles"
            />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Chef App</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Hero */}
        <Text style={styles.headline}>Run your{'\n'}kitchen{'\n'}smarter.</Text>
        <Text style={styles.sub}>Order right. Receive right.{'\n'}Know your stock before service.</Text>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: '📦', title: 'Smart Purchasing', desc: 'AI suggests what to buy before you run out' },
            { icon: '🚚', title: 'Delivery Receiving', desc: 'Verify and log deliveries in seconds' },
            { icon: '📊', title: 'Kitchen Insights', desc: 'Real-time stock and sales at a glance' },
          ].map(({ icon, title, desc }) => (
            <View key={title} style={styles.card}>
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
        <Pressable
          onPress={() => router.push('/(auth)/phone-number')}
          accessibilityRole="button"
          accessibilityLabel="Get started"
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <View style={styles.btn}>
            <Text style={styles.btnText}>Get Started  →</Text>
          </View>
        </Pressable>
        <Text style={styles.hint}>For restaurants, hotels & schools in Rwanda</Text>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A1F10',
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
    borderColor: '#FFFFFF',
    backgroundColor: '#22C55E',
  },
  logo: {
    width: 56,
    height: 56,
  },
  badge: {
    backgroundColor: '#112B18',
    borderWidth: 1,
    borderColor: '#1E4028',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  divider: {
    height: 1,
    backgroundColor: '#1A3522',
    marginVertical: 24,
  },

  // Hero
  headline: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 54,
    letterSpacing: -1.2,
    marginBottom: 14,
  },
  sub: {
    color: '#6B9966',
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
    backgroundColor: '#0E2516',
    borderWidth: 1,
    borderColor: '#1C3D24',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#132E1A',
    borderWidth: 1,
    borderColor: '#1E4028',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: {
    color: '#E8F5E5',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDesc: {
    color: '#4D7549',
    fontSize: 12,
    lineHeight: 17,
  },

  // CTA — solid, unmissable
  cta: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#0A1F10',
    borderTopWidth: 1,
    borderTopColor: '#1A3522',
    gap: 12,
  },
  btn: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  btnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  hint: {
    color: '#2E5229',
    textAlign: 'center',
    fontSize: 12,
  },
});
