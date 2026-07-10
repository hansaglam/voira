import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { spacing } from '../theme';

interface AnalysisActionBarProps {
  onRetry: () => void;
  onNext: () => void;
  primaryLabel?: string;
}

export function AnalysisActionBar({ onRetry, onNext, primaryLabel = 'Devam et' }: AnalysisActionBarProps) {
  return (
    <View style={styles.bar}>
      <AppButton
        title="Tekrar dene"
        variant="outline"
        size="compact"
        onPress={onRetry}
        style={styles.secondary}
      />
      <AppButton
        title={primaryLabel}
        size="compact"
        onPress={onNext}
        style={styles.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondary: {
    flex: 1,
  },
  primary: {
    flex: 1.15,
  },
});
