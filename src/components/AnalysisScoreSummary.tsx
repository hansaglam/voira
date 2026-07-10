import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeScoreRing } from './NativeScoreRing';
import { ProgressBar } from './ProgressBar';
import { colors, spacing, borderRadius } from '../theme';

export interface ScoreMetric {
  label: string;
  score: number;
  color: string;
}

interface AnalysisScoreSummaryProps {
  overallScore: number;
  resultLabel: string;
  supportingText: string;
  metrics: ScoreMetric[];
}

function MetricRow({ label, score, color }: ScoreMetric) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBar}>
        <ProgressBar progress={score} color={color} height={3} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{score}</Text>
    </View>
  );
}

export function AnalysisScoreSummary({
  overallScore,
  resultLabel,
  supportingText,
  metrics,
}: AnalysisScoreSummaryProps) {
  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={[
          'rgba(91, 95, 239, 0.12)',
          'rgba(26, 27, 46, 0.95)',
          'rgba(34, 35, 58, 0.98)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.heroRow}>
          <NativeScoreRing score={overallScore} size={84} />
          <View style={styles.heroText}>
            <Text style={styles.resultLabel}>{resultLabel}</Text>
            <Text style={styles.supportingText}>{supportingText}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metrics}>
          {metrics.map((metric) => (
            <MetricRow key={metric.label} {...metric} />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
    }),
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.28)',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroText: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 23,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  supportingText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    marginVertical: spacing.sm + 2,
  },
  metrics: {
    gap: 7,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricLabel: {
    width: 62,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricBar: {
    flex: 1,
  },
  metricValue: {
    width: 26,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
});
