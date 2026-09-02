import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../AppCard';
import { colors, spacing } from '../../theme';
import type { ProfileConsistencySnapshot } from '../../services/profile/profileConsistencyService';

interface ConsistencySectionProps {
  title: string;
  practicesLabel: string;
  daysLabel: string;
  streakLabel: string | null;
  snapshot: ProfileConsistencySnapshot;
}

export function ConsistencySection({
  title,
  practicesLabel,
  daysLabel,
  streakLabel,
  snapshot,
}: ConsistencySectionProps) {
  return (
    <AppCard style={styles.card}>
      <View accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.line}>{practicesLabel}</Text>
      <Text style={styles.line}>{daysLabel}</Text>
      {streakLabel ? <Text style={styles.muted}>{streakLabel}</Text> : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  line: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  muted: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
