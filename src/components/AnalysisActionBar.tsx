import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { spacing } from '../theme';

interface AnalysisActionBarProps {
  onRetry: () => void;
  onNext: () => void;
  primaryLabel?: string;
  /** Score under 40: emphasize retry visually; next stays enabled as outline. */
  emphasizeRetry?: boolean;
}

export function AnalysisActionBar({
  onRetry,
  onNext,
  primaryLabel = 'Devam et',
  emphasizeRetry = false,
}: AnalysisActionBarProps) {
  return (
    <View style={styles.bar}>
      <AppButton
        title="Tekrar dene"
        variant={emphasizeRetry ? 'primary' : 'outline'}
        size="compact"
        onPress={onRetry}
        style={emphasizeRetry ? styles.emphasized : styles.secondary}
      />
      <AppButton
        title={primaryLabel}
        variant={emphasizeRetry ? 'outline' : 'primary'}
        size="compact"
        onPress={onNext}
        style={emphasizeRetry ? styles.secondary : styles.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  secondary: {
    flex: 1,
  },
  primary: {
    flex: 1.15,
  },
  emphasized: {
    flex: 1.2,
  },
});
