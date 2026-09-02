import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';

type ChipSize = 'default' | 'large';

interface SelectableChipProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap | string;
  size?: ChipSize;
  style?: ViewStyle;
  accessibilityLabel?: string;
  disabled?: boolean;
}

export function SelectableChip({
  label,
  description,
  selected,
  onPress,
  icon,
  size = 'default',
  style,
  accessibilityLabel,
  disabled = false,
}: SelectableChipProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const isLarge = size === 'large';
  const a11yLabel = accessibilityLabel
    ?? (description ? `${label}. ${description}` : label);

  const content = (
    <>
      {icon ? (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={isLarge ? 20 : 16}
          color={selected ? colors.textPrimary : colors.textSecondary}
        />
      ) : null}
      <View style={styles.textCol}>
        <Text
          style={[
            styles.label,
            isLarge && styles.labelLarge,
            selected && styles.labelSelected,
          ]}
        >
          {label}
        </Text>
        {description ? (
          <Text
            style={[
              styles.description,
              selected && styles.descriptionSelected,
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.textPrimary} />
      ) : null}
    </>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        activeOpacity={disabled ? 1 : 0.9}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={a11yLabel}
      >
        {selected ? (
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.chip, isLarge && styles.chipLarge, styles.chipSelected]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.chip,
              isLarge && styles.chipLarge,
              styles.chipUnselected,
              disabled && styles.chipDisabled,
            ]}
          >
            {content}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.full,
    minHeight: 44,
  },
  chipLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    justifyContent: 'flex-start',
    minWidth: '100%',
    minHeight: 56,
  },
  chipSelected: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  chipUnselected: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.captionBright,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  labelLarge: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  description: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  descriptionSelected: {
    color: 'rgba(255,255,255,0.82)',
  },
});
