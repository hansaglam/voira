import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../../theme';
import { AnimatedWaveformProps } from './types';

const STATE_COLORS = {
  idle: 'rgba(139, 92, 246, 0.5)',
  playing: colors.secondary,
  recording: '#F87171',
} as const;

/**
 * Placeholder waveform — replace with Rive while keeping AnimatedWaveformProps.
 * Rive state machine: idle | playing | recording
 */
export function AnimatedWaveform({
  state = 'idle',
  barCount = 24,
  compact = false,
  showFrame = true,
  autoPlay = true,
  testID,
}: AnimatedWaveformProps) {
  const isActive = state !== 'idle';
  const barColor = STATE_COLORS[state];

  const animations = useRef(
    Array.from({ length: barCount }, (_, i) => new Animated.Value(0.18 + (i % 5) * 0.05))
  ).current;

  useEffect(() => {
    if (!autoPlay || !isActive) {
      animations.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 0.18 + (i % 5) * 0.06,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    const handles: Animated.CompositeAnimation[] = [];

    animations.forEach((anim, i) => {
      const run = () => {
        const up = 0.35 + ((i * 7) % 10) * 0.06;
        const down = 0.15 + ((i * 3) % 6) * 0.05;
        const seq = Animated.sequence([
          Animated.timing(anim, {
            toValue: up,
            duration: 140 + (i % 4) * 60,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: down,
            duration: 140 + (i % 3) * 60,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]);

        handles.push(seq);
        seq.start(({ finished }) => {
          if (finished && autoPlay && isActive) run();
        });
      };

      setTimeout(run, i * 28);
    });

    return () => {
      handles.forEach((h) => h.stop());
      animations.forEach((a) => a.stopAnimation());
    };
  }, [animations, autoPlay, isActive, state]);

  const barHeight = compact ? 32 : 44;
  const containerHeight = compact ? 38 : 52;

  const bars = (
    <View style={[styles.bars, { height: containerHeight }]} testID={testID}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              height: barHeight,
              backgroundColor: barColor,
              opacity: isActive ? 0.92 : 0.65,
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );

  if (!showFrame) {
    return bars;
  }

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <LinearGradient
        colors={['rgba(91, 95, 239, 0.06)', 'rgba(26, 27, 46, 0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.frame, compact && styles.frameCompact]}
      >
        {bars}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  wrapperCompact: {
    marginBottom: 0,
  },
  frame: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 95, 239, 0.16)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  frameCompact: {
    paddingVertical: spacing.sm - 2,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
  },
});
