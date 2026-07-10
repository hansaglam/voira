import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppCard } from './AppCard';
import { colors, spacing, typography, borderRadius } from '../theme';

interface SentenceCardProps {
  targetSentence: string;
  turkishTranslation: string;
  slowPracticeSentence: string;
  naturalSpeedNote?: string;
  hidden?: boolean;
}

export function SentenceCard({
  targetSentence,
  turkishTranslation,
  slowPracticeSentence,
  naturalSpeedNote,
  hidden = false,
}: SentenceCardProps) {
  if (hidden) {
    return (
      <AppCard elevated style={styles.hiddenCard}>
        <Text style={styles.hiddenTitle}>Metin gizlendi</Text>
        <Text style={typography.body}>Dinle ve aynı ritimle tekrar et.</Text>
      </AppCard>
    );
  }

  return (
    <AppCard elevated style={styles.card}>
      <Text style={typography.sentence}>{targetSentence}</Text>
      <View style={styles.divider} />
      <Text style={styles.translation}>{turkishTranslation}</Text>
      <View style={styles.slowSection}>
        <Text style={styles.slowLabel}>Yavaş pratik</Text>
        <Text style={styles.slowText}>{slowPracticeSentence}</Text>
      </View>
      {naturalSpeedNote && (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Doğal hız notu</Text>
          <Text style={styles.noteText}>{naturalSpeedNote}</Text>
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  hiddenCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  hiddenTitle: {
    ...typography.h3,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.borderLight,
    borderRadius: 1,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  translation: {
    ...typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  slowSection: {
    backgroundColor: colors.cardElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slowLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.secondary,
  },
  slowText: {
    ...typography.bodyEmphasis,
    textAlign: 'center',
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 26,
  },
  noteBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteLabel: {
    ...typography.meta,
    marginBottom: spacing.xs,
    color: colors.textMuted,
  },
  noteText: {
    ...typography.captionBright,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
