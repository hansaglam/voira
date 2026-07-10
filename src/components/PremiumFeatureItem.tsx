import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

interface PremiumFeatureItemProps {
  text: string;
  compact?: boolean;
  isLast?: boolean;
}

export function PremiumFeatureItem({
  text,
  compact = false,
  isLast = false,
}: PremiumFeatureItemProps) {
  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        isLast && styles.containerLast,
      ]}
    >
      <Ionicons
        name="checkmark-circle"
        size={compact ? 17 : 20}
        color={colors.secondary}
      />
      <Text style={[styles.text, compact && styles.textCompact]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  containerCompact: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  containerLast: {
    marginBottom: 0,
  },
  text: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  textCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
});
