import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export default function GuestScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.oat }]}>
      <View style={styles.content}>
        <Text variant="headline">Guest Mode</Text>
        <Text variant="body" color={palette.secondary}>
          Explore as guest - sign in to save your kitchen data
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
