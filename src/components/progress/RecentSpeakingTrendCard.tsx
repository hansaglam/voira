import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from '../AppCard';
import { colors, spacing } from '../../theme';
import type { SpeakingTrend } from '../../types/speakingProfile';

interface RecentSpeakingTrendCardProps {
  title: string;
  score: number | null;
  scoreLabel: string;
  trend: SpeakingTrend;
  trendLabel: string;
  deltaLabel?: string | null;
}

function trendIcon(trend: SpeakingTrend): keyof typeof Ionicons.glyphMap {
  if (trend === 'improving') return 'trending-up';
  if (trend === 'declining') return 'trending-down';
  if (trend === 'stable') return 'remove';
  return 'ellipsis-horizontal';
}

export function RecentSpeakingTrendCard({
  title,
  score,
  scoreLabel,
  trend,
  trendLabel,
  deltaLabel,
}: RecentSpeakingTrendCardProps) {
  return (
    <AppCard style={styles.card}>
      <View
        accessible
        accessibilityLabel={`${title}. ${scoreLabel}. ${trendLabel}${deltaLabel ? `. ${deltaLabel}` : ''}`}
      >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.score}>{score ?? scoreLabel}</Text>
      <View style={styles.trendRow}>
        <Ionicons name={trendIcon(trend)} size={14} color={colors.secondary} />
        <Text style={styles.trendText}>{trendLabel}</Text>
      </View>
      {deltaLabel ? <Text style={styles.delta}>{deltaLabel}</Text> : null}
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
  score: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  delta: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
});
