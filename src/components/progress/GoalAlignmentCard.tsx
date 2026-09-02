import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../AppCard';
import { colors, spacing } from '../../theme';
import type { SpeakingFocusArea } from '../../types/speakingProfile';
import type { SpeakingPriority } from '../../services/personalization/personalSpeakingPlanTypes';

interface GoalAlignmentCardProps {
  title: string;
  youChoseLabel: string;
  noticingLabel: string;
  note: string;
  userPriorities: SpeakingPriority[];
  detectedFocus: SpeakingFocusArea[];
  priorityLabel: (priority: SpeakingPriority) => string;
  focusLabel: (area: SpeakingFocusArea) => string;
  onViewed?: () => void;
}

function joinLabels<T>(items: T[], label: (item: T) => string): string {
  return items.map(label).join(' · ');
}

export function GoalAlignmentCard({
  title,
  youChoseLabel,
  noticingLabel,
  note,
  userPriorities,
  detectedFocus,
  priorityLabel,
  focusLabel,
  onViewed,
}: GoalAlignmentCardProps) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onViewed?.();
  }, [onViewed]);

  if (userPriorities.length === 0 && detectedFocus.length === 0) return null;

  return (
    <AppCard style={styles.card}>
      <View accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      {userPriorities.length > 0 ? (
        <View style={styles.row}>
          <Text style={styles.label}>{youChoseLabel}</Text>
          <Text style={styles.value}>{joinLabels(userPriorities, priorityLabel)}</Text>
        </View>
      ) : null}
      {detectedFocus.length > 0 ? (
        <View style={styles.row}>
          <Text style={styles.label}>{noticingLabel}</Text>
          <Text style={styles.value}>{joinLabels(detectedFocus, focusLabel)}</Text>
        </View>
      ) : null}
      <Text style={styles.note}>{note}</Text>
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
  row: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
