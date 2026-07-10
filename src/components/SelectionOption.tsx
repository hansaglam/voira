import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';

interface SelectionOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SelectionOption({
  label,
  selected,
  onPress,
  icon,
}: SelectionOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.option, selected && styles.selected]}
    >
      {selected && <View style={styles.glow} pointerEvents="none" />}
      {icon && (
        <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
          <Ionicons
            name={icon}
            size={22}
            color={selected ? colors.textPrimary : colors.textSecondary}
          />
        </View>
      )}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 4,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  glow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(91, 95, 239, 0.06)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(91, 95, 239, 0.25)',
  },
  label: {
    ...typography.bodyEmphasis,
    flex: 1,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(91, 95, 239, 0.15)',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});
