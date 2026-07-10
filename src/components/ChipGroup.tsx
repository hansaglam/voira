import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SelectableChip } from './SelectableChip';
import { colors, spacing, typography } from '../theme';

export interface ChipOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap | string;
}

interface ChipGroupProps {
  title: string;
  options: readonly ChipOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multiSelect?: boolean;
  size?: 'default' | 'large';
}

export function ChipGroup({
  title,
  options,
  selectedIds,
  onToggle,
  multiSelect = true,
  size = 'default',
}: ChipGroupProps) {
  const handlePress = (id: string) => {
    onToggle(id);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.chips, size === 'large' && styles.chipsLarge]}>
        {options.map((option) => (
          <SelectableChip
            key={option.id}
            label={option.label}
            icon={option.icon}
            selected={selectedIds.includes(option.id)}
            onPress={() => handlePress(option.id)}
            size={size}
            style={size === 'large' ? styles.largeChip : undefined}
          />
        ))}
      </View>
    </View>
  );
}

interface SingleSelectChipGroupProps {
  options: readonly ChipOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  size?: 'default' | 'large';
}

export function SingleSelectChipGroup({
  options,
  selectedId,
  onSelect,
  size = 'default',
}: SingleSelectChipGroupProps) {
  return (
    <View style={[styles.chips, size === 'large' && styles.chipsLarge]}>
      {options.map((option) => (
        <SelectableChip
          key={option.id}
          label={option.label}
          icon={option.icon}
          selected={selectedId === option.id}
          onPress={() => onSelect(option.id)}
          size={size}
          style={size === 'large' ? styles.largeChip : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
    letterSpacing: 1.2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipsLarge: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  largeChip: {
    width: '100%',
  },
});
