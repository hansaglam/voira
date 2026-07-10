import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme';

type PillVariant = 'default' | 'success' | 'premium' | 'muted';

interface PillBadgeProps {
  label: string;
  variant?: PillVariant;
  icon?: keyof typeof Ionicons.glyphMap;
}

const VARIANT_STYLES: Record<
  PillVariant,
  { bg: string; border: string; text: string }
> = {
  default: {
    bg: 'rgba(91, 95, 239, 0.1)',
    border: 'rgba(91, 95, 239, 0.2)',
    text: colors.textSecondary,
  },
  success: {
    bg: 'rgba(52, 211, 153, 0.1)',
    border: 'rgba(52, 211, 153, 0.22)',
    text: colors.success,
  },
  premium: {
    bg: colors.premiumMuted,
    border: 'rgba(229, 184, 74, 0.28)',
    text: colors.premium,
  },
  muted: {
    bg: 'rgba(26, 27, 46, 0.8)',
    border: colors.border,
    text: colors.textMuted,
  },
};

export function PillBadge({ label, variant = 'default', icon }: PillBadgeProps) {
  const palette = VARIANT_STYLES[variant];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      {icon ? <Ionicons name={icon} size={10} color={palette.text} /> : null}
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
