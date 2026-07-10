import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'default' | 'compact';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  elevated?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  icon,
  trailingIcon,
  elevated = false,
}: AppButtonProps) {
  const sizeStyles = size === 'compact' ? styles.compact : styles.defaultSize;
  const textStyle = size === 'compact' ? styles.compactText : typography.button;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[
          styles.wrapper,
          elevated && !disabled && styles.elevated,
          style,
        ]}
      >
        {disabled ? (
          <View style={[styles.gradient, sizeStyles, styles.disabledGradient]}>
            {loading ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <>
                {icon}
                <Text style={[textStyle, styles.disabledPrimaryText]}>{title}</Text>
                {trailingIcon}
              </>
            )}
          </View>
        ) : (
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradient, sizeStyles]}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                {icon}
                <Text style={[textStyle, styles.primaryText]}>{title}</Text>
                {trailingIcon}
              </>
            )}
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    secondary: styles.secondary,
    ghost: styles.ghost,
    outline: styles.outline,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.wrapper,
        styles.base,
        sizeStyles,
        variantStyles[variant],
        style,
        disabled && styles.disabledOutline,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              textStyle,
              variant === 'ghost'
                ? styles.ghostText
                : variant === 'outline'
                  ? styles.outlineText
                  : styles.secondaryText,
              disabled && styles.disabledText,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.md + 2,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  defaultSize: {
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  compact: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  disabledGradient: {
    backgroundColor: 'rgba(26, 27, 46, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.12)',
  },
  disabledPrimaryText: {
    color: 'rgba(156, 163, 175, 0.85)',
    fontWeight: '500',
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryText: {
    color: colors.textPrimary,
  },
  secondary: {
    backgroundColor: colors.cardElevated,
  },
  secondaryText: {
    color: colors.textPrimary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.textSecondary,
  },
  outline: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  outlineText: {
    color: colors.textPrimary,
  },
  disabledOutline: {
    opacity: 0.45,
  },
  disabledText: {
    color: colors.textMuted,
  },
});
