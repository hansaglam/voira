import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function AppCard({ children, style, elevated = false }: AppCardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
    ...shadows.cardElevated,
  },
});
