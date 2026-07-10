import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, spacing } from '../theme';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: [string, string];
  style?: ViewStyle;
}

export function GradientCard({
  children,
  colors = ['#5B5FEF', '#8B5CF6'],
  style,
}: GradientCardProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
});
