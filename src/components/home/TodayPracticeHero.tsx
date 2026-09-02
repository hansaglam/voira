import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius, gradients, shadows } from '../../theme';

interface TodayPracticeHeroProps {
  eyebrow: string;
  title: string;
  meta: string;
  focusLabel: string;
  focusValue: string;
  reasonLabel: string;
  reasonText: string;
  ctaLabel: string;
  disabled?: boolean;
  onPress: () => void;
}

export function TodayPracticeHero({
  eyebrow,
  title,
  meta,
  focusLabel,
  focusValue,
  reasonLabel,
  reasonText,
  ctaLabel,
  disabled = false,
  onPress,
}: TodayPracticeHeroProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${ctaLabel}. ${title}. ${reasonText}`}
      accessibilityState={{ disabled }}
    >
      <LinearGradient
        colors={[...gradients.hero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.top}>
          <View style={styles.iconWrap}>
            <Ionicons name="mic" size={22} color={colors.textPrimary} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{eyebrow}</Text>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>

        <View style={styles.focusBlock}>
          <Text style={styles.focusLabel}>{focusLabel}</Text>
          <Text style={styles.focusValue}>{focusValue}</Text>
        </View>

        <Text style={styles.reasonLabel}>{reasonLabel}</Text>
        <Text style={styles.reasonText}>{reasonText}</Text>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <View style={styles.ctaIcon}>
            <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.hero,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.3,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  meta: {
    ...typography.body,
    color: 'rgba(255,255,255,0.86)',
    marginBottom: spacing.sm,
  },
  focusBlock: {
    marginBottom: spacing.sm,
  },
  focusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  focusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: spacing.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.lg,
  },
  ctaText: {
    ...typography.button,
    fontSize: 15,
  },
  ctaIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
