import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../AppCard';
import { colors, spacing } from '../../theme';
import type { MetricSnapshot, SpeakingMetric } from '../../types/speakingProfile';

interface MetricProfileCardProps {
  strongestTitle: string;
  focusTitle: string;
  seeAllLabel: string;
  strongest: MetricSnapshot | null;
  focus: MetricSnapshot | null;
  metricLabel: (metric: SpeakingMetric) => string;
  metricDescription: (metric: SpeakingMetric) => string;
  scoreUnavailable: string;
  onMetricOpened?: (metric: SpeakingMetric) => void;
}

export function MetricProfileCard({
  strongestTitle,
  focusTitle,
  seeAllLabel,
  strongest,
  focus,
  metricLabel,
  metricDescription,
  scoreUnavailable,
  onMetricOpened,
}: MetricProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!strongest && !focus) return null;

  const renderMetric = (label: string, snapshot: MetricSnapshot | null) => (
    <View style={styles.metricBlock} accessibilityRole="text">
      <Text style={styles.metricHeading}>{label}</Text>
      {snapshot ? (
        <>
          <Text style={styles.metricName}>{metricLabel(snapshot.metric)}</Text>
          <Text style={styles.metricScore}>{snapshot.average}</Text>
          <Text style={styles.metricDesc}>{metricDescription(snapshot.metric)}</Text>
        </>
      ) : (
        <Text style={styles.metricScore}>{scoreUnavailable}</Text>
      )}
    </View>
  );

  return (
    <AppCard style={styles.card}>
      <View style={styles.row}>
        {renderMetric(strongestTitle, strongest)}
        {renderMetric(focusTitle, focus)}
      </View>
      {expanded && strongest ? (
        <Text style={styles.expandedDesc}>{metricDescription(strongest.metric)}</Text>
      ) : null}
      {strongest || focus ? (
        <Pressable
          onPress={() => {
            setExpanded((value) => !value);
            const metric = focus?.metric ?? strongest?.metric;
            if (metric) onMetricOpened?.(metric);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.seeAll}>{seeAllLabel}</Text>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricBlock: {
    flex: 1,
  },
  metricHeading: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  metricName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricScore: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary,
    marginVertical: spacing.xs,
  },
  metricDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  expandedDesc: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  seeAll: {
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
});
