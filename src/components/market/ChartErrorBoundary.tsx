import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, space, text, useTheme } from '@/theme';
import { useT } from '@/i18n';

export interface ChartErrorBoundaryProps {
  children: ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

function ChartErrorFallback() {
  const t = useT();
  const { colors } = useTheme();

  return (
    <View style={[styles.fallback, { backgroundColor: colors.tintChili }]} accessibilityRole="alert">
      <Text style={[styles.title, { color: colors.ink }]}>{t('chart_errorTitle')}</Text>
      <Text style={[styles.message, { color: colors.tintedRedText }]}>{t('chart_errorMessage')}</Text>
    </View>
  );
}

/** Catches SVG chart render crashes (e.g. a malformed series) so one bad chart never blanks the screen. */
export class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ChartErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return <ChartErrorFallback />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', padding: space.xl, minHeight: 160, borderRadius: radius.md },
  title: { ...text.bodySemi, textAlign: 'center' },
  message: { ...text.caption, textAlign: 'center', marginTop: space.xs },
});
