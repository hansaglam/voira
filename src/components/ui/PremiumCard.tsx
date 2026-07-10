import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, shadows } from '../../theme';

interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  tint?: 'default' | 'premium';
}

export function PremiumCard({
  children,
  style,
  elevated = false,
  tint = 'default',
}: PremiumCardProps) {
  const tintColors =
    tint === 'premium'
      ? (['rgba(229, 184, 74, 0.08)', colors.card] as const)
      : (['rgba(91, 95, 239, 0.06)', colors.card] as const);

  return (
    <View style={[styles.outer, elevated && shadows.cardElevated, style]}>
      <LinearGradient
        colors={tintColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, elevated && styles.elevated]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  elevated: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
  },
});
