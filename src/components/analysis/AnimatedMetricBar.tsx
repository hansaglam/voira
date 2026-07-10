import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing } from '../../theme';

const DEFAULT_DURATION_MS = 700;
const DEFAULT_DELAY_MS = 0;

interface AnimatedMetricBarProps {
  label: string;
  value: number;
  color: string;
  delayMs?: number;
  durationMs?: number;
  animate?: boolean;
}

export function AnimatedMetricBar({
  label,
  value,
  color,
  delayMs = DEFAULT_DELAY_MS,
  durationMs = DEFAULT_DURATION_MS,
  animate = true,
}: AnimatedMetricBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const widthAnim = useRef(new Animated.Value(animate ? 0 : clampedValue)).current;
  const displayAnim = useRef(new Animated.Value(animate ? 0 : clampedValue)).current;
  const [displayValue, setDisplayValue] = React.useState(animate ? 0 : clampedValue);

  useEffect(() => {
    if (!animate) {
      widthAnim.setValue(clampedValue);
      displayAnim.setValue(clampedValue);
      setDisplayValue(clampedValue);
      return;
    }

    widthAnim.setValue(0);
    displayAnim.setValue(0);
    setDisplayValue(0);

    const listenerId = displayAnim.addListener(({ value: next }) => {
      setDisplayValue(Math.round(next));
    });

    const animation = Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: clampedValue,
        duration: durationMs,
        delay: delayMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(displayAnim, {
        toValue: clampedValue,
        duration: durationMs,
        delay: delayMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animation.start();

    return () => {
      displayAnim.removeListener(listenerId);
      animation.stop();
    };
  }, [animate, clampedValue, delayMs, displayAnim, durationMs, widthAnim]);

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
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
      <Text style={[styles.metricValue, { color }]}>{displayValue}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricLabel: {
    width: 62,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricBarTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: 3,
    borderRadius: 2,
  },
  metricValue: {
    width: 26,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
});
