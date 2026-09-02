import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  primaryLabel,
  emphasizeRetry = false,
}: AnalysisActionBarProps) {
  const { t } = useTranslation();
  const nextLabel = primaryLabel ?? t('analysis.continue');

  return (
    <View style={styles.bar}>
      <AppButton
        title={t('analysis.retry')}
        variant={emphasizeRetry ? 'primary' : 'outline'}
        size="compact"
        onPress={onRetry}
        style={emphasizeRetry ? styles.emphasized : styles.secondary}
      />
      <AppButton
        title={nextLabel}
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
