import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../AppCard';
import { colors, spacing } from '../../theme';
import type { SpeakingProgressEvidenceItem } from '../../types/speakingProfile';

interface ProgressEvidenceSectionProps {
  title: string;
  items: SpeakingProgressEvidenceItem[];
  resolveMessage: (item: SpeakingProgressEvidenceItem) => string;
}

export function ProgressEvidenceSection({
  title,
  items,
  resolveMessage,
}: ProgressEvidenceSectionProps) {
  if (items.length === 0) return null;

  return (
    <AppCard style={styles.card}>
      <View accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      {items.map((item, index) => (
        <View key={`${item.kind}-${index}`} style={styles.row}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{resolveMessage(item)}</Text>
        </View>
      ))}
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
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bullet: {
    color: colors.secondary,
    fontSize: 14,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
