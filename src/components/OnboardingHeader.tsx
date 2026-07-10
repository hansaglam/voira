import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingProgress } from './OnboardingProgress';
import { colors, spacing, typography } from '../theme';

interface OnboardingHeaderProps {
  title: string;
  subtitle: string;
  step?: number;
  totalSteps?: number;
  onBack?: () => void;
}

export function OnboardingHeader({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
}: OnboardingHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        {step !== undefined && totalSteps !== undefined && (
          <OnboardingProgress current={step} total={totalSteps} style={styles.progress} />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 36,
  },
  progress: {
    flex: 1,
    marginBottom: 0,
  },
  title: {
    ...typography.h1,
    fontSize: 26,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 24,
  },
});
