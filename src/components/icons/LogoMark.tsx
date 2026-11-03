import { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { radius, useTheme } from '@/theme';

export interface LogoMarkProps {
  size?: number;
}

const REMOTE_LOGO_URI =
  'https://res.cloudinary.com/dzxyelclu/image/upload/v1760111270/Food_bundle_logo_cfsnsw.png';

function LogoMarkFallback({ size }: { size: number }) {
  const { colors } = useTheme();
  const iconSize = Math.round(size * 0.55);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: radius.md, backgroundColor: colors.leaf },
      ]}
    >
      <Svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill="none">
        <Path
          d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8z"
          stroke={colors.marigold}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M8.5 8a3.5 3.5 0 0 1 7 0"
          stroke={colors.marigold}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export function LogoMark({ size = 48 }: LogoMarkProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View accessible accessibilityLabel="FoodBundles logo">
        <LogoMarkFallback size={size} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: REMOTE_LOGO_URI }}
      accessibilityLabel="FoodBundles logo"
      resizeMode="contain"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
