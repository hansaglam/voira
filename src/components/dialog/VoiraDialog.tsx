import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, colors, spacing } from '../../theme';

export type VoiraDialogVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'destructive';

export type VoiraDialogButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'destructive';

export type VoiraDialogButton = {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: VoiraDialogButtonVariant;
  loading?: boolean;
  disabled?: boolean;
};

export type VoiraDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  variant?: VoiraDialogVariant;
  /** Override default icon for the variant. Pass `null` to hide icon. */
  icon?: string | null;
  primaryButton?: VoiraDialogButton;
  secondaryButton?: VoiraDialogButton;
  tertiaryButton?: VoiraDialogButton;
  /** When true, backdrop / Android back dismisses the dialog. Default true. */
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
  scrollable?: boolean;
};

type VariantPalette = {
  ring: string;
  fill: string;
  icon: string;
  border: string;
  glow: string;
};

function paletteForVariant(variant: VoiraDialogVariant): VariantPalette {
  switch (variant) {
    case 'success':
      return {
        ring: 'rgba(52, 211, 153, 0.28)',
        fill: 'rgba(139, 92, 246, 0.16)',
        icon: colors.success,
        border: 'rgba(139, 92, 246, 0.3)',
        glow: '#5B5FEF',
      };
    case 'error':
    case 'destructive':
      return {
        ring: 'rgba(248, 113, 113, 0.28)',
        fill: 'rgba(248, 113, 113, 0.14)',
        icon: colors.error,
        border: 'rgba(248, 113, 113, 0.28)',
        glow: '#F87171',
      };
    case 'warning':
      return {
        ring: 'rgba(245, 158, 11, 0.28)',
        fill: 'rgba(245, 158, 11, 0.14)',
        icon: colors.warning,
        border: 'rgba(245, 158, 11, 0.28)',
        glow: '#F59E0B',
      };
    case 'info':
      return {
        ring: 'rgba(91, 95, 239, 0.3)',
        fill: 'rgba(91, 95, 239, 0.16)',
        icon: colors.primary,
        border: 'rgba(139, 92, 246, 0.3)',
        glow: '#5B5FEF',
      };
    default:
      return {
        ring: 'rgba(139, 92, 246, 0.22)',
        fill: 'rgba(91, 95, 239, 0.12)',
        icon: colors.secondary,
        border: 'rgba(139, 92, 246, 0.26)',
        glow: '#5B5FEF',
      };
  }
}

function defaultIconForVariant(
  variant: VoiraDialogVariant,
): keyof typeof Ionicons.glyphMap {
  switch (variant) {
    case 'success':
      return 'checkmark-circle';
    case 'error':
      return 'alert-circle';
    case 'warning':
      return 'warning';
    case 'destructive':
      return 'trash';
    case 'info':
      return 'information-circle';
    default:
      return 'sparkles';
  }
}

function DialogActionButton({
  button,
  busy,
}: {
  button: VoiraDialogButton;
  busy: boolean;
}) {
  const variant = button.variant ?? 'primary';
  const disabled = busy || !!button.disabled || !!button.loading;
  const showLoading = !!button.loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => void button.onPress()}
        disabled={disabled}
        style={[styles.buttonTouchable, disabled && styles.buttonDisabled]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryGradient}
        >
          {showLoading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.primaryLabel}>{button.label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'destructive') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => void button.onPress()}
        disabled={disabled}
        style={[styles.destructiveButton, disabled && styles.buttonDisabled]}
      >
        {showLoading ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <Text style={styles.destructiveLabel}>{button.label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => void button.onPress()}
        disabled={disabled}
        style={[styles.secondaryButton, disabled && styles.buttonDisabled]}
      >
        {showLoading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text style={styles.secondaryLabel}>{button.label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => void button.onPress()}
      disabled={disabled}
      style={[styles.tertiaryButton, disabled && styles.buttonDisabled]}
    >
      {showLoading ? (
        <ActivityIndicator color={colors.textMuted} />
      ) : (
        <Text style={styles.tertiaryLabel}>{button.label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function VoiraDialog({
  visible,
  title,
  message,
  variant = 'neutral',
  icon,
  primaryButton,
  secondaryButton,
  tertiaryButton,
  dismissible = true,
  onDismiss,
  children,
  scrollable = false,
}: VoiraDialogProps) {
  const insets = useSafeAreaInsets();
  const palette = paletteForVariant(variant);
  const resolvedIcon =
    icon === null ? null : (icon ?? defaultIconForVariant(variant));

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  const anyLoading =
    !!primaryButton?.loading ||
    !!secondaryButton?.loading ||
    !!tertiaryButton?.loading;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.94);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    opacity.setValue(0);
    scale.setValue(0.94);
  }, [opacity, scale, visible]);

  const handleRequestClose = () => {
    if (!dismissible || anyLoading) return;
    onDismiss?.();
  };

  const bodyContent = (
    <>
      {resolvedIcon ? (
        <View style={[styles.iconRing, { backgroundColor: palette.ring }]}>
          <View style={[styles.iconCircle, { backgroundColor: palette.fill }]}>
            <Ionicons
              name={resolvedIcon as keyof typeof Ionicons.glyphMap}
              size={28}
              color={palette.icon}
            />
          </View>
        </View>
      ) : null}

      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children ? <View style={styles.customSlot}>{children}</View> : null}

      <View style={styles.actions}>
        {primaryButton ? (
          <DialogActionButton button={primaryButton} busy={anyLoading} />
        ) : null}
        {secondaryButton ? (
          <DialogActionButton button={secondaryButton} busy={anyLoading} />
        ) : null}
        {tertiaryButton ? (
          <DialogActionButton button={tertiaryButton} busy={anyLoading} />
        ) : null}
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.overlay, { opacity }]}>
          <Pressable
            style={[
              styles.backdrop,
              {
                paddingTop: Math.max(insets.top, spacing.lg),
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
            onPress={handleRequestClose}
          >
            <Pressable onPress={(event) => event.stopPropagation()}>
              <Animated.View
                style={[
                  styles.card,
                  {
                    borderColor: palette.border,
                    transform: [{ scale }],
                    ...Platform.select({
                      ios: {
                        shadowColor: palette.glow,
                        shadowOffset: { width: 0, height: 14 },
                        shadowOpacity: 0.3,
                        shadowRadius: 28,
                      },
                      android: { elevation: 14 },
                    }),
                  },
                ]}
              >
                {scrollable ? (
                  <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {bodyContent}
                  </ScrollView>
                ) : (
                  bodyContent
                )}
              </Animated.View>
            </Pressable>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 18, 0.82)',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: '#141628',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg + 2,
    paddingBottom: spacing.md + 2,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    alignSelf: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.25,
    lineHeight: 26,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  customSlot: {
    alignSelf: 'stretch',
    marginBottom: spacing.md,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonTouchable: {
    alignSelf: 'stretch',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  primaryGradient: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(36, 38, 64, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  destructiveButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.28)',
  },
  destructiveLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  tertiaryButton: {
    alignSelf: 'stretch',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  tertiaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
