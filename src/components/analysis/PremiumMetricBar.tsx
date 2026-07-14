import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing } from '../../theme';

const BAR_DURATION_MS = 680;

export type PremiumMetricTone = 'primary' | 'purple' | 'amber';

const TONE_COLORS: Record<PremiumMetricTone, string> = {
  primary: colors.primary,
  purple: colors.secondary,
  amber: colors.warning,
};

export interface PremiumMetricBarProps {
  label: string;
  value: number;
  delay?: number;
  tone?: PremiumMetricTone;
  animate?: boolean;
}

export function PremiumMetricBar({
  label,
  value,
  delay = 0,
  tone = 'primary',
  animate = true,
}: PremiumMetricBarProps) {
  const clampedValue = Math.min(100, Math.max(0, Math.round(value)));
  const color = TONE_COLORS[tone];
  const widthAnim = useRef(new Animated.Value(animate ? 0 : clampedValue)).current;
  const animatedSessionRef = useRef<number | null>(null);

  useEffect(() => {
    if (animatedSessionRef.current === clampedValue && animate) {
      return;
    }
    animatedSessionRef.current = clampedValue;

    if (!animate) {
      widthAnim.setValue(clampedValue);
      return;
    }

    widthAnim.setValue(0);

    const animation = Animated.timing(widthAnim, {
      toValue: clampedValue,
      duration: BAR_DURATION_MS,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();

    return () => {
      animation.stop();
      widthAnim.stopAnimation();
    };
  }, [animate, clampedValue, delay, widthAnim]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const isTwoLineLabel = label.includes('/');

  return (
    <View style={styles.metricRow}>
      <Text
        style={[styles.metricLabel, isTwoLineLabel && styles.metricLabelTwoLine]}
        numberOfLines={isTwoLineLabel ? 2 : 1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      <View style={styles.metricBarTrack}>
        <Animated.View
          style={[
            styles.metricBarFill,
            {
              width: widthInterpolated,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={[styles.metricValue, { color }]}>{clampedValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 24,
  },
  metricLabel: {
    width: 76,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 15,
    flexShrink: 0,
  },
  metricLabelTwoLine: {
    fontSize: 10,
    lineHeight: 13,
  },
  metricBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(58, 59, 82, 0.85)',
    overflow: 'hidden',
  },
  metricBarFill: {
    height: 4,
    borderRadius: 2,
  },
  metricValue: {
    width: 32,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
    flexShrink: 0,
  },
});