import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../AppCard';
import type { AttemptComparison } from '../../../services/analysis/result';
import { colors, spacing } from '../../../theme';

interface AnalysisImprovementCardProps {
  comparison: AttemptComparison;
}

export function AnalysisImprovementCard({ comparison }: AnalysisImprovementCardProps) {
  const { t } = useTranslation();

  const bodyKey =
    comparison.direction === 'improved'
      ? 'analysis.improvementUp'
      : comparison.direction === 'declined'
        ? 'analysis.improvementDown'
        : 'analysis.improvementSimilar';

  const deltaLabel =
    comparison.direction === 'improved'
      ? `+${comparison.delta}`
      : comparison.direction === 'declined'
        ? `${comparison.delta}`
        : t('analysis.improvementSimilarDelta');

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
        <Text style={styles.title}>{t('analysis.improvementTitle')}</Text>
      </View>
      <View style={styles.scoreRow}>
        <View style={styles.scoreCol}>
          <Text style={styles.scoreLabel}>{t('analysis.improvementPrevious')}</Text>
          <Text style={styles.scoreValue}>{comparison.previousScore}</Text>
        </View>
        <View style={styles.scoreCol}>
          <Text style={styles.scoreLabel}>{t('analysis.improvementNow')}</Text>
          <Text style={[styles.scoreValue, styles.scoreValueNow]}>
            {comparison.currentScore}
          </Text>
        </View>
        <View style={styles.deltaCol}>
          <Text
            style={[
              styles.delta,
              comparison.direction === 'improved' && styles.deltaUp,
              comparison.direction === 'declined' && styles.deltaDown,
            ]}
          >
            {deltaLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.body}>{t(bodyKey, { delta: Math.abs(comparison.delta) })}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
    borderColor: 'rgba(91, 95, 239, 0.22)',
    backgroundColor: 'rgba(91, 95, 239, 0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  scoreCol: {
    minWidth: 72,
  },
  scoreLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  scoreValueNow: {
    color: colors.textPrimary,
  },
  deltaCol: {
    marginLeft: 'auto',
  },
  delta: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  deltaUp: {
    color: colors.success,
  },
  deltaDown: {
    color: colors.textSecondary,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
});
