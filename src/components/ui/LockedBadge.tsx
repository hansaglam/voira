import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme';

interface LockedBadgeProps {
  label?: string;
  compact?: boolean;
}

export function LockedBadge({ label = 'SpeakPlus', compact = false }: LockedBadgeProps) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Ionicons name="lock-closed" size={compact ? 8 : 9} color={colors.premium} />
      <Text style={[styles.text, compact && styles.textCompact]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.premiumMuted,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(229, 184, 74, 0.28)',
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.premium,
    letterSpacing: 0.2,
  },
  textCompact: {
    fontSize: 8,
  },
});
