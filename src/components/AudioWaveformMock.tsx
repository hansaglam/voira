import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../theme';

export type WaveformMode = 'idle' | 'play' | 'record';

interface AudioWaveformMockProps {
  isActive?: boolean;
  mode?: WaveformMode;
  barCount?: number;
  color?: string;
  compact?: boolean;
}

const MODE_COLORS: Record<WaveformMode, string> = {
  idle: 'rgba(139, 92, 246, 0.55)',
  play: colors.secondary,
  record: '#F87171',
};

export function AudioWaveformMock({
  isActive = false,
  mode = 'idle',
  barCount = 28,
  color,
  compact = false,
}: AudioWaveformMockProps) {
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.22))
  ).current;

  const activeMode: WaveformMode = isActive
    ? mode === 'record'
      ? 'record'
      : 'play'
    : 'idle';
  const barColor = color ?? MODE_COLORS[activeMode];

  useEffect(() => {
    if (!isActive) {
      animations.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 0.2 + (i % 4) * 0.06,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    const loops = animations.map((anim, i) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.38 + Math.random() * 0.55,
            duration: 160 + Math.random() * 240,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.22,
            duration: 160 + Math.random() * 240,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished && isActive) animate();
        });
      };
      setTimeout(animate, i * 35);
      return anim;
    });

    return () => {
      loops.forEach((anim) => anim.stopAnimation());
    };
  }, [isActive, animations]);

  const barHeight = compact ? 34 : 48;
  const containerHeight = compact ? 40 : 56;

  return (
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <LinearGradient
        colors={['rgba(91, 95, 239, 0.07)', 'rgba(26, 27, 46, 0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.inner, compact && styles.innerCompact]}
      >
        <View style={[styles.container, { height: containerHeight }]}>
          {animations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor: barColor,
                  opacity: isActive ? 0.95 : 0.75,
                  transform: [{ scaleY: anim }],
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  wrapperCompact: {
    marginBottom: spacing.xs,
  },
  inner: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.18)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  innerCompact: {
    paddingVertical: spacing.sm - 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});
