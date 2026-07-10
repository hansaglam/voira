import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '../../theme';
import { SpeakingTestLayout } from './useSpeakingTestLayout';

interface PremiumWaveformProps {
  isActive?: boolean;
  mode?: 'play' | 'record';
  barCount?: number;
  layout: SpeakingTestLayout['waveform'];
}

export function PremiumWaveform({
  isActive = false,
  mode = 'play',
  barCount = 32,
  layout,
}: PremiumWaveformProps) {
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.2))
  ).current;

  const activeColor = mode === 'record' ? '#F87171' : colors.secondary;
  const idleColor = 'rgba(139, 92, 246, 0.35)';

  useEffect(() => {
    if (!isActive) {
      animations.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 0.15 + (i % 5) * 0.04,
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
            toValue: 0.4 + Math.random() * 0.55,
            duration: 160 + Math.random() * 240,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.18 + Math.random() * 0.2,
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

  return (
    <View style={[styles.outer, { marginBottom: layout.marginBottom }]}>
      <LinearGradient
        colors={['rgba(91, 95, 239, 0.08)', 'rgba(26, 27, 46, 0.6)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { paddingVertical: layout.paddingVertical }]}
      >
        <View style={[styles.container, { height: layout.height }]}>
          {animations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  height: layout.barHeight,
                  backgroundColor: isActive ? activeColor : idleColor,
                  opacity: isActive ? 0.95 : 0.7,
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
  outer: {
    borderRadius: borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.2)',
    paddingHorizontal: spacing.md,
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
