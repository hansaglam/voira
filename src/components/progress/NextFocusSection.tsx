import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppCard } from '../AppCard';
import { colors, spacing } from '../../theme';
import type { NextFocusId } from '../../types/speakingProfile';

interface NextFocusSectionProps {
  title: string;
  focusLabel: string;
  body: string;
  ctaLabel: string;
  nextFocusId: NextFocusId;
  onPress: () => void;
}

export function NextFocusSection({
  title,
  focusLabel,
  body,
  ctaLabel,
  onPress,
}: NextFocusSectionProps) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.focus}>{focusLabel}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        style={styles.cta}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
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
    marginBottom: spacing.xs,
  },
  focus: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cta: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
});
