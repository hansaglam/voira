import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../AppButton';
import { AppCard } from '../AppCard';
import { colors, spacing, typography } from '../../theme';

interface ContinueLearningCardProps {
  label: string;
  title: string;
  focus: string;
  ctaLabel: string;
  onPress: () => void;
}

export function ContinueLearningCard({
  label,
  title,
  focus,
  ctaLabel,
  onPress,
}: ContinueLearningCardProps) {
  return (
    <AppCard style={styles.card} elevated>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.focus}>{focus}</Text>
      <AppButton
        title={ctaLabel}
        size="compact"
        onPress={onPress}
        style={styles.button}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.sm + 4,
  },
  label: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    marginBottom: 4,
  },
  focus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  button: {
    alignSelf: 'flex-start',
    minWidth: 140,
  },
});
