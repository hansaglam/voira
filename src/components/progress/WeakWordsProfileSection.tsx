import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from '../AppCard';
import { colors, spacing } from '../../theme';
import type { WeakWordItem } from '../../types/weakWords';

interface WeakWordsProfileSectionProps {
  title: string;
  activeLabel: string;
  improvingLabel: string;
  masteredLabel: string;
  ctaLabel: string;
  activeCount: number;
  improvingCount: number;
  masteredCount: number;
  topWords: WeakWordItem[];
  onPractice: () => void;
}

export function WeakWordsProfileSection({
  title,
  activeLabel,
  improvingLabel,
  masteredLabel,
  ctaLabel,
  activeCount,
  improvingCount,
  masteredCount,
  topWords,
  onPractice,
}: WeakWordsProfileSectionProps) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.stats}>
        <Text style={styles.stat}>{activeLabel}</Text>
        <Text style={styles.statMuted}>
          {improvingLabel} · {masteredLabel}
        </Text>
      </View>
      {topWords.length > 0 ? (
        <View style={styles.words}>
          {topWords.map((word) => (
            <View key={word.normalizedWord} style={styles.wordChip}>
              <Text style={styles.wordText}>{word.displayWord}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable
        style={styles.cta}
        onPress={onPractice}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.secondary} />
      </Pressable>
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
  stats: {
    marginBottom: spacing.sm,
  },
  stat: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  statMuted: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  words: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  wordChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  wordText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.xs,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
});
