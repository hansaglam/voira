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
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap | string;
  size?: ChipSize;
  style?: ViewStyle;
}

export function SelectableChip({
  label,
  selected,
  onPress,
  icon,
  size = 'default',
  style,
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

  const content = (
    <>
      {icon && (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={isLarge ? 20 : 16}
          color={selected ? colors.textPrimary : colors.textSecondary}
        />
      )}
      <Text
        style={[
          styles.label,
          isLarge && styles.labelLarge,
          selected && styles.labelSelected,
        ]}
      >
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark-circle" size={16} color={colors.textPrimary} />
      )}
    </>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
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
          <View style={[styles.chip, isLarge && styles.chipLarge, styles.chipUnselected]}>
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
  },
  chipLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    minWidth: '100%',
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
});
