import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HomeSpeakingSnapshot } from '../../services/home';
import { colors, spacing, borderRadius } from '../../theme';

interface SpeakingSnapshotProps {
  snapshot: HomeSpeakingSnapshot;
  labels: {
    streak: string;
    average: string;
    weekly: string;
    buildingBaseline: string;
  };
}

function formatMetric(
  value: number | null,
  isNeutral: boolean,
  weekly = false,
): string {
  if (isNeutral || value == null) return '—';
  if (weekly) {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}`;
  }
  return String(value);
}

export function SpeakingSnapshot({ snapshot, labels }: SpeakingSnapshotProps) {
  const items = [
    {
      key: 'streak',
      value: formatMetric(snapshot.streak.value, snapshot.streak.isNeutral),
      label: labels.streak,
      accessibilityLabel: `${labels.streak}: ${formatMetric(
        snapshot.streak.value,
        snapshot.streak.isNeutral,
      )}`,
    },
    {
      key: 'average',
      value: formatMetric(snapshot.average.value, snapshot.average.isNeutral),
      label: labels.average,
      accessibilityLabel: `${labels.average}: ${formatMetric(
        snapshot.average.value,
        snapshot.average.isNeutral,
      )}`,
    },
    {
      key: 'weekly',
      value: formatMetric(snapshot.weekly.value, snapshot.weekly.isNeutral, true),
      label: snapshot.weekly.isNeutral ? labels.buildingBaseline : labels.weekly,
      accessibilityLabel: snapshot.weekly.isNeutral
        ? labels.buildingBaseline
        : `${labels.weekly}: ${formatMetric(snapshot.weekly.value, false, true)}`,
    },
  ] as const;

  return (
    <View style={styles.row} accessibilityRole="summary">
      {items.map((item) => (
        <View
          key={item.key}
          style={styles.cell}
          accessible
          accessibilityLabel={item.accessibilityLabel}
        >
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cell: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
});
