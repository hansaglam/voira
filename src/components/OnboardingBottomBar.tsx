import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { colors, spacing, typography } from '../theme';

interface OnboardingBottomBarProps {
  onContinue: () => void;
  disabled?: boolean;
  ctaLabel?: string;
  selectedCount?: number;
  showSelectedCount?: boolean;
  summaryText?: string;
}

export function OnboardingBottomBar({
  onContinue,
  disabled = false,
  ctaLabel = 'Devam et',
  selectedCount = 0,
  showSelectedCount = false,
  summaryText,
}: OnboardingBottomBarProps) {
  return (
    <View style={styles.container}>
      {summaryText ? (
        <Text style={styles.selectedCount}>{summaryText}</Text>
      ) : (
        showSelectedCount &&
        selectedCount > 0 && (
          <Text style={styles.selectedCount}>{selectedCount} seçildi</Text>
        )
      )}
      <AppButton title={ctaLabel} onPress={onContinue} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  selectedCount: {
    ...typography.captionBright,
    textAlign: 'center',
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
});
