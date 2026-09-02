import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppCard } from '../AppCard';
import { colors, spacing, typography } from '../../theme';
import type { ProfileInsightId } from '../../types/speakingProfile';

interface ProfileStatusHeaderProps {
  isForming: boolean;
  formingTitle: string;
  formingBody: string;
  profileTitle: string;
  insightText: string;
}

export function ProfileStatusHeader({
  isForming,
  formingTitle,
  formingBody,
  profileTitle,
  insightText,
}: ProfileStatusHeaderProps) {
  return (
    <AppCard style={styles.card}>
      <View accessibilityRole="summary">
      <Text style={styles.title}>{isForming ? formingTitle : profileTitle}</Text>
      <Text style={styles.body}>{isForming ? formingBody : insightText}</Text>
      </View>
    </AppCard>
  );
}

export function resolveInsightTranslationKey(insightId: ProfileInsightId): string {
  return `progress.insight_${insightId}`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
