import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../theme';

export type VoiraFeedbackType = 'success' | 'error' | 'info';

export type VoiraFeedbackModalProps = {
  visible: boolean;
  type?: VoiraFeedbackType;
  title: string;
  message: string;
  primaryText?: string;
  onPrimaryPress: () => void;
  secondaryText?: string;
  onSecondaryPress?: () => void;
};

function iconForType(type: VoiraFeedbackType): keyof typeof Ionicons.glyphMap {
  if (type === 'error') return 'alert-circle';
  if (type === 'info') return 'information-circle';
  return 'checkmark';
}

function iconColors(type: VoiraFeedbackType): { ring: string; fill: string; icon: string } {
  if (type === 'error') {
    return {
      ring: 'rgba(248, 113, 113, 0.28)',
      fill: 'rgba(248, 113, 113, 0.16)',
      icon: colors.error,
    };
  }
  if (type === 'info') {
    return {
      ring: 'rgba(91, 95, 239, 0.3)',
      fill: 'rgba(91, 95, 239, 0.16)',
      icon: colors.primary,
    };
  }
  return {
    ring: 'rgba(52, 211, 153, 0.28)',
    fill: 'rgba(139, 92, 246, 0.18)',
    icon: colors.success,
  };
}

export function VoiraFeedbackModal({
  visible,
  type = 'success',
  title,
  message,
  primaryText = 'Tamam',
  onPrimaryPress,
  secondaryText,
  onSecondaryPress,
}: VoiraFeedbackModalProps) {
  const palette = iconColors(type);
  const handleDismiss = onSecondaryPress ?? onPrimaryPress;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.iconRing, { backgroundColor: palette.ring }]}>
            <View style={[styles.iconCircle, { backgroundColor: palette.fill }]}>
              <Ionicons name={iconForType(type)} size={28} color={palette.icon} />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onPrimaryPress}
            style={styles.buttonTouchable}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>{primaryText}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {secondaryText && onSecondaryPress ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onSecondaryPress}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{secondaryText}</Text>
            </TouchableOpacity>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 20, 0.78)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: '#16182B',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.28)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#5B5FEF',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
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
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  buttonTouchable: {
    alignSelf: 'stretch',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
