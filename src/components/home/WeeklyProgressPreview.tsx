import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeWeeklyProgress } from '../../services/home';
import { colors, spacing, borderRadius } from '../../theme';

interface WeeklyProgressPreviewProps {
  title: string;
  progress: HomeWeeklyProgress;
  practicesLabel: string;
  minutesLabel: string | null;
  averageLabel: string | null;
  emptyLabel: string;
  ctaLabel: string;
  onPress: () => void;
}

export function WeeklyProgressPreview({
  title,
  progress,
  practicesLabel,
  minutesLabel,
  averageLabel,
  emptyLabel,
  ctaLabel,
  onPress,
}: WeeklyProgressPreviewProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {progress.hasEnoughData ? (
        <View style={styles.metrics}>
          <Text style={styles.metric}>{practicesLabel}</Text>
          {minutesLabel ? <Text style={styles.metric}>{minutesLabel}</Text> : null}
          {averageLabel ? <Text style={styles.metric}>{averageLabel}</Text> : null}
        </View>
      ) : (
        <Text style={styles.empty}>{emptyLabel}</Text>
      )}
      <TouchableOpacity
        style={styles.cta}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  metrics: {
    gap: 4,
    marginBottom: spacing.sm,
  },
  metric: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
});
