import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { radius, text, useTheme } from '@/theme';
import { PARTNER_LOGOS, type PartnerLogoKey } from '@/constants/partners';

export interface PartnerLogoProps {
  partner: PartnerLogoKey;
  name: string;
  width?: number;
  height?: number;
}

const FALLBACK_SIZE = 40;

/** Real partner logo image, with a 2-letter initials fallback square if the remote image fails to load. */
export function PartnerLogo({ partner, name, width = 48, height = 32 }: PartnerLogoProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.neutral }]}>
        <Text style={[styles.fallbackLabel, { color: colors.secondary }]}>{name.slice(0, 2).toUpperCase()}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: PARTNER_LOGOS[partner] }}
      accessibilityLabel={name}
      resizeMode="contain"
      style={{ width, height }}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    width: FALLBACK_SIZE,
    height: FALLBACK_SIZE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLabel: { ...text.label },
});
