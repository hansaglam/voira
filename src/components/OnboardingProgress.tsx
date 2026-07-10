import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { ViewStyle } from 'react-native';

interface OnboardingProgressProps {
  current: number;
  total: number;
  style?: ViewStyle;
}

export function OnboardingProgress({ current, total, style }: OnboardingProgressProps) {
  const progress = (current / total) * 100;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.label}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    minWidth: 32,
  },
});
