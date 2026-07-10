import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface PersonalizationSectionProps {
  sectionTitle: string;
  question: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PersonalizationSection({
  sectionTitle,
  question,
  children,
  style,
}: PersonalizationSectionProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      <Text style={styles.question}>{question}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
    letterSpacing: 1.2,
  },
  question: {
    ...typography.h3,
    fontSize: 17,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
});
